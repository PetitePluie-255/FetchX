# 防抖与节流

独立的工具函数，可包装任意异步请求方法。

## 防抖

连续调用只有最后一次生效：

```typescript
import { debounceRequest } from '@petite-pluie/fetchx';

const search = debounceRequest(api.get, 300);

// 连续调用只有最后一次实际发出请求
search('/search?q=a');
search('/search?q=ab');
search('/search?q=abc'); // ← 只有这个会实际发出
```

## 节流

固定时间窗口内只执行一次：

```typescript
import { throttleRequest } from '@petite-pluie/fetchx';

const scroll = throttleRequest(api.get, 500);

// 每 500ms 最多触发一次
window.addEventListener('scroll', () => {
  scroll('/log', { params: { offset } });
});
```

## 类型签名

```typescript
function debounceRequest<T extends (...args: never[]) => unknown>(
  fn: T,
  wait: number,
  options?: { leading?: boolean; trailing?: boolean }
): T;

function throttleRequest<T extends (...args: never[]) => unknown>(
  fn: T,
  wait: number,
  options?: { leading?: boolean; trailing?: boolean }
): T;
```
