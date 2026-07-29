import {
  TimeoutError,
  type FetchXResponse,
  type RequestOptions,
} from './types';
import { buildFetchXResponse } from './utils';

/**
 * A parsed SSE (Server-Sent Events) event.
 */
export interface SSEEvent {
  /** Event data payload (multi-line data joined with \n) */
  data: string;
  /** Event type, defaults to "message" */
  event?: string;
  /** Last event ID for reconnection */
  id?: string;
  /** Reconnection time in milliseconds */
  retry?: number;
}

// ──────────────────────────────────────────────
//  SSE Parser (internal, not exported)
// ──────────────────────────────────────────────

class SSEParser {
  private buffer = '';

  /**
   * Feed a chunk of text into the parser. Returns all complete SSE events
   * that can be parsed from the current buffer.
   */
  push(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    const events: SSEEvent[] = [];

    while (true) {
      // A blank line dispatches an event. Line endings may be LF, CRLF, or CR.
      const separator =
        /\r\n\r\n|\r\n\r|\r\n\n|\r\r\n|\r\r|\n\r\n|\n\r|\n\n/.exec(this.buffer);
      if (separator?.index === undefined) break;

      const idx = separator.index;
      const separatorEnd = idx + separator[0].length;
      // A trailing CR may be the first half of a CRLF split across chunks.
      if (separatorEnd === this.buffer.length && separator[0].endsWith('\r')) {
        break;
      }
      const raw = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(separatorEnd);

      const event = this.parseEvent(raw);
      if (event) events.push(event);
    }

    return events;
  }

  /** Flush remaining buffer content as a final event */
  flush(): SSEEvent | null {
    if (this.buffer.trim()) {
      const raw = this.buffer;
      this.buffer = '';
      return this.parseEvent(raw);
    }
    return null;
  }

  private parseEvent(raw: string): SSEEvent | null {
    const event: SSEEvent = { data: '' };
    let hasField = false;

    for (const line of raw.split(/\r\n|\r|\n/)) {
      // Lines starting with ':' are comments (skip)
      if (!line || line.startsWith(':')) continue;

      hasField = true;
      const colonIdx = line.indexOf(':');
      const field = colonIdx === -1 ? line : line.slice(0, colonIdx);
      const value =
        colonIdx === -1 ? '' : line.slice(colonIdx + 1).replace(/^ /, '');

      switch (field) {
        case 'data':
          event.data = event.data ? `${event.data}\n${value}` : value;
          break;
        case 'event':
          event.event = value;
          break;
        case 'id':
          event.id = value;

          value; // id with empty value resets
          break;
        case 'retry': {
          const ms = parseInt(value, 10);
          if (!isNaN(ms)) event.retry = ms;
          break;
        }
        default:
          // Unknown fields are ignored per SSE spec
          break;
      }
    }

    // Dispatch event only if it has data or an explicit event type
    return hasField ? event : null;
  }
}

// ──────────────────────────────────────────────
//  FetchXStream base class
// ──────────────────────────────────────────────

/**
 * A unified, async-iterable stream container returned by `api.stream()`,
 * `api.sse()`, and `api.ndjson()`.
 *
 * Supports `for await...of` consumption, manual `.abort()`, and
 * inspection of the underlying Response via `.response`.
 */
export abstract class FetchXStream<T> implements AsyncIterable<T> {
  protected reader: ReadableStreamDefaultReader<Uint8Array> | null;
  private _response: Response;
  private _config: RequestOptions;
  private _controller: AbortController;
  private _externalSignal?: AbortSignal;
  private _onExternalAbort: (() => void) | null = null;

  constructor(
    response: Response,
    config: RequestOptions,
    controller: AbortController,
    externalSignal?: AbortSignal
  ) {
    this._response = response;
    this._config = config;
    this._controller = controller;
    this._externalSignal = externalSignal;
    this.reader = null;

    // Link external signal to abort this stream
    if (externalSignal) {
      if (externalSignal.aborted) {
        this.abort();
      } else {
        this._onExternalAbort = () => this.abort();
        externalSignal.addEventListener('abort', this._onExternalAbort, {
          once: true,
        });
      }
    }
  }

  /** The underlying HTTP response (status, statusText, headers). */
  get response(): Response {
    return this._response;
  }

  /**
   * Build a structured FetchXResponse wrapper for TypeScript users
   * who want status/headers access.
   */
  get meta(): FetchXResponse<undefined> {
    return buildFetchXResponse(undefined, this._response, this._config);
  }

  /** Cancel the stream and detach external signal listener. Safe to call multiple times. */
  abort(): void {
    this._controller.abort();
    if (this.reader) {
      this.reader.cancel().catch(() => {});
    } else {
      this._response.body?.cancel().catch(() => {});
    }
    this.detachExternalSignal();
  }

  /** Acquire the response reader only when iteration starts. */
  private getReader(): ReadableStreamDefaultReader<Uint8Array> | null {
    this.reader ??= this._response.body?.getReader() ?? null;
    return this.reader;
  }

  /**
   * Read one chunk and fail if the connection remains idle for too long.
   * Starting a new read resets the idle timeout.
   */
  protected readChunk(): Promise<ReadableStreamReadResult<Uint8Array>> {
    const reader = this.getReader();
    if (!reader) {
      return Promise.resolve({ done: true, value: undefined });
    }

    const idleTimeout = this._config.idleTimeout ?? 0;
    if (idleTimeout <= 0) {
      return reader.read();
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        const error = new TimeoutError(idleTimeout, this.meta.config, 'idle');
        this._controller.abort(error);
        reader.cancel(error).catch(() => {});
        reject(error);
      }, idleTimeout);

      reader.read().then(
        result => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          resolve(result);
        },
        error => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }

  private detachExternalSignal(): void {
    if (this._onExternalAbort && this._externalSignal) {
      this._externalSignal.removeEventListener('abort', this._onExternalAbort);
    }
    this._onExternalAbort = null;
  }

  /** Release the reader when done. Called by subclasses in finally blocks. */
  protected releaseReader(): void {
    if (this.reader) {
      try {
        this.reader.releaseLock();
      } catch {
        // already released
      }
      this.reader = null;
    }
    this.detachExternalSignal();
  }

  abstract [Symbol.asyncIterator](): AsyncIterator<T>;
}

// ──────────────────────────────────────────────
//  Uint8ArrayStream — raw binary chunks
// ──────────────────────────────────────────────

export class Uint8ArrayStream extends FetchXStream<Uint8Array> {
  async *[Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
    try {
      while (true) {
        const { done, value } = await this.readChunk();
        if (done) break;
        yield value;
      }
    } finally {
      this.releaseReader();
    }
  }
}

// ──────────────────────────────────────────────
//  SSEStream — Server-Sent Events parsing
// ──────────────────────────────────────────────

export class SSEStream extends FetchXStream<SSEEvent> {
  async *[Symbol.asyncIterator](): AsyncIterator<SSEEvent> {
    const parser = new SSEParser();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await this.readChunk();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const event of parser.push(text)) {
          if (event.data === '[DONE]') return;
          yield event;
        }
      }

      // Flush final decoder state
      const final = decoder.decode();
      for (const event of parser.push(final)) {
        if (event.data === '[DONE]') return;
        yield event;
      }

      // Flush remaining parser buffer
      const flushed = parser.flush();
      if (flushed && flushed.data !== '[DONE]') {
        yield flushed;
      }
    } finally {
      this.releaseReader();
    }
  }
}

// ──────────────────────────────────────────────
//  NDJSONStream — line-delimited JSON parsing
// ──────────────────────────────────────────────

export class NDJSONStream<T = unknown> extends FetchXStream<T> {
  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await this.readChunk();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on newlines, keep incomplete line in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            yield JSON.parse(trimmed) as T;
          }
        }
      }

      // Flush final decoder state
      buffer += decoder.decode();

      // Process remaining lines
      const lines = buffer.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          yield JSON.parse(trimmed) as T;
        }
      }
    } finally {
      this.releaseReader();
    }
  }
}
