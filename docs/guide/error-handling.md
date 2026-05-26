# 错误处理

## 错误类型体系

```
FetchXError          // 基类
├── NetworkError     // ERR_NETWORK — 网络连接失败
├── TimeoutError     // ECONNABORTED — 请求超时
├── CancelError      // ERR_CANCELED — 用户取消
└── HTTPError<T>     // ERR_BAD_RESPONSE — HTTP 错误，携带 response
```

## 按错误类型处理

```typescript
import { FetchXError } from '@petite-pluie/fetchx';

try {
  await api.get('/users');
} catch (error) {
  if (error instanceof FetchXError) {
    switch (error.code) {
      case 'ERR_NETWORK':
        console.error('网络连接失败');
        break;
      case 'ECONNABORTED':
        console.error('请求超时');
        break;
      case 'ERR_CANCELED':
        console.log('请求已取消');
        break;
      case 'ERR_BAD_RESPONSE':
        console.error(`HTTP ${error.status} 错误`);
        // HTTPError 包含服务端返回的错误体
        if (isHTTPError(error)) {
          console.error(error.response.data);
        }
        break;
      case 'ERR_NOT_SUPPORTED':
        console.error('当前环境不支持此功能');
        break;
    }
  }
}
```

## 类型守卫

```typescript
import {
  isNetworkError,
  isTimeoutError,
  isCancelError,
  isHTTPError,
  isCancel,
} from '@petite-pluie/fetchx';

if (isHTTPError(error)) {
  console.log(error.response.status, error.response.data);
}

if (isCancel(error)) {
  // 忽略取消错误
  return;
}
```

## HTTPError 响应体

当 `validateStatus` 判定失败时，FetchX 会解析响应体并填充到 `HTTPError.response` 中：

```typescript
try {
  await api.post('/users', data);
} catch (error) {
  if (isHTTPError(error)) {
    // 获取服务端返回的验证错误详情
    const { data, status } = error.response;
    console.error(`[${status}]`, data);
  }
}
```
