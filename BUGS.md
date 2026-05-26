# FetchX 核心漏洞 & 改进跟踪

本文档记录 FetchX 已知缺陷、设计缺口和改进计划，按版本组织。

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

## 非流式现存缺陷（v1.0 ~ v1.3）— 全部修复

> 审计时间：v1.3 完成后。所有问题已在 v1.5 ~ v2.0 修复。

### 已确认 Bug

#### B1 — FormData body 被默认 Content-Type 破坏（高）

- **文件**：`packages/fetchx/src/FetchX.ts`
- **状态**：✅ v1.5 修复 — FormData body 时自动移除 Content-Type 头

#### B2 — URLSearchParams body 被 JSON.stringify 为 `{}`（中）

- **文件**：`packages/fetchx/src/utils.ts`
- **状态**：✅ v1.5 修复 — `serializeBody` 增加 `URLSearchParams` 分支

#### B3 — HEAD/204 + responseType:'json' 抛原生 SyntaxError（中）

- **文件**：`packages/fetchx/src/utils.ts`
- **状态**：✅ v1.5 修复 — 空 body 的 `response.json()` 降级处理

### 设计缺口

#### D1 — 响应仅返回 `T`，不返回 `FetchXResponse<T>`

- **文件**：`packages/fetchx/src/FetchX.ts`
- **状态**：✅ v1.5 修复 — 响应统一返回 `FetchXResponse<T>`（data + status/headers）

#### D2 — Content-Type 自动检测大小写敏感（低）

- **文件**：`packages/fetchx/src/utils.ts`
- **状态**：✅ v2.0 修复 — `contentType.toLowerCase().includes(...)`

#### D3 — formData() 解析不支持旧环境（低）

- **文件**：`packages/fetchx/src/utils.ts`
- **状态**：✅ v2.0 修复 — try-catch 降级到 `response.blob()`

### 技术债

#### T1 — FetchXStream abort 信号链路不闭环（低）

- **文件**：`packages/fetchx/src/stream.ts` + `packages/fetchx/src/FetchX.ts`
- **状态**：✅ v2.0 修复 — `FetchXStream` 接受外部 `AbortSignal`，双向绑定

#### T2 — FetchXError.response 从未填充（低）

- **文件**：`packages/fetchx/src/types.ts` + `packages/fetchx/src/FetchX.ts`
- **状态**：✅ v1.5 已修复 — `validateStatus` 失败时 parse body 并传入 `HTTPError.response`
