# FetchX 版本路线图

## v1.0 — 基础版本 ✅ 已完成

基于 `fetch` 的 axios 风格 HTTP 客户端，零依赖，TypeScript 编写。

### 核心能力

- **HTTP 方法**：GET、POST、PUT、DELETE、PATCH、HEAD
- **配置**：baseURL、headers（默认 `Content-Type: application/json`）、timeout、credentials
- **请求**：params 查询参数序列化（含数组）、body 序列化（JSON/FormData/Blob/ArrayBuffer）
- **响应**：根据 Content-Type 自动解析（json → `response.json()`，text → `response.text()`，form-data → `response.formData()`，其余 → `response.blob()`）
- **错误**：`FetchXError` 类，区分四种错误码：
  - `ERR_NETWORK` — 网络错误
  - `ECONNABORTED` — 超时
  - `ERR_CANCELED` — 用户取消
  - `ERR_BAD_RESPONSE` — HTTP 非 2xx 状态码
- **拦截器**：请求/响应拦截器链式异步执行，支持 `use()` / `eject()` / `clear()`
- **取消控制**：AbortController 集成，用户 signal + timeout signal 合并，`isCancel()` 工具（兼容 FetchX / 原生 AbortError / Axios CanceledError）

### API 示例

```typescript
import createFetchX from '@petite-pluie/fetchx';

const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});

// GET 请求
const users = await api.get('/users', { params: { page: 1 } });

// POST 请求
const newUser = await api.post('/users', { name: 'John' });

// 拦截器
api.interceptors.request.use(config => {
  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// 取消
const controller = new AbortController();
api.get('/slow', { signal: controller.signal });
controller.abort();
```

---

## v1.1 — 拦截器增强 ✅ 已完成

### 目标

完善拦截器系统，让错误处理更灵活，API 更贴近 axios 习惯。

### 核心改动

- 响应拦截器的 `rejected` handler 现在可以捕获 HTTP 4xx/5xx 错误
- 错误恢复：`rejected` handler 返回新 `Response` 即可恢复
- 对标 axios：`interceptors.response.use(onFulfilled, onRejected)`

### 实现

仅改 2 个源文件 + 新增 6 个测试。将状态检查前置到响应拦截器链之前，非 2xx 响应以 `Promise.reject(FetchXError)` 进入拦截器链，`rejected` handler 可捕获并恢复。

### 优先级

P0 — 拦截器对实际项目使用至关重要。

---

## v1.2 — 请求/响应控制增强 ✅ 已完成

### 目标

补全核心 HTTP 客户端缺失的基础能力。

### 计划功能

- **`validateStatus`**：自定义成功状态码判定，如 `(status) => status < 500`，不再硬编码 2xx
- **`responseType`**：强制指定响应解析类型（json/text/blob/arrayBuffer/formData），覆盖 Content-Type 自动检测
- **`api.request(config)`**：通用请求方法，通过 config 对象驱动请求（method/url 统一在 config 中）
- **CancelToken**：`CancelToken.source()` 模式，兼容 axios 取消 API
- **静态工具方法**：`FetchX.isCancel()` / `FetchX.CancelToken`
- **自动取消重复请求**：基于 URL + 参数去重，自动取消前一个未完成的相同请求

### 优先级

P1 — 补全核心能力缺口，实际项目高频需求。

---

## v1.3 — 高级请求特性 ✅ 已完成

### 目标

提供开箱即用的高级 HTTP 能力。

### 计划功能

- **请求重试**：指数退避算法，可配置重试次数和间隔
- **请求缓存**：基于 key + TTL 的内存缓存
- **防抖/节流**：包装请求方法，支持 debounce/throttle
- **并发控制**：限制同时发起的请求数量
- **进度监听**：上传/下载进度回调

### 优先级

P1 — 重试和缓存是高频需求。

---

## v1.4 — 通用流式封装 🔜 方案已定

> 这是 FetchX 的核心能力——库的初衷就是解决 axios 不支持 ReadableStream 的问题。

### 目标

提供通用的流式 HTTP 请求封装，支持 `for await...of` 消费，协议级解析，不掺业务逻辑。后续通过插件系统添加 OpenAI 等特化支持。

### 计划功能

- **`responseType: 'stream'`** — 原始 ReadableStream 访问，与现有 API 一致
  - `api.get('/file', { responseType: 'stream' })` → `ReadableStream<Uint8Array>`
  - 不消费 body，用户完全自主处理
- **`api.stream(url, options?)`** — 原始 Uint8Array 流，最基础的流式传输
- **`api.sse(url, options?)`** — SSE（Server-Sent Events）协议解析
  - 按 SSE 协议提取 `data`/`event`/`id`/`retry` 字段
  - `data` 多行拼接
  - `:` 注释行忽略
  - `[DONE]` 终止信号识别
  - data 字段保持原始 string，不做 JSON 解析
  - **HTTP 方法默认 POST**，支持 body 传参（AI Chat 场景）
  - 自动设置 `Accept: text/event-stream`
  - 响应暴露 `id`/`retry` 字段供上层实现重连策略
- **`api.ndjson<T>(url, options?)`** — NDJSON 逐行 JSON 解析
- **`FetchXStream<T>`** — 统一流式容器
  - `AsyncIterable<T>` — 支持 `for await...of`
  - `.abort()` — 手动取消（自动释放 reader）
  - `.response` — 访问原始 Response（status/headers），abort 后仍可读
- **复用现有基础设施**：mergeConfig、buildURL、serializeBody、请求拦截器、超时/取消

### 设计决策

| 问题                 | 决策                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| POST body 支持       | `api.sse('/chat', { body: { messages } })`，body 走现有 serializeBody |
| 流式请求的 HTTP 错误 | **不抛异常**，返回流让用户检查 `stream.response.status`               |
| 自动重连             | **不内置**，暴露 `id`/`retry` 字段，用户自行实现                      |
| 响应拦截器           | **跳过**，流式方法不走响应拦截器（避免意外消费 body）                 |
| 请求拦截器           | **正常走**，token 注入等基础能力必须支持                              |
| 内存/背压            | AsyncIterable 天然背压，不做 buffer 上限（信任消费者及时消费）        |
| `.tee()` 多路消费    | **暂不支持**，需求频率低，可后续插件扩展                              |

### API 预览

```typescript
// SSE 流式调用（AI Chat 核心场景）
const stream = api.sse('/chat/completions', { body: { messages } });
for await (const event of stream) {
  if (!stream.response.ok) throw new Error(`HTTP ${stream.response.status}`);
  const chunk = JSON.parse(event.data); // 按需解析 JSON
}

// NDJSON 流式调用
const stream = api.ndjson<LogEntry>('/logs/stream');
for await (const entry of stream) {
  // entry 已是 LogEntry 类型
}

// 原始流式
const stream = api.stream('/download');
for await (const chunk of stream) {
  // chunk: Uint8Array
}

// responseType: 'stream' — 通过现有 API 获取原始流
const rs = await api.get('/file', { responseType: 'stream' });
// rs: ReadableStream<Uint8Array>

// 访问响应信息 & 手动取消
console.log(stream.response.status);
stream.abort();
```

### 优先级

P0 — 流式支持是 FetchX 的立库之本，AI Chat 场景的刚需。

---

## v1.5 — 核心缺陷修复 🔜 计划中

### 目标

修复 v1.0~v1.3 中已确认的运行时缺陷，补齐 API 完整性。

### 计划修复

- **`Content-Type` 与 FormData 冲突** — FormData body 时自动移除默认 `application/json`，让浏览器正确设置 multipart boundary
- **`URLSearchParams` 支持** — `serializeBody` 增加 `URLSearchParams` 分支，正确序列化为 `application/x-www-form-urlencoded`
- **空 body JSON 解析** — `parseResponse` 对 HEAD/204 等无 body 响应的 `response.json()` 做降级处理
- **响应返回 `FetchXResponse<T>`** — 对齐 axios 风格，返回 `{ data, status, headers, statusText, config }`

### 优先级

P0 — Bug 修复是发布的前置条件。详见 [BUGS.md](./BUGS.md)。

---

## v2.0 — 插件架构 🔮 计划中

### 目标

提供 `api.use(plugin)` 插件化扩展机制，让 React/Vue 集成、XHR 降级等能力脱离核心库，作为独立 npm 包发布。保持 FetchX 核心零依赖、聚焦 HTTP。

### 插件钩子

插件通过钩子（hooks）介入请求生命周期：

| 钩子         | 触发时机                 | 用途                        |
| ------------ | ------------------------ | --------------------------- |
| `onInit`     | 实例创建时               | 注入能力（如 adapter 替换） |
| `onRequest`  | 请求发出前（拦截器之后） | 修改配置、添加头            |
| `onResponse` | 收到响应后（解析之前）   | 响应变换、埋点              |
| `onError`    | 请求出错时               | 错误上报、重试              |
| `onStream`   | 流式请求建立时           | 流式数据钩子                |

### 计划功能

- **`api.use(plugin)`** — 注册插件，返回卸载函数
- **插件优先级** — 控制执行顺序
- **请求级插件** — `api.get(url, { plugins: [...] })`

### 官方插件生态

| 插件            | 包名                              | 说明                         |
| --------------- | --------------------------------- | ---------------------------- |
| React hooks     | `@petite-pluie/fetchx-react`      | `useRequest` / `useMutation` |
| Vue composables | `@petite-pluie/fetchx-vue`        | `useRequest` / `useMutation` |
| XHR 上传进度    | `@petite-pluie/fetchx-xhr-upload` | 非流式环境降级               |

### 优先级

P1 — 插件架构是生态扩展的基石，是框架集成和 XHR 降级的前置依赖。

---

## v2.1 — 高级数据管理 🔮 计划中

### 目标

提供 SWR 风格的数据管理能力。

### 计划功能

- 乐观更新（optimistic update）
- Stale-while-revalidate 策略
- 数据预加载（prefetch）
- 无限滚动 / 分页支持
- 离线 & 数据持久化

### 优先级

P2 — 复杂场景需求，可延后。

---

## v3.0 — 企业级特性 🔮 计划中

### 目标

满足大型项目 / 微前端架构的需求，通过插件生态交付。

### 计划功能

- GraphQL 适配器
- WebSocket 集成
- 请求链路追踪 & 性能监控
- 错误上报集成
- Mock 数据支持
- 多环境配置管理

### 优先级

P2 — 大规模项目需求，按需推进。

---

## 版本总览

| 版本 | 主题              | 状态      |
| ---- | ----------------- | --------- |
| v1.0 | 基础 HTTP 客户端  | ✅ 已完成 |
| v1.1 | 拦截器增强        | ✅ 已完成 |
| v1.2 | 请求/响应控制增强 | ✅ 已完成 |
| v1.3 | 高级请求特性      | ✅ 已完成 |
| v1.4 | 通用流式封装      | ✅ 已完成 |
| v1.5 | 核心缺陷修复      | ✅ 已完成 |
| v2.0 | 插件架构          | 🔮 计划中 |
| v2.1 | 高级数据管理      | 🔮 计划中 |
| v3.0 | 企业级特性        | 🔮 计划中 |
