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

## v1.2 — 请求/响应控制增强 🔜 计划中

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

## v1.3 — 高级请求特性 🔮 计划中

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

- **`api.stream(url, options?)`** — 原始 Uint8Array 流，最基础的流式传输
- **`api.sse(url, options?)`** — SSE（Server-Sent Events）协议解析
  - 按 SSE 协议提取 `data`/`event`/`id`/`retry` 字段
  - `data` 多行拼接
  - `:` 注释行忽略
  - `[DONE]` 终止信号识别
  - data 字段保持原始 string，不做 JSON 解析
- **`api.ndjson<T>(url, options?)`** — NDJSON 逐行 JSON 解析
- **`FetchXStream<T>`** — 统一流式容器
  - `AsyncIterable<T>` — 支持 `for await...of`
  - `.abort()` — 手动取消
  - `.response` — 访问原始 Response（status/headers）
- **复用现有基础设施**：mergeConfig、buildURL、serializeBody、请求拦截器、超时/取消

### API 预览

```typescript
// SSE 流式调用（AI Chat 核心场景）
const stream = api.sse('/chat/completions', { body: { messages } });
for await (const event of stream) {
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

// 访问响应信息 & 手动取消
console.log(stream.response.status);
stream.abort();
```

### 优先级

P0 — 流式支持是 FetchX 的立库之本，AI Chat 场景的刚需。

---

## v2.0 — React / Vue 集成 🔮 计划中

### 目标

提供声明式数据获取 Hooks / Composables，覆盖主流前端框架。

### 计划功能

**React**：

- **useRequest**：自动管理 data / loading / error 状态
  - `manual` 模式：手动触发
  - `refreshDeps`：依赖变化自动重新请求
  - `cancel`：组件卸载自动取消
- **useMutation**：手动触发的变更操作（POST/PUT/DELETE）

**Vue**：

- **useRequest**：Vue Composable，ref-based 响应式状态
  - `manual` 模式 / `refreshDeps` / 自动取消，与 React 版本语义对齐
- **useMutation**：变更操作 Composable

### 优先级

P2 — 框架集成在核心库稳定后再推进。

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

满足大型项目 / 微前端架构的需求。

### 计划功能

- 插件化架构：通过 `api.use(plugin)` 横向扩展
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

| 版本 | 主题              | 状态        |
| ---- | ----------------- | ----------- |
| v1.0 | 基础 HTTP 客户端  | ✅ 已完成   |
| v1.1 | 拦截器增强        | ✅ 已完成   |
| v1.2 | 请求/响应控制增强 | 🔜 计划中   |
| v1.3 | 高级请求特性      | 🔮 计划中   |
| v1.4 | 通用流式封装      | 🔜 方案已定 |
| v2.0 | React / Vue 集成  | 🔮 计划中   |
| v2.1 | 高级数据管理      | 🔮 计划中   |
| v3.0 | 企业级特性        | 🔮 计划中   |
