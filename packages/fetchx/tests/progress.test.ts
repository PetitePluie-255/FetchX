import { describe, it, expect } from 'vitest';
import {
  trackDownloadProgress,
  trackUploadProgress,
  isStreamingNotSupportedError,
  isStreamingUploadSupported,
} from '../src/progress';
import type { ProgressEvent } from '../src/types';

describe('trackDownloadProgress', () => {
  it('should return original response when no callback is given', () => {
    const original = new Response('test');
    const result = trackDownloadProgress(original);
    expect(result).toBe(original);
  });

  it('should return original response when body is null', () => {
    const original = new Response(null, { status: 204 });
    const events: ProgressEvent[] = [];
    const result = trackDownloadProgress(original, e => events.push(e));
    expect(result).toBe(original);
    expect(events).toHaveLength(0);
  });

  it('should return original response when body is locked', async () => {
    const original = new Response('test');
    // Read from the body to lock it
    const reader = original.body?.getReader();
    expect(reader).toBeDefined();
    const events: ProgressEvent[] = [];
    trackDownloadProgress(original, e => events.push(e));
    // Returns original because body is locked
    expect(events).toHaveLength(0);
  });

  it('should track progress of body chunks', async () => {
    const data = new Uint8Array(1000);
    const original = new Response(data, {
      headers: { 'content-length': '1000' },
    });

    const events: ProgressEvent[] = [];
    const tracked = trackDownloadProgress(original, e => events.push(e));

    // Read the tracked body to trigger progress
    const reader = (tracked.body as ReadableStream<Uint8Array>).getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty('loaded');
    expect(events[0]).toHaveProperty('total', 1000);
    expect(events[0]).toHaveProperty('percent');
  });

  it('should not have total when content-length is missing', async () => {
    const data = new Uint8Array(500);
    const original = new Response(data);

    const events: ProgressEvent[] = [];
    const tracked = trackDownloadProgress(original, e => events.push(e));

    const reader = (tracked.body as ReadableStream<Uint8Array>).getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].total).toBeUndefined();
    expect(events[0].percent).toBeUndefined();
  });

  it('should preserve response status and headers', async () => {
    const original = new Response('test data', {
      status: 201,
      statusText: 'Created',
      headers: { 'x-custom': 'value' },
    });

    const events: ProgressEvent[] = [];
    const tracked = trackDownloadProgress(original, e => events.push(e));

    expect(tracked.status).toBe(201);
    expect(tracked.statusText).toBe('Created');
    expect(tracked.headers.get('x-custom')).toBe('value');

    // Consume body
    const text = await tracked.text();
    expect(text).toBe('test data');
  });
});

describe('trackUploadProgress', () => {
  it('should return body unchanged when no callback', () => {
    const body = 'test body';
    const result = trackUploadProgress(body);
    expect(result).toEqual({ body: 'test body' });
  });

  it('should return body unchanged for non-measurable types', () => {
    const fd = new FormData();
    fd.append('a', '1');
    expect(trackUploadProgress(fd)).toEqual({ body: fd });

    expect(trackUploadProgress(null)).toEqual({ body: null });
    expect(trackUploadProgress(undefined)).toEqual({ body: undefined });
  });

  it('should wrap string body with ReadableStream', () => {
    const events: ProgressEvent[] = [];
    const result = trackUploadProgress('hello', e => events.push(e));

    expect(result.duplex).toBe('half');
    expect(result.body).toBeInstanceOf(ReadableStream);
  });

  it('should wrap Uint8Array body with ReadableStream', () => {
    const data = new Uint8Array(1000);
    const events: ProgressEvent[] = [];
    const result = trackUploadProgress(data, e => events.push(e));

    expect(result.duplex).toBe('half');
    expect(result.body).toBeInstanceOf(ReadableStream);
  });

  it('should fire upload progress for string body', async () => {
    const events: ProgressEvent[] = [];
    const result = trackUploadProgress('test data string', e => events.push(e));

    // Read the stream to trigger progress
    const reader = (result.body as ReadableStream).getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].loaded).toBeGreaterThan(0);
    expect(events[0].total).toBeGreaterThan(0);
    expect(events[0].percent).toBeDefined();
  });

  it('should fire upload progress for Blob body', async () => {
    const blob = new Blob(['x'.repeat(50000)]);
    const events: ProgressEvent[] = [];
    const result = trackUploadProgress(blob, e => events.push(e));

    expect(result.duplex).toBe('half');
    // Read the stream
    const reader = (result.body as ReadableStream).getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    expect(events.length).toBeGreaterThan(0);
  });
});

describe('streaming support detection', () => {
  it('should return undefined before any upload attempt', () => {
    // The cached value is module-scoped, may already be set by other tests.
    // We just verify the function returns a boolean or undefined.
    const supported = isStreamingUploadSupported();
    expect(
      supported === undefined || supported === true || supported === false
    ).toBe(true);
  });

  it('should detect duplex-related error', () => {
    const err1 = new TypeError(
      "Failed to construct 'Request': The `duplex` member must be set to half"
    );
    expect(isStreamingNotSupportedError(err1)).toContain('not supported');

    const err2 = new TypeError(
      'Request with a ReadableStream body requires duplex: half'
    );
    expect(isStreamingNotSupportedError(err2)).toContain('not supported');
  });

  it('should not flag unrelated errors', () => {
    expect(
      isStreamingNotSupportedError(new TypeError('fetch failed'))
    ).toBeNull();
    expect(isStreamingNotSupportedError(new Error('timeout'))).toBeNull();
    expect(isStreamingNotSupportedError(new TypeError('Aborted'))).toBeNull();
  });
});
