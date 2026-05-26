# 取消请求

## 使用 AbortController

```typescript
const controller = new AbortController();

api.get('/slow-endpoint', { signal: controller.signal }).catch(error => {
  if (isCancel(error)) {
    console.log('请求已取消');
  }
});

// 取消请求
controller.abort();
```

## 判断取消错误

```typescript
import { isCancel } from '@petite-pluie/fetchx';

try {
  await api.get('/users');
} catch (error) {
  if (isCancel(error)) {
    // 忽略取消错误，不做错误提示
    return;
  }
  // 处理其他错误
  showError(error.message);
}
```

`isCancel()` 兼容 `CancelError`、原生 `AbortError` 和 `ERR_CANCELED` 三种形式。
