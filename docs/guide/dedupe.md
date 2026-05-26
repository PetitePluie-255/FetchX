# 请求去重

启用后，相同 method + URL + params 的重复请求会自动取消前一个未完成的请求，只保留最后一个。

## 配置

```typescript
const api = createFetchX({ dedupe: true });

// 以下只有第二个请求会执行，第一个自动取消
api.get('/users?page=1');
api.get('/users?page=1'); // ← 这个请求会执行
```

适用于搜索输入、自动保存等场景。
