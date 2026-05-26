# 请求缓存

基于 key（method + URL + params + body）的内存缓存，支持 TTL 和 LRU 淘汰。

## 配置

```typescript
const api = createFetchX({
  cache: {
    ttl: 60000, // 缓存有效期 ms（默认 60000）
    maxSize: 100, // 最大缓存条目数（默认 100）
    methods: ['GET'], // 缓存的 HTTP 方法
  },
});
```

## 管理缓存

```typescript
// 清空全部
api.cache.clear();

// 删除指定条目
api.cache.delete('cache-key');

// 检查是否存在
api.cache.has('cache-key');

// 当前条目数
console.log(api.cache.size);
```

## 禁用缓存

```typescript
// 单次请求不使用缓存
await api.get('/users', { cache: false });

// 全局禁用
const api = createFetchX({ cache: false });
```
