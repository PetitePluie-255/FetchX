# Changelog

## Unreleased

### Features

- Add an injectable `RequestExecutor` for custom HTTP transports, Electron network stacks, and integration tests.

## 0.2.1 (2026-07-29)

### Fixed

- Reject pre-canceled streaming requests before calling `fetch`.
- Sanitize request headers in all exposed error configs.
- Preserve SSE defaults when custom headers are provided.
- Apply custom `paramsSerializer` functions to streaming URLs.
- Dispatch only SSE messages containing a `data` field and preserve SSE state.

### Changed

- Yield application-level SSE markers such as `[DONE]` unchanged.
- Cancel the response body when a consumer stops stream iteration early.

## 0.2.0 (2026-07-29)

### Features

- Parse SSE events with LF, CRLF, or CR separators, including separators split across chunks.
- Validate streaming HTTP statuses and expose parsed error bodies through `HTTPError`.
- Add `connectTimeout`, `idleTimeout`, and timeout phase metadata.
- Acquire stream readers lazily and sanitize `stream.meta.config`.

### Behavior Changes

- Streaming methods now throw `HTTPError` by default when `validateStatus` rejects a response. Set `throwHttpErrors: false` to inspect the raw response instead.
