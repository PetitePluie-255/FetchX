# 流式请求

FetchX 提供三种流式请求方法，均返回 `FetchXStream<T>`，支持 `for await...of` 消费。

## SSE（Server-Sent Events）

```typescript
// AI Chat 流式调用（默认 POST + JSON body）
const stream = api.sse('/chat/completions', {
  body: { model: 'gpt-4', messages: [...] },
  connectTimeout: 30_000,
  idleTimeout: 60_000,
});

for await (const event of stream) {
  // event: { data, event?, id?, retry? }
  if (event.data === '[DONE]') break;
  const chunk = JSON.parse(event.data);
  console.log(chunk);
}
```

默认情况下，`validateStatus` 判定失败会抛出 `HTTPError`，错误响应体位于
`error.response.data`。如需自行处理原始错误响应，可关闭自动抛错；响应体在开始
迭代前不会被锁定：

```typescript
const stream = await api.sse('/chat/completions', {
  throwHttpErrors: false,
});

if (!stream.response.ok) {
  const detail = await stream.response.json();
  throw new Error(detail.message);
}
```

`connectTimeout` 只覆盖等待响应头的阶段，未配置时沿用 `timeout`。
`idleTimeout` 从开始迭代后生效，每收到一个数据块重新计时。超时时抛出的
`TimeoutError.phase` 分别为 `connect` 或 `idle`。

### SSEEvent

```typescript
interface SSEEvent {
  data: string; // 事件数据
  event?: string; // 事件类型，默认 "message"
  id?: string; // 最后事件 ID，用于重连
  retry?: number; // 重连时间 (ms)
}
```

## NDJSON（Newline-Delimited JSON）

```typescript
const stream = api.ndjson<LogEntry>('/logs/stream');

for await (const entry of stream) {
  console.log(entry.timestamp, entry.message);
}
```

## 原始流（Uint8Array）

```typescript
const stream = api.stream('/download');

const decoder = new TextDecoder();
for await (const chunk of stream) {
  // chunk: Uint8Array
  console.log(decoder.decode(chunk, { stream: true }));
}
```

## responseType: 'stream'

通过标准 API 获取原始 ReadableStream，正常走请求拦截器：

```typescript
const result = await api.get('/large-file', { responseType: 'stream' });
const reader = (result.data as ReadableStream<Uint8Array>).getReader();
```

## FetchXStream API

| 属性/方法         | 说明                                      |
| ----------------- | ----------------------------------------- |
| `stream.response` | 原始 `Response` 对象（status/headers/ok） |
| `stream.meta`     | 结构化的 `FetchXResponse` 包装            |
| `stream.abort()`  | 取消流，自动释放 reader                   |
| `for await...of`  | 异步迭代消费                              |

> **注意**：流式请求不走响应拦截器（避免拦截器消费 body），但请求拦截器正常执行。
> 不支持缓存/重试/去重。平台特定的数据结构仍应由上层业务解析。
