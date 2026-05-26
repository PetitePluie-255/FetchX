# 基础用法

## HTTP 方法

```typescript
// GET
const { data } = await api.get('/users');

// GET 带查询参数
const { data } = await api.get('/users', {
  params: { page: 1, limit: 10 },
});

// POST
const { data } = await api.post('/users', {
  name: 'John',
  email: 'john@example.com',
});

// PUT
const { data } = await api.put('/users/1', {
  name: 'John Updated',
});

// PATCH
const { data } = await api.patch('/users/1', {
  status: 'active',
});

// DELETE
await api.delete('/users/1');

// HEAD
await api.head('/users');
```

## 通用请求方法

```typescript
const { data } = await api.request({
  method: 'POST',
  url: '/users',
  body: { name: 'John' },
  params: { sync: true },
});
```

适合需要动态 method 的场景。

## 查询参数

支持嵌套对象序列化：

```typescript
// { filter: { status: 'active' } } → filter[status]=active
const { data } = await api.get('/users', {
  params: {
    filter: { status: 'active' },
    sort: ['createdAt', 'name'],
  },
});
```

自定义参数序列化：

```typescript
const { data } = await api.get('/users', {
  params: { ids: [1, 2, 3] },
  paramsSerializer: params => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      search.append(key, JSON.stringify(value));
    }
    return search.toString();
  },
});
```

## 请求体

支持多种类型，自动处理 Content-Type：

```typescript
// JSON（默认）
api.post('/users', { name: 'John' });

// FormData（自动移除 Content-Type 让浏览器设置 boundary）
const fd = new FormData();
fd.append('file', file);
api.post('/upload', fd);

// URLSearchParams
api.post('/login', new URLSearchParams({ user: 'a', pass: 'b' }));

// 原始字符串
api.post('/text', 'raw string');

// Blob / ArrayBuffer
api.post('/binary', blob);
```

## 响应结构

所有请求返回 `FetchXResponse<T>`：

```typescript
interface FetchXResponse<T = unknown> {
  data: T; // 解析后的响应体
  status: number; // HTTP 状态码
  statusText: string; // 状态文本
  headers: Headers; // 响应头
  config: RequestOptions; // 请求配置
}
```

### 响应类型解析

默认根据 Content-Type 自动解析：

| Content-Type          | 解析方式    |
| --------------------- | ----------- |
| `application/json`    | JSON 到对象 |
| `text/*`              | 文本字符串  |
| `multipart/form-data` | FormData    |
| 其他                  | Blob        |

强制指定解析类型：

```typescript
// 以文本形式获取 JSON 响应
const text = await api.get('/api.json', { responseType: 'text' });

// 以 ArrayBuffer 获取二进制数据
const buffer = await api.get('/file', { responseType: 'arrayBuffer' });

// 获取原始 ReadableStream
const stream = await api.get('/large-file', { responseType: 'stream' });
```

## 自定义请求头

```typescript
// 全局默认头
const api = createFetchX({
  headers: {
    'X-App-Version': '1.0.0',
  },
});

// 单次请求覆盖
await api.get('/users', {
  headers: {
    Authorization: 'Bearer token123',
    'X-Request-ID': 'abc-123',
  },
});
```

## 超时控制

```typescript
// 全局超时
const api = createFetchX({ timeout: 5000 });

// 单次请求覆盖
await api.get('/slow-endpoint', { timeout: 15000 });

// 不超时
await api.get('/stream', { timeout: 0 });
```

## 验证状态码

默认 2xx 视为成功。可自定义：

```typescript
// 全局配置
const api = createFetchX({
  validateStatus: status => status < 500,
});

// 单次请求覆盖
await api.get('/data', {
  validateStatus: status => status === 200 || status === 304,
});
```
