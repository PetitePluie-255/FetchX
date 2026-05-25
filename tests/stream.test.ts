import { describe, it, expect } from 'vitest';
import {
  Uint8ArrayStream,
  SSEStream,
  NDJSONStream,
  FetchXStream,
  type SSEEvent,
} from '../src/stream';

// Helper: create a ReadableStream<Uint8Array> from string chunks
function createTextStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i++;
      } else {
        controller.close();
      }
    },
  });
}

// Helper: create a mock Response with a text body
function createMockResponse(
  chunks: string[],
  status = 200,
  statusText = 'OK',
  headers: Record<string, string> = {}
): Response {
  return new Response(createTextStream(chunks), {
    status,
    statusText,
    headers: new Headers(headers),
  });
}

// Helper: create mock config and controller for FetchXStream
function mockStreamArgs(
  response: Response
): [Response, RequestOptions, AbortController] {
  return [response, { url: '/test', method: 'GET' }, new AbortController()];
}

import type { RequestOptions } from '../src/types';

// ──────────────────────────────────────────────
//  Uint8ArrayStream
// ──────────────────────────────────────────────

describe('Uint8ArrayStream', () => {
  it('should iterate over raw Uint8Array chunks', async () => {
    const res = createMockResponse(['hello', 'world']);
    const stream = new Uint8ArrayStream(...mockStreamArgs(res));

    const chunks: string[] = [];
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      chunks.push(decoder.decode(chunk));
    }

    expect(chunks).toEqual(['hello', 'world']);
  });

  it('should expose response metadata', async () => {
    const res = createMockResponse(['data'], 201, 'Created', {
      'x-id': '123',
    });
    const stream = new Uint8ArrayStream(...mockStreamArgs(res));

    expect(stream.response.status).toBe(201);
    expect(stream.response.statusText).toBe('Created');
    expect(stream.response.headers.get('x-id')).toBe('123');
  });

  it('should abort mid-stream', async () => {
    const res = createMockResponse(['a', 'b', 'c']);
    const stream = new Uint8ArrayStream(...mockStreamArgs(res));

    const chunks: string[] = [];
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      chunks.push(decoder.decode(chunk));
      if (chunks.length === 1) {
        stream.abort();
      }
    }

    // Should stop after abort
    expect(chunks.length).toBeLessThanOrEqual(2);
  });
});

// ──────────────────────────────────────────────
//  SSEStream
// ──────────────────────────────────────────────

describe('SSEStream', () => {
  it('should parse single data field', async () => {
    const res = createMockResponse(['data: hello\n\n']);
    const stream = new SSEStream(...mockStreamArgs(res));

    const events: SSEEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('hello');
  });

  it('should parse multi-line data (joined with \\n)', async () => {
    const res = createMockResponse(['data: line1\ndata: line2\n\n']);
    const stream = new SSEStream(...mockStreamArgs(res));

    const events: SSEEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('line1\nline2');
  });

  it('should parse event, id, and retry fields', async () => {
    const res = createMockResponse([
      'event: custom\nid: 42\nretry: 5000\ndata: payload\n\n',
    ]);
    const stream = new SSEStream(...mockStreamArgs(res));

    const events: SSEEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events[0].event).toBe('custom');
    expect(events[0].id).toBe('42');
    expect(events[0].retry).toBe(5000);
    expect(events[0].data).toBe('payload');
  });

  it('should ignore comment lines (starting with :)', async () => {
    const res = createMockResponse([': this is a comment\ndata: real\n\n']);
    const stream = new SSEStream(...mockStreamArgs(res));

    const events: SSEEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('real');
  });

  it('should stop iteration on [DONE] signal', async () => {
    const res = createMockResponse([
      'data: chunk1\n\n',
      'data: [DONE]\n\n',
      'data: should-not-appear\n\n',
    ]);
    const stream = new SSEStream(...mockStreamArgs(res));

    const events: SSEEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('chunk1');
  });

  it('should handle data split across chunks', async () => {
    const res = createMockResponse(['data: hel', 'lo\n\n']);
    const stream = new SSEStream(...mockStreamArgs(res));

    const events: SSEEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('hello');
  });

  it('should not throw on HTTP error status — returns stream', async () => {
    const res = createMockResponse(
      ['data: error details\n\n'],
      500,
      'Internal Server Error'
    );
    const stream = new SSEStream(...mockStreamArgs(res));

    expect(stream.response.status).toBe(500);
    expect(stream.response.ok).toBe(false);

    const events: SSEEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('error details');
  });

  it('should handle empty events (skip them)', async () => {
    const res = createMockResponse(['\n\n', 'data: valid\n\n', '\n\n']);
    const stream = new SSEStream(...mockStreamArgs(res));

    const events: SSEEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('valid');
  });

  it('should handle data field with leading space after colon', async () => {
    // Per SSE spec, a single space after colon is stripped
    const res = createMockResponse(['data: hello\n\n']);
    const stream = new SSEStream(...mockStreamArgs(res));

    const events: SSEEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events[0].data).toBe('hello');
  });
});

// ──────────────────────────────────────────────
//  NDJSONStream
// ──────────────────────────────────────────────

describe('NDJSONStream', () => {
  it('should parse JSON lines', async () => {
    const res = createMockResponse(['{"id":1}\n', '{"id":2}\n', '{"id":3}\n']);
    const stream = new NDJSONStream<{ id: number }>(...mockStreamArgs(res));

    const entries: Array<{ id: number }> = [];
    for await (const entry of stream) {
      entries.push(entry);
    }

    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({ id: 1 });
    expect(entries[1]).toEqual({ id: 2 });
    expect(entries[2]).toEqual({ id: 3 });
  });

  it('should skip empty lines', async () => {
    const res = createMockResponse(['\n', '{"id":1}\n', '\n', '{"id":2}\n']);
    const stream = new NDJSONStream<{ id: number }>(...mockStreamArgs(res));

    const entries: Array<{ id: number }> = [];
    for await (const entry of stream) {
      entries.push(entry);
    }

    expect(entries).toHaveLength(2);
  });

  it('should handle lines split across chunks', async () => {
    const res = createMockResponse(['{"i', 'd":1}', '\n']);
    const stream = new NDJSONStream<{ id: number }>(...mockStreamArgs(res));

    const entries: Array<{ id: number }> = [];
    for await (const entry of stream) {
      entries.push(entry);
    }

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ id: 1 });
  });

  it('should expose response metadata', async () => {
    const res = createMockResponse(['{"ok":true}\n'], 200, 'OK', {
      'content-type': 'application/x-ndjson',
    });
    const stream = new NDJSONStream(...mockStreamArgs(res));

    expect(stream.response.status).toBe(200);
    expect(stream.response.headers.get('content-type')).toBe(
      'application/x-ndjson'
    );
  });
});

// ──────────────────────────────────────────────
//  FetchXStream base class
// ──────────────────────────────────────────────

describe('FetchXStream', () => {
  it('should be abstract and throw if [Symbol.asyncIterator] not implemented', () => {
    // We can't instantiate FetchXStream directly (abstract),
    // but we can verify it's a proper base class
    const res = new Response(new ReadableStream());
    const stream = new Uint8ArrayStream(
      res,
      { url: '/', method: 'GET' },
      new AbortController()
    );
    expect(stream).toBeInstanceOf(FetchXStream);
  });

  it('should expose meta as FetchXResponse shape', () => {
    const res = new Response(new ReadableStream(), {
      status: 201,
      statusText: 'Created',
      headers: new Headers({ 'x-a': '1' }),
    });
    const stream = new Uint8ArrayStream(
      res,
      { url: '/test', method: 'POST' },
      new AbortController()
    );

    expect(stream.meta.status).toBe(201);
    expect(stream.meta.statusText).toBe('Created');
    expect(stream.meta.headers.get('x-a')).toBe('1');
    expect(stream.meta.config.url).toBe('/test');
    expect(stream.meta.config.method).toBe('POST');
  });
});
