# 快速开始

## 安装

```bash
pnpm add @petite-pluie/fetchx
```

```bash
npm install @petite-pluie/fetchx
```

```bash
yarn add @petite-pluie/fetchx
```

## 创建实例

```typescript
import { createFetchX } from '@petite-pluie/fetchx';

const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});
```

### 全局配置

| 配置项           | 说明                                           |
| ---------------- | ---------------------------------------------- |
| `baseURL`        | 基础 URL，所有请求路径相对于此                 |
| `timeout`        | 请求超时时间 (ms)，`0` 表示不超时              |
| `headers`        | 默认请求头（合并到每次请求）                   |
| `credentials`    | 凭证模式（`same-origin` / `include` / `omit`） |
| `validateStatus` | 自定义成功状态码判定                           |
| `responseType`   | 默认响应解析类型                               |
| `dedupe`         | 是否启用请求去重                               |
| `cache`          | 请求缓存配置                                   |
| `retry`          | 请求重试配置                                   |
| `maxConcurrency` | 最大并发请求数                                 |
| `sanitizeConfig` | 脱敏 config.headers                            |

## 第一个请求

```typescript
// GET 请求
const { data: users } = await api.get('/users');
console.log(users);

// POST 请求（自动 JSON 序列化）
const { data: newUser } = await api.post('/users', {
  name: 'John',
  email: 'john@example.com',
});
```

## TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// 指定响应类型
const { data: user } = await api.get<User>('/users/1');
// user: User

const { data: users } = await api.get<User[]>('/users');
// users: User[]

// 访问响应元数据
const result = await api.get<User>('/users/1');
console.log(result.status, result.headers, result.config);
```
