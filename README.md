# FetchX

基于 `fetch` 的 axios 风格 HTTP 客户端，零依赖，TypeScript 优先。

[![npm version](https://img.shields.io/npm/v/@petite-pluie/fetchx)](https://www.npmjs.com/package/@petite-pluie/fetchx)
[![license](https://img.shields.io/npm/l/@petite-pluie/fetchx)](LICENSE)

## 特性

- **axios 风格 API** — `api.get()` / `api.post()` / `api.put()` / `api.delete()` / `api.patch()` / `api.head()` / `api.request()`
- **零依赖** — 基于浏览器原生 `fetch`，无第三方运行时依赖
- **TypeScript 优先** — 完整类型定义，泛型响应
- **拦截器** — 请求/响应拦截器链，异步执行，支持添加/移除/清空，错误恢复
- **超时与取消** — 内置超时控制，AbortController / CancelToken 双重 API
- **响应控制** — `validateStatus` 自定义成功判定，`responseType` 强制解析类型
- **去重请求** — 基于 URL + 参数自动取消重复请求
- **请求重试** — 指数退避算法，可配置重试次数和条件
- **请求缓存** — 基于 key + TTL 的内存缓存，支持 LRU 淘汰
- **并发控制** — 限制同时发起的请求数量
- **进度监听** — 上传/下载进度回调
- **防抖/节流** — `debounceRequest` / `throttleRequest` 工具函数
- **流式请求** — SSE / NDJSON / 原始 Uint8Array 流，`for await...of` 消费
- **响应流访问** — `responseType: 'stream'` 获取原始 ReadableStream
- **自动解析** — 根据 Content-Type 自动解析 json/text/blob/form-data
- **错误分类** — `FetchXError` 明确区分网络、超时、取消、HTTP、不支持

## 安装

```bash
pnpm add @petite-pluie/fetchx
```

```bash
npm install @petite-pluie/fetchx
```

```bash
yarn add @petite-pluie/fetchx
```

## 快速开始

```typescript
import createFetchX from '@petite-pluie/fetchx';

const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});

// GET 请求
const users = await api.get('/users');

// GET 带查询参数
const page = await api.get('/users', { params: { page: 1, limit: 10 } });

// POST 请求（自动 JSON 序列化）
const newUser = await api.post('/users', {
  name: 'John',
  email: 'john@example.com',
});

// PUT 请求
const updated = await api.put('/users/1', { name: 'John Updated' });

// PATCH 请求
const patched = await api.patch('/users/1', { status: 'active' });

// DELETE 请求
await api.delete('/users/1');

// HEAD 请求
await api.head('/users');
```

## 配置

```typescript
import { createFetchX } from '@petite-pluie/fetchx';

const api = createFetchX({
  baseURL: 'https://api.example.com', // 基础 URL
  timeout: 10000, // 超时时间 (ms)，0 表示不超时
  headers: {
    // 默认请求头
    'Content-Type': 'application/json',
    'X-Custom': 'value',
  },
  credentials: 'include', // RequestCredentials
  validateStatus: status => status < 500, // 自定义成功状态码判定
  responseType: 'json', // 强制响应解析类型
  dedupe: true, // 自动取消重复请求
  cache: { ttl: 60000, maxSize: 100 }, // 请求缓存配置
  retry: { retries: 3, delay: 1000 }, // 请求重试配置
  maxConcurrency: 5, // 最大并发请求数（0 = 不限）
});
```

### `validateStatus` — 自定义成功判定

默认将 2xx 视为成功。可通过 `validateStatus` 自定义判定逻辑：

```typescript
// 全局配置
const api = createFetchX({ validateStatus: status => status < 500 });

// 单次请求覆盖
await api.get('/data', {
  validateStatus: status => status === 200 || status === 304,
});
```

### `responseType` — 强制响应解析

覆盖 Content-Type 自动检测，强制以指定类型解析响应：

```typescript
// 以文本形式获取 JSON 响应
const text = await api.get('/api.json', { responseType: 'text' });

// 以 ArrayBuffer 获取二进制数据
const buffer = await api.get('/file', { responseType: 'arrayBuffer' });
```

支持：`'json'` | `'text'` | `'blob'` | `'arrayBuffer'` | `'formData'` | `'stream'`

### `api.request(config)` — 通用请求方法

通过单个配置对象驱动请求，适合需要动态 method 的场景：

```typescript
const data = await api.request({
  method: 'POST',
  url: '/users',
  body: { name: 'John' },
  params: { sync: true },
});
```

### `CancelToken` — axios 兼容取消 API

```typescript
import { CancelToken } from '@petite-pluie/fetchx';

const source = CancelToken.source();

api.get('/slow', { cancelToken: source.token });

// 取消请求
source.cancel('操作被用户中断');
```

### 自动去重 (`dedupe`)

启用后，相同 method + URL 的重复请求会自动取消前一个未完成的请求：

```typescript
const api = createFetchX({ dedupe: true });

// 以下只有第二个请求会执行，第一个自动取消
api.get('/users?page=1');
api.get('/users?page=1'); // ← 这个请求会执行
```

## 请求重试

指数退避算法，可全局配置或按请求覆盖：

```typescript
const api = createFetchX({
  retry: {
    retries: 3, // 最大重试次数（默认 0）
    delay: 1000, // 初始延迟 ms（默认 1000）
    maxDelay: 30000, // 最大延迟上限 ms（默认 30000）
    methods: ['GET', 'HEAD'], // 重试的 HTTP 方法
    condition: (error, attempt) => {
      // 自定义重试条件（默认：网络错误 + 5xx）
      return error.code === 'ERR_NETWORK' || (error.status ?? 0) >= 500;
    },
  },
});
```

重试策略：延迟 = `min(delay * 2^(attempt-1), maxDelay)`，重试期间每次独立计时 timeout。

## 请求缓存

基于 key（method + URL + params + body）的内存缓存，支持 TTL 和 LRU 淘汰：

```typescript
const api = createFetchX({
  cache: {
    ttl: 60000, // 缓存有效期 ms（默认 60000）
    maxSize: 100, // 最大缓存条目数（默认 100）
    methods: ['GET'], // 缓存的 HTTP 方法
  },
});

// api.cache 提供缓存管理 API
api.cache.clear(); // 清空全部
api.cache.delete('cache-key'); // 删除指定条目
api.cache.has('cache-key'); // 检查是否存在
console.log(api.cache.size); // 当前条目数
```

## 并发控制

限制同时发起的请求数量，超过上限的请求进入 FIFO 队列：

```typescript
const api = createFetchX({ maxConcurrency: 5 });

// 以下 10 个请求最多同时执行 5 个，其余排队
for (let i = 0; i < 10; i++) {
  api.get(`/items/${i}`);
}
```

## 进度监听

监听上传/下载进度：

```typescript
// 下载进度
const data = await api.get('/large-file', {
  onDownloadProgress: e => {
    console.log(`已下载: ${e.loaded} / ${e.total} (${e.percent}%)`);
  },
});

// 上传进度（需运行时支持 ReadableStream + duplex）
const result = await api.post('/upload', file, {
  onUploadProgress: e => {
    console.log(`已上传: ${e.loaded} / ${e.total} (${e.percent}%)`);
  },
});

// 检查当前运行时是否支持流式上传
import { isStreamingUploadSupported } from '@petite-pluie/fetchx';
if (isStreamingUploadSupported() === false) {
  console.warn('当前环境不支持上传进度跟踪');
}
```

## 防抖与节流

独立的工具函数，可包装任意异步请求方法：

```typescript
import { debounceRequest, throttleRequest } from '@petite-pluie/fetchx';

const search = debounceRequest(api.get, 300);
const scroll = throttleRequest(api.get, 500);

// 连续调用只有最后一次生效
search('/search?q=a');
search('/search?q=ab');
search('/search?q=abc'); // ← 只有这个会实际发出请求
```

## 流式请求

FetchX 提供三种流式请求方法，均返回 `FetchXStream<T>` 对象，支持 `for await...of` 消费。

### SSE（Server-Sent Events）

```typescript
// AI Chat 流式调用（默认 POST + JSON body）
const stream = api.sse('/chat/completions', {
  body: { model: 'gpt-4', messages: [...] },
});

// HTTP 错误不抛异常，通过 stream.response 检查
if (!stream.response.ok) {
  throw new Error(`SSE 连接失败: ${stream.response.status}`);
}

for await (const event of stream) {
  // event: { data: string, event?: string, id?: string, retry?: number }
  if (event.data === '[DONE]') break;
  const chunk = JSON.parse(event.data);
  console.log(chunk);
}
```

### NDJSON（Newline-Delimited JSON）

```typescript
const stream = api.ndjson<LogEntry>('/logs/stream');

for await (const entry of stream) {
  // entry 已是 LogEntry 类型
  console.log(entry.timestamp);
}
```

### 原始流（Uint8Array）

```typescript
const stream = api.stream('/download');

const decoder = new TextDecoder();
for await (const chunk of stream) {
  // chunk: Uint8Array
  console.log(decoder.decode(chunk, { stream: true }));
}
```

### `responseType: 'stream'`

通过现有 API 获取原始 ReadableStream，正常走拦截器等管线：

```typescript
const result = await api.get('/large-file', { responseType: 'stream' });
// result.data: ReadableStream<Uint8Array>
// result.status: number
// result.headers: Headers

const reader = (result.data as ReadableStream<Uint8Array>).getReader();
// ...
```

### FetchXStream API

| 属性/方法         | 说明                                      |
| ----------------- | ----------------------------------------- |
| `stream.response` | 原始 `Response` 对象（status/headers/ok） |
| `stream.abort()`  | 取消流，自动释放 reader                   |
| `for await...of`  | 异步迭代消费                              |

> **注意**：流式请求不走响应拦截器（避免拦截器消费 body），但请求拦截器正常执行。不支持缓存/重试/去重。

## 拦截器

### 请求拦截器

在请求发出前修改配置（例如添加 token）：

```typescript
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  }
  return config;
});
```

### 响应拦截器

在响应返回后对数据进行预处理：

```typescript
api.interceptors.response.use(response => {
  // 直接修改 Response 对象
  console.log(`[${response.status}] ${response.url}`);
  return response;
});
```

### 拦截器管理

```typescript
// 添加拦截器并获取 ID
const id = api.interceptors.request.use(config => config);

// 移除指定拦截器
api.interceptors.request.eject(id);

// 清空所有拦截器
api.interceptors.request.clear();

// 查看拦截器数量
console.log(api.interceptors.request.length);
```

### 异步拦截器

```typescript
api.interceptors.request.use(async config => {
  const token = await refreshToken();
  config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});
```

### 错误恢复

后置拦截器的 reject 回调可以从前置截器的错误中恢复：

```typescript
api.interceptors.request.use(() => {
  throw new Error('Interceptor error');
});

api.interceptors.request.use(
  config => config,
  () => ({ url: '/fallback', method: 'GET' }) // 恢复：返回降级配置
);
```

## 取消请求

```typescript
const controller = new AbortController();

api.get('/slow-endpoint', { signal: controller.signal }).catch(error => {
  if (isCancel(error)) {
    console.log('请求已取消');
  }
});

// 取消请求
controller.abort();
```

### 判断取消错误

```typescript
import { isCancel } from '@petite-pluie/fetchx';

try {
  await api.get('/users');
} catch (error) {
  if (isCancel(error)) {
    // 忽略取消错误，不做错误提示
    return;
  }
  // 处理其他错误
  showError(error.message);
}
```

## 错误处理

```typescript
import { FetchXError } from '@petite-pluie/fetchx';

try {
  await api.get('/users');
} catch (error) {
  if (error instanceof FetchXError) {
    switch (error.code) {
      case 'ERR_NETWORK':
        console.error('网络连接失败');
        break;
      case 'ECONNABORTED':
        console.error('请求超时');
        break;
      case 'ERR_CANCELED':
        console.log('请求已取消');
        break;
      case 'ERR_BAD_RESPONSE':
        console.error(`HTTP ${error.status} 错误`);
        break;
      case 'ERR_NOT_SUPPORTED':
        console.error('当前环境不支持此功能');
        break;
    }
  }
}
```

## TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// 指定响应类型
const { data: user } = await api.get<User>('/users/1');
// user: User

const { data: users } = await api.get<User[]>('/users');
// users: User[]

// 访问响应元数据
const result = await api.get<User>('/users/1');
console.log(result.status, result.headers, result.config);
```

### 导出的类型

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
} from '@petite-pluie/fetchx';
import {
  FetchXError,
  isCancel,
  createFetchX,
  CancelToken,
  FetchXStream,
  debounceRequest,
  throttleRequest,
  isStreamingUploadSupported,
} from '@petite-pluie/fetchx';
```

## API 参考

### `createFetchX(config?)`

创建 FetchX 实例。

```typescript
function createFetchX(config?: FetchXConfig): FetchXInstance;
```

### `FetchXInstance`

| 方法 / 属性 | 签名                                                        |
| ----------- | ----------------------------------------------------------- |
| `get`       | `<T>(url, options?) => Promise<FetchXResponse<T>>`          |
| `post`      | `<T>(url, body?, options?) => Promise<FetchXResponse<T>>`   |
| `put`       | `<T>(url, body?, options?) => Promise<FetchXResponse<T>>`   |
| `delete`    | `<T>(url, options?) => Promise<FetchXResponse<T>>`          |
| `patch`     | `<T>(url, body?, options?) => Promise<FetchXResponse<T>>`   |
| `head`      | `<T>(url, options?) => Promise<FetchXResponse<T>>`          |
| `request`   | `<T>(config: RequestOptions) => Promise<FetchXResponse<T>>` |
| `stream`    | `(url, options?) => Promise<FetchXStream<Uint8Array>>`      |
| `sse`       | `(url, options?) => Promise<FetchXStream<SSEEvent>>`        |
| `ndjson`    | `<T>(url, options?) => Promise<FetchXStream<T>>`            |
| `cache`     | `CacheManager` — 缓存管理对象（clear/delete/has/get/size）  |

#### `RequestOptions`

| 字段                 | 类型                                                                    | 说明                       |
| -------------------- | ----------------------------------------------------------------------- | -------------------------- |
| `url`                | `string`                                                                | 请求路径（相对于 baseURL） |
| `method`             | `string`                                                                | HTTP 方法                  |
| `params`             | `Record<string, unknown>`                                               | 查询参数，自动序列化       |
| `body`               | `unknown`                                                               | 请求体，自动 JSON 序列化   |
| `headers`            | `Record<string, string>`                                                | 请求头（合并到默认头）     |
| `timeout`            | `number`                                                                | 本次请求超时时间           |
| `signal`             | `AbortSignal`                                                           | 取消信号                   |
| `cancelToken`        | `CancelToken`                                                           | axios 兼容取消令牌         |
| `baseURL`            | `string`                                                                | 覆盖实例的 baseURL         |
| `credentials`        | `RequestCredentials`                                                    | 凭证模式                   |
| `validateStatus`     | `(status: number) => boolean`                                           | 自定义成功状态码判定       |
| `responseType`       | `'json' \| 'text' \| 'blob' \| 'arrayBuffer' \| 'formData' \| 'stream'` | 强制响应解析类型           |
| `dedupe`             | `boolean`                                                               | 是否启用去重               |
| `cache`              | `CacheConfig \| false`                                                  | 请求缓存配置               |
| `retry`              | `RetryConfig \| false`                                                  | 请求重试配置               |
| `maxConcurrency`     | `number`                                                                | 最大并发请求数             |
| `onDownloadProgress` | `(e: ProgressEvent) => void`                                            | 下载进度回调               |
| `onUploadProgress`   | `(e: ProgressEvent) => void`                                            | 上传进度回调               |

### `FetchXError`

| 属性           | 类型              | 说明                                                                                               |
| -------------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| `message`      | `string`          | 错误描述                                                                                           |
| `code`         | `string?`         | 错误码：`ERR_NETWORK` / `ECONNABORTED` / `ERR_CANCELED` / `ERR_BAD_RESPONSE` / `ERR_NOT_SUPPORTED` |
| `status`       | `number?`         | HTTP 状态码（仅在 `ERR_BAD_RESPONSE` 时）                                                          |
| `config`       | `RequestOptions?` | 引发错误的请求配置                                                                                 |
| `isAxiosError` | `boolean`         | 始终为 `true`                                                                                      |

### `isCancel(value)`

检测是否为取消/超时错误，兼容 FetchX、原生 AbortError、Axios CanceledError。

```typescript
function isCancel(value: unknown): boolean;
```

## 路线图

详见 [ROADMAP.md](./ROADMAP.md)

## License

MIT
