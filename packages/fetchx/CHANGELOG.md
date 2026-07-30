# Changelog

## [0.3.0](https://github.com/PetitePluie-255/FetchX/compare/fetchx-v0.2.1...fetchx-v0.3.0) (2026-07-30)

### Features

- **fetchx:** support custom request executors ([f7dffc6](https://github.com/PetitePluie-255/FetchX/commit/f7dffc646dce76ee3c3ef3884bcce84bfd1c03c1))

### Bug Fixes

- **fetchx:** complete streaming lifecycle handling ([a684c63](https://github.com/PetitePluie-255/FetchX/commit/a684c63999c38a7de2531a055721454796928880))

## Unreleased

### Features

- Add an injectable `RequestExecutor` for custom HTTP transports, Electron network stacks, and integration tests.
- Add `onStreamEnd` and `onStreamError` plugin hooks for terminal stream lifecycle events.

### Fixed

- Classify custom abort reasons as cancellation by checking the active signal state.
- Merge request headers case-insensitively across defaults, request options, and interceptors.

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
