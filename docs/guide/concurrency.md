# 并发控制

限制同时发起的请求数量，超过上限的请求进入 FIFO 队列。

## 配置

```typescript
const api = createFetchX({ maxConcurrency: 5 });

// 以下 10 个请求最多同时执行 5 个，其余排队
for (let i = 0; i < 10; i++) {
  api.get(`/items/${i}`);
}
```

`maxConcurrency: 0` 表示不限制并发（默认）。
