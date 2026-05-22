# FetchX 核心漏洞 & 改进跟踪

本文档记录 FetchX 当前版本中的已知缺陷、设计缺口和改进计划，按版本组织。

---

## v1.4 流式方案评估（计划阶段审查）

> 评估时间：v1.3 完成后，v1.4 实施前。目的：在编码前识别方案遗漏。

### 已纳入 v1.4 方案的补充

| #   | 补充项                   | 说明                                                      |
| --- | ------------------------ | --------------------------------------------------------- |
| 1   | `responseType: 'stream'` | 与现有 API 一致的原始 ReadableStream 访问，不消费 body    |
| 2   | POST body 支持           | SSE 默认 POST，`api.sse('/chat', { body: { messages } })` |
| 3   | 流式请求 HTTP 错误处理   | 不抛异常，返回流让用户检查 `stream.response.status`       |
| 4   | 响应暴露 `id`/`retry`    | 供上层自行实现 SSE 重连                                   |
| 5   | 跳过响应拦截器           | 避免拦截器意外消费 body                                   |
| 6   | `.abort()` 清理语义      | 文档明确 reader 释放和 response 可读性                    |
| 7   | 背压策略                 | AsyncIterable 天然背压，不做 buffer 上限                  |

### 暂不纳入的决策

| 决策                     | 理由                                        |
| ------------------------ | ------------------------------------------- |
| 不内置 SSE 自动重连      | AI chat 场景重连无意义，`id`/`retry` 已暴露 |
| 不支持 `.tee()` 多路消费 | 需求频率低，可插件扩展                      |
| 流式方法不走响应拦截器   | 避免拦截器消费 body                         |

---

## 非流式现存缺陷（v1.0 ~ v1.3）

> 审计时间：v1.3 完成后。目的：识别运行时缺陷。

### 已确认 Bug

#### B1 — FormData body 被默认 Content-Type 破坏（高）

- **文件**：`src/FetchX.ts:239` + `src/FetchX.ts:79`
- **原因**：实例默认 `Content-Type: application/json` 通过 `new Headers(...)` 传入 fetch。浏览器只在 Content-Type **未设置**时才为 FormData 自动追加 `multipart/form-data; boundary=...`
- **影响**：所有 `api.post(url, formData)` 请求的 Content-Type 为 `application/json`，服务端无法解析
- **复现**：`createFetchX().post('/upload', new FormData())`
- **临时绕过**：`api.post('/upload', fd, { headers: {} })` 或通过请求拦截器清空 Content-Type

#### B2 — URLSearchParams body 被 JSON.stringify 为 `{}`（中）

- **文件**：`src/utils.ts:60-79` (`serializeBody`)
- **原因**：`URLSearchParams instanceof` 不匹配 FormData/Blob/ArrayBuffer，`typeof` 为 `'object'`，落入 `JSON.stringify` → 输出 `{}`
- **影响**：`application/x-www-form-urlencoded` POST 场景完全不可用
- **复现**：`api.post('/login', new URLSearchParams({ user: 'a', pass: 'b' }))`

#### B3 — HEAD/204 + responseType:'json' 抛原生 SyntaxError（中）

- **文件**：`src/utils.ts:137` (`parseResponse`, `response.json()`)
- **原因**：空 body 调用 `response.json()` 时浏览器抛出 `SyntaxError`，未被包裹为 `FetchXError`
- **影响**：HEAD 请求配置 `responseType: 'json'` 时报错无结构化信息
- **复现**：`api.head('/resource', { responseType: 'json' })`

### 设计缺口

#### D1 — 响应仅返回 `T`，不返回 `FetchXResponse<T>`

- **文件**：`src/FetchX.ts:360` + `src/types.ts:116-122`
- **现状**：`api.get<User>()` 返回裸 `User` 对象。`buildFetchXResponse` 工具函数存在但从未调用（死代码）
- **影响**：用户无法访问 `status`/`headers`/`statusText`。与 axios `{ data, status, headers }` 风格不一致
- **备选方案**：
  - A) 保持现状，简洁优先
  - B) 返回 `FetchXResponse<T>`，对齐 axios
  - C) 返回 `T` 但通过第二个参数/拦截器暴露 metadata

#### D2 — Content-Type 自动检测大小写敏感（低）

- **文件**：`src/utils.ts:151-165`
- **现状**：`contentType.includes('application/json')` 是大小写敏感的。如果服务端返回 `Application/Json` 会 fallthrough 到 blob
- **影响**：极低概率，HTTP 规范推荐小写 media type

#### D3 — formData() 解析不支持旧环境（低）

- **文件**：`src/utils.ts:161`
- **现状**：`response.formData()` 在某些旧 Node.js fetch 实现中不可用
- **影响**：旧环境无降级方案

---

## v1.5 — 核心缺陷修复 🔜 计划中

### 目标

修复非流式现存 bug，补齐 TypeScript 类型安全与 API 完整性。

### 计划修复

- **B1**：FormData body 时自动移除 Content-Type 头
- **B2**：`serializeBody` 增加 `URLSearchParams` 分支
- **B3**：`parseResponse` 对空 body 的 `response.json()` 降级处理
- **D1**：响应返回 `FetchXResponse<T>`（数据 + status/headers）→ 需确认方案
- 清理 `buildFetchXResponse` 死代码（如采用 D1 修复则激活，否则删除）

### 优先级

P0 — 修复已确认 Bug 是发布的前置条件。D1 方案需单独确认。
