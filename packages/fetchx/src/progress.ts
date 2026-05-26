import type { ProgressEvent } from './types';

// Cached result: undefined = unchecked, true = supported, false = unsupported
let _streamingSupported: boolean | undefined;

/**
 * Check whether streaming upload (duplex: 'half' + ReadableStream) is supported
 * in the current runtime. Returns undefined until the first actual upload attempt.
 */
export function isStreamingUploadSupported(): boolean | undefined {
  return _streamingSupported;
}

/**
 * Called internally after a successful fetch with duplex: 'half'.
 * Caches the result so subsequent checks can short-circuit.
 */
export function markStreamingSupported(supported: boolean): void {
  _streamingSupported = supported;
}

const ERR_NOT_SUPPORTED =
  'Upload progress tracking is not supported in this environment. ' +
  'Streaming upload requires ReadableStream with duplex support. ' +
  'Use Node.js 18+ or a modern browser (Chrome 105+, Firefox 119+, Safari 16.4+).';

/**
 * Check if the given fetch error indicates the runtime does not support
 * streaming upload (duplex: 'half' + ReadableStream body).
 *
 * Returns the error message if it's a streaming support failure, or null.
 */
export function isStreamingNotSupportedError(error: unknown): string | null {
  if (
    error instanceof TypeError &&
    (error.message.includes('duplex') ||
      error.message.includes('ReadableStream') ||
      error.message.includes('Request'))
  ) {
    return ERR_NOT_SUPPORTED;
  }
  return null;
}

/**
 * Track download progress by piping the response body through a
 * TransformStream and counting bytes read.
 *
 * Returns a new Response whose body has been wrapped with progress tracking.
 * The original response body is consumed in the process.
 */
export function trackDownloadProgress(
  response: Response,
  onProgress?: (_event: ProgressEvent) => void
): Response {
  if (!onProgress) return response;
  if (!response.body || response.body.locked) {
    return response;
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? Number.parseInt(contentLength, 10) : undefined;
  let loaded = 0;

  const transform = new TransformStream({
    transform(chunk: Uint8Array, controller) {
      loaded += chunk.byteLength;
      onProgress({
        loaded,
        total,
        percent: total ? Math.round((loaded / total) * 100) : undefined,
      });
      controller.enqueue(chunk);
    },
  });

  const trackedBody = response.body.pipeThrough(transform);

  return new Response(trackedBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * Result of upload progress wrapping — includes the (possibly wrapped) body
 * and whether `duplex: 'half'` is needed for fetch.
 */
export interface UploadProgressResult {
  body: unknown;
  duplex?: 'half';
}

/**
 * Wrap request body with upload progress tracking using ReadableStream.
 *
 * For string, Uint8Array, ArrayBuffer, and Blob bodies (where size is known),
 * creates a ReadableStream that reports progress as chunks are sent.
 * FormData and undefined bodies are passed through unchanged (no progress).
 *
 * No preflight — the actual fetch call determines whether the runtime supports
 * streaming upload. On failure, the error is recognized by its type/message
 * characteristics and a clear error is thrown.
 */
export function trackUploadProgress(
  body: unknown,
  onProgress?: (_event: ProgressEvent) => void
): UploadProgressResult {
  if (!onProgress) return { body };

  // No body — nothing to track
  if (body === null || body === undefined) {
    return { body };
  }

  // FormData can't be measured for upload progress via fetch
  if (body instanceof FormData) {
    return { body };
  }

  // Blob — convert to stream via pipeThrough
  if (body instanceof Blob) {
    const total = body.size;
    let loaded = 0;

    const tracked = body.stream().pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          loaded += chunk.byteLength;
          onProgress({
            loaded,
            total,
            percent: total ? Math.round((loaded / total) * 100) : undefined,
          });
          controller.enqueue(chunk);
        },
      })
    );

    return { body: tracked, duplex: 'half' };
  }

  // String — encode and stream
  if (typeof body === 'string') {
    const encoded = new TextEncoder().encode(body);
    const total = encoded.byteLength;
    let loaded = 0;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const CHUNK = 65536; // 64KB
        for (let i = 0; i < encoded.length; i += CHUNK) {
          const chunk = encoded.slice(i, i + CHUNK);
          loaded += chunk.byteLength;
          onProgress({
            loaded,
            total,
            percent: total ? Math.round((loaded / total) * 100) : undefined,
          });
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return { body: stream, duplex: 'half' };
  }

  // Uint8Array / ArrayBuffer — chunk and stream
  if (body instanceof Uint8Array || body instanceof ArrayBuffer) {
    const data = body instanceof ArrayBuffer ? new Uint8Array(body) : body;
    const total = data.byteLength;
    let loaded = 0;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const CHUNK = 65536;
        for (let i = 0; i < data.length; i += CHUNK) {
          const chunk = data.slice(i, i + CHUNK);
          loaded += chunk.byteLength;
          onProgress({
            loaded,
            total,
            percent: total ? Math.round((loaded / total) * 100) : undefined,
          });
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return { body: stream, duplex: 'half' };
  }

  // Unknown / unsupported body type — pass through
  return { body };
}
