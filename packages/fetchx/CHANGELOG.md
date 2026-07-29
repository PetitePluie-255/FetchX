# Changelog

## 0.2.0 (2026-07-29)

### Features

- Parse SSE events with LF, CRLF, or CR separators, including separators split across chunks.
- Validate streaming HTTP statuses and expose parsed error bodies through `HTTPError`.
- Add `connectTimeout`, `idleTimeout`, and timeout phase metadata.
- Acquire stream readers lazily and sanitize `stream.meta.config`.

### Behavior Changes

- Streaming methods now throw `HTTPError` by default when `validateStatus` rejects a response. Set `throwHttpErrors: false` to inspect the raw response instead.
