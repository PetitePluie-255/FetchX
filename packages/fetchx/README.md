# FetchX

基于 `fetch` 的 axios 风格 HTTP 客户端，零依赖，TypeScript 优先。

[![npm version](https://img.shields.io/npm/v/@petite-pluie/fetchx)](https://www.npmjs.com/package/@petite-pluie/fetchx)
[![license](https://img.shields.io/npm/l/@petite-pluie/fetchx)](LICENSE)

## 特性

- **axios 风格 API** — `api.get()` / `api.post()` / `api.put()` / `api.delete()` / `api.patch()` / `api.head()` / `api.request()`
- **零依赖** — 基于浏览器原生 `fetch`，无第三方运行时依赖
- **TypeScript 优先** — 完整类型定义，泛型响应
- **拦截器** — 请求/响应拦截器链，异步执行，支持添加/移除/清空，错误恢复
- **超时与取消** — 内置超时控制，AbortController
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
- **错误分类** — `FetchXError` 基类 + `NetworkError` / `TimeoutError` / `CancelError` / `HTTPError` 子类，类型守卫鉴别
- **插件架构** — `api.use(plugin)` 插件系统，request/response/error/stream 生命周期钩子，优先级排序
- **嵌套参数** — 查询参数支持嵌套对象（`filter[status]=active`）和自定义 `paramsSerializer`
- **配置脱敏** — `sanitizeConfig` 开关，自动剥离敏感请求头

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

## 详细文档

- [完整 README（GitHub）](https://github.com/PetitePluie-255/FetchX#readme)
- [路线图](https://github.com/PetitePluie-255/FetchX/blob/main/ROADMAP.md)

## License

MIT
