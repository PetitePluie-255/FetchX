# 进度监听

## 下载进度

```typescript
const data = await api.get('/large-file', {
  onDownloadProgress: e => {
    console.log(`已下载: ${e.loaded} / ${e.total} (${e.percent}%)`);
  },
});
```

## 上传进度

需要运行时支持 `ReadableStream` + `duplex`。

```typescript
const result = await api.post('/upload', file, {
  onUploadProgress: e => {
    console.log(`已上传: ${e.loaded} / ${e.total} (${e.percent}%)`);
  },
});
```

## 检查上传支持

```typescript
import { isStreamingUploadSupported } from '@petite-pluie/fetchx';

if (isStreamingUploadSupported() === false) {
  console.warn('当前环境不支持上传进度跟踪');
}
```

## ProgressEvent 结构

```typescript
interface ProgressEvent {
  loaded: number; // 已传输字节数
  total: number; // 总字节数（未知时为 0）
  percent: number; // 已完成百分比（0-100）
}
```
