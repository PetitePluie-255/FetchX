# 日志插件

`@petite-pluie/fetchx-logger` 是 FetchX 官方日志插件，记录请求、响应和错误信息。

## 安装

```bash
pnpm add @petite-pluie/fetchx-logger
```

```bash
npm install @petite-pluie/fetchx-logger
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

## 格式

| 类型     | 格式                         | 示例                                         |
| -------- | ---------------------------- | -------------------------------------------- |
| 请求     | `→ METHOD path`              | `→ GET /users`                               |
| 成功响应 | `✓ status url (duration)`    | `✓ 200 https://api.example.com/users (42ms)` |
| 重定向   | `→ status url`               | `→ 301 https://api.example.com/redirect`     |
| 错误响应 | `✗ status url`               | `✗ 500 https://api.example.com/fail`         |
| 错误     | `✗ CODE method url: message` | `✗ ERR_NETWORK GET /api: Network Error`      |
