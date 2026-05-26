# 请求重试

指数退避算法，可全局配置或按请求覆盖。

## 配置

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

## 退避策略

延迟 = `min(delay * 2^(attempt-1), maxDelay)`

| 尝试次数 | 延迟          |
| -------- | ------------- |
| 1        | 1000ms        |
| 2        | 2000ms        |
| 3        | 4000ms        |
| 4        | 8000ms        |
| ...      | 直到 maxDelay |

## 禁用重试

```typescript
// 单次请求不重试
await api.get('/users', { retry: false });

// 全局禁用
const api = createFetchX({ retry: false });
```
