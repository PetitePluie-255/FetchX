import type { FetchXResponse, RequestOptions } from './types';

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

    // Events are separated by double newlines

    while (true) {
      const idx = this.buffer.indexOf('\n\n');
      if (idx === -1) break;

      const raw = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);

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

    for (const line of raw.split('\n')) {
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
    this.reader = response.body?.getReader() ?? null;

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
    return {
      data: undefined,
      status: this._response.status,
      statusText: this._response.statusText,
      headers: this._response.headers,
      config: this._config,
    };
  }

  /** Cancel the stream and detach external signal listener. Safe to call multiple times. */
  abort(): void {
    this._controller.abort();
    this.reader?.cancel().catch(() => {});
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
  }

  abstract [Symbol.asyncIterator](): AsyncIterator<T>;
}

// ──────────────────────────────────────────────
//  Uint8ArrayStream — raw binary chunks
// ──────────────────────────────────────────────

export class Uint8ArrayStream extends FetchXStream<Uint8Array> {
  async *[Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
    try {
      while (this.reader) {
        const { done, value } = await this.reader.read();
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
    if (!this.reader) return;
    const parser = new SSEParser();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await this.reader.read();
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
    if (!this.reader) return;
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await this.reader.read();
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
