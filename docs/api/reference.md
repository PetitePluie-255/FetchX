# API 参考

## createFetchX(config?)

创建 FetchX 实例。

```typescript
function createFetchX<T = unknown>(config?: FetchXConfig): FetchXInstance<T>;
```

`T` 为默认响应数据类型，每个方法仍可单独覆盖。

## FetchXInstance&lt;T&gt;

### 请求方法

| 方法      | 签名                                                            |
| --------- | --------------------------------------------------------------- |
| `get`     | `<R = T>(url, options?) => Promise<FetchXResponse<R>>`          |
| `post`    | `<R = T>(url, body?, options?) => Promise<FetchXResponse<R>>`   |
| `put`     | `<R = T>(url, body?, options?) => Promise<FetchXResponse<R>>`   |
| `delete`  | `<R = T>(url, options?) => Promise<FetchXResponse<R>>`          |
| `patch`   | `<R = T>(url, body?, options?) => Promise<FetchXResponse<R>>`   |
| `head`    | `<R = T>(url, options?) => Promise<FetchXResponse<R>>`          |
| `request` | `<R = T>(config: RequestOptions) => Promise<FetchXResponse<R>>` |

### 流式方法

| 方法     | 签名                                                   |
| -------- | ------------------------------------------------------ |
| `stream` | `(url, options?) => Promise<FetchXStream<Uint8Array>>` |
| `sse`    | `(url, options?) => Promise<FetchXStream<SSEEvent>>`   |
| `ndjson` | `<R = T>(url, options?) => Promise<FetchXStream<R>>`   |

### 实例属性

| 属性           | 类型                             | 说明         |
| -------------- | -------------------------------- | ------------ |
| `interceptors` | `InterceptorManager`             | 拦截器管理器 |
| `cache`        | `CacheManager`                   | 缓存管理对象 |
| `use`          | `(plugin: Plugin) => () => void` | 注册插件     |
| `unuse`        | `(name: string) => boolean`      | 卸载插件     |

## FetchXResponse&lt;T&gt;

```typescript
interface FetchXResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestOptions;
}
```

## FetchXConfig

```typescript
interface FetchXConfig {
  baseURL?: string;
  timeout?: number;
  connectTimeout?: number;
  idleTimeout?: number;
  throwHttpErrors?: boolean;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  validateStatus?: (status: number) => boolean;
  responseType?: ResponseType;
  dedupe?: boolean;
  cache?: CacheConfig | false;
  retry?: RetryConfig | false;
  maxConcurrency?: number;
  sanitizeConfig?: boolean;
}
```

## 错误类型

| 类                   | code               | 说明                       |
| -------------------- | ------------------ | -------------------------- |
| `FetchXError`        | —                  | 基类                       |
| `NetworkError`       | `ERR_NETWORK`      | 网络连接失败               |
| `TimeoutError`       | `ECONNABORTED`     | 请求超时（phase 标识阶段） |
| `CancelError`        | `ERR_CANCELED`     | 用户取消                   |
| `HTTPError&lt;T&gt;` | `ERR_BAD_RESPONSE` | HTTP 错误（携带 response） |

### 类型守卫

```typescript
isNetworkError(value): value is NetworkError
isTimeoutError(value): value is TimeoutError
isCancelError(value): value is CancelError
isHTTPError(value): value is HTTPError
isCancel(value): boolean
```

## 导出的类和函数

```typescript
import {
  createFetchX,
  FetchXError,
  NetworkError,
  TimeoutError,
  CancelError,
  HTTPError,
  FetchXStream,
  isCancel,
  isNetworkError,
  isTimeoutError,
  isCancelError,
  isHTTPError,
  debounceRequest,
  throttleRequest,
  isStreamingUploadSupported,
} from '@petite-pluie/fetchx';
```

## 导出的类型

```typescript
import type {
  FetchXConfig,
  FetchXInstance,
  FetchXResponse,
  RequestOptions,
  RequestInterceptor,
  ResponseInterceptor,
  HttpMethod,
  ResponseType,
  RetryConfig,
  CacheConfig,
  CacheManager,
  ProgressEvent,
  SSEEvent,
  Plugin,
  PluginContext,
} from '@petite-pluie/fetchx';
```

## CacheManager

```typescript
interface CacheManager {
  clear(): void;
  delete(key: string): boolean;
  has(key: string): boolean;
  get(key: string): unknown | undefined;
  readonly size: number;
}
```
