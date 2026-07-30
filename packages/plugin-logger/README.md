# @petite-pluie/fetchx-logger

Logger plugin for [FetchX](https://github.com/PetitePluie-255/FetchX) HTTP client.

[![npm version](https://img.shields.io/npm/v/@petite-pluie/fetchx-logger)](https://www.npmjs.com/package/@petite-pluie/fetchx-logger)
[![license](https://img.shields.io/npm/l/@petite-pluie/fetchx-logger)](LICENSE)

## 安装

```bash
pnpm add @petite-pluie/fetchx-logger
```

```bash
npm install @petite-pluie/fetchx-logger
```

```bash
yarn add @petite-pluie/fetchx-logger
```

## 使用

```typescript
import { createFetchX } from '@petite-pluie/fetchx';
import { createLoggerPlugin } from '@petite-pluie/fetchx-logger';

const api = createFetchX({ baseURL: 'https://api.example.com' });
api.use(createLoggerPlugin());
```

## 输出示例

```
→ GET /users
✓ 200 https://api.example.com/users (42ms)
```

流式请求会在自然完成、取消、连接失败或消费失败时记录终态和总耗时。

## 选项

```typescript
const logger = createLoggerPlugin({
  // 自定义日志函数（默认 console.log）
  log: (...args) => myLogger.info(...args),

  // 开关
  logRequest: true, // 记录请求
  logResponse: true, // 记录响应
  logError: true, // 记录错误
  logTiming: true, // 显示耗时

  // 过滤器
  filterRequest: (config, context) => !context.url.includes('/health'),
  filterResponse: (response, context) => response.status < 500,
  filterError: (error, context) => error.code !== 'ERR_CANCELED',
});
```

## License

MIT
