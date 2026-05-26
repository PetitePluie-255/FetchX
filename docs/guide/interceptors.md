# 拦截器

请求和响应拦截器允许你在请求发出前或响应返回后执行自定义逻辑。

## 请求拦截器

在请求发出前修改配置（例如添加 token）：

```typescript
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  }
  return config;
});
```

## 响应拦截器

在响应返回后对数据进行预处理：

```typescript
api.interceptors.response.use(response => {
  console.log(`[${response.status}] ${response.url}`);
  return response;
});
```

## 管理拦截器

```typescript
// 添加匿名拦截器并获取 ID
const id = api.interceptors.request.use(config => config);

// 按 ID 移除
api.interceptors.request.eject(id);

// 添加命名拦截器，返回卸载函数
const unsub = api.interceptors.request.use('auth', config => config);
unsub(); // 按返回的卸载函数移除

// 按名称移除
api.interceptors.request.remove('auth');

// 清空所有拦截器
api.interceptors.request.clear();

// 查看拦截器数量
console.log(api.interceptors.request.length);
```

## 异步拦截器

```typescript
api.interceptors.request.use(async config => {
  const token = await refreshToken();
  config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});
```

## 错误恢复

后置拦截器的 reject 回调可以从前置拦截器的错误中恢复：

```typescript
api.interceptors.request.use(() => {
  throw new Error('Interceptor error');
});

api.interceptors.request.use(
  config => config,
  () => ({ url: '/fallback', method: 'GET' }) // 恢复：返回降级配置
);
```
