# FetchX

基于 `fetch` 的 axios 风格 HTTP 客户端，零依赖，TypeScript 优先。

[![npm version](https://img.shields.io/npm/v/@petite-pluie/fetchx)](https://www.npmjs.com/package/@petite-pluie/fetchx)
[![license](https://img.shields.io/npm/l/@petite-pluie/fetchx)](LICENSE)

## 特性

- **axios 风格 API** — `api.get()` / `api.post()` / `api.put()` / `api.delete()` / `api.patch()` / `api.head()`
- **零依赖** — 基于浏览器原生 `fetch`，无第三方运行时依赖
- **TypeScript 优先** — 完整类型定义，泛型响应
- **拦截器** — 请求/响应拦截器链，异步执行，支持添加/移除/清空
- **超时与取消** — 内置超时控制，AbortController 集成
- **自动解析** — 根据 Content-Type 自动解析 json/text/blob/form-data
- **错误分类** — `FetchXError` 明确区分网络错误、超时、取消、HTTP 错误

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
});
```

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
        console.error(`HTTP ${error.config?.status} 错误`);
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
const user = await api.get<User>('/users/1');
// user: User

const users = await api.get<User[]>('/users');
// users: User[]
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
} from '@petite-pluie/fetchx';
import { FetchXError, isCancel, createFetchX } from '@petite-pluie/fetchx';
```

## API 参考

### `createFetchX(config?)`

创建 FetchX 实例。

```typescript
function createFetchX(config?: FetchXConfig): FetchXInstance;
```

### `FetchXInstance`

| 方法     | 签名                                      |
| -------- | ----------------------------------------- |
| `get`    | `<T>(url, options?) => Promise<T>`        |
| `post`   | `<T>(url, body?, options?) => Promise<T>` |
| `put`    | `<T>(url, body?, options?) => Promise<T>` |
| `delete` | `<T>(url, options?) => Promise<T>`        |
| `patch`  | `<T>(url, body?, options?) => Promise<T>` |
| `head`   | `<T>(url, options?) => Promise<T>`        |

#### `RequestOptions`

| 字段          | 类型                      | 说明                       |
| ------------- | ------------------------- | -------------------------- |
| `url`         | `string`                  | 请求路径（相对于 baseURL） |
| `method`      | `string`                  | HTTP 方法                  |
| `params`      | `Record<string, unknown>` | 查询参数，自动序列化       |
| `body`        | `unknown`                 | 请求体，自动 JSON 序列化   |
| `headers`     | `Record<string, string>`  | 请求头（合并到默认头）     |
| `timeout`     | `number`                  | 本次请求超时时间           |
| `signal`      | `AbortSignal`             | 取消信号                   |
| `baseURL`     | `string`                  | 覆盖实例的 baseURL         |
| `credentials` | `RequestCredentials`      | 凭证模式                   |

### `FetchXError`

| 属性           | 类型              | 说明                                                                         |
| -------------- | ----------------- | ---------------------------------------------------------------------------- |
| `message`      | `string`          | 错误描述                                                                     |
| `code`         | `string?`         | 错误码：`ERR_NETWORK` / `ECONNABORTED` / `ERR_CANCELED` / `ERR_BAD_RESPONSE` |
| `config`       | `RequestOptions?` | 引发错误的请求配置                                                           |
| `isAxiosError` | `boolean`         | 始终为 `true`                                                                |

### `isCancel(value)`

检测是否为取消/超时错误，兼容 FetchX、原生 AbortError、Axios CanceledError。

```typescript
function isCancel(value: unknown): boolean;
```

## 路线图

详见 [ROADMAP.md](./ROADMAP.md)

## License

MIT
