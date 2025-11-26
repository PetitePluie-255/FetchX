# FetchX

[![npm version](https://img.shields.io/npm/v/@petite-pluie/fetchx.svg)](https://www.npmjs.com/package/@petite-pluie/fetchx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

基于原生 fetch API 构建的现代化、轻量级 HTTP 客户端库，提供类似 axios 的接口。完美适用于需要可靠、类型安全的 HTTP 客户端的 TypeScript 项目。

## ✨ 特性

- 🚀 **现代化**: 基于原生 fetch API，无外部依赖
- 🔄 **Axios 兼容**: 从 axios 轻松迁移，熟悉的 API
- 🛡️ **类型安全**: 完整的 TypeScript 支持，全面的类型定义
- 🔧 **拦截器**: 强大的请求/响应拦截器系统
- ⏱️ **超时控制**: 基于 AbortController 的内置超时
- 📦 **轻量级**: 零运行时依赖，最小化包体积
- 🎯 **错误处理**: 一致的错误处理，详细的错误信息
- 🔄 **自动序列化**: 自动 JSON 序列化和响应解析

## 📦 安装

```bash
# 使用 pnpm（推荐）
pnpm add @petite-pluie/fetchx

# 使用 npm
npm install @petite-pluie/fetchx

# 使用 yarn
yarn add @petite-pluie/fetchx
```

## 🚀 快速开始

```typescript
import { createFetchX } from '@petite-pluie/fetchx';

// 创建带配置的实例
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 使用完整的 TypeScript 支持发起请求
interface User {
  id: number;
  name: string;
  email: string;
}

const users = await api.get<User[]>('/users');
const newUser = await api.post<User>('/users', {
  name: '张三',
  email: 'zhangsan@example.com',
});
```

## 📖 基础用法

### 创建实例

```typescript
import { createFetchX } from '@petite-pluie/fetchx';

const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0',
  },
  credentials: 'include', // 在请求中包含 cookies
});
```

### 发起请求

```typescript
// GET 请求
const users = await api.get('/users');

// 带查询参数的 GET 请求
const filteredUsers = await api.get('/users', {
  params: { page: 1, limit: 10, status: 'active' },
});

// 带请求体的 POST 请求
const newUser = await api.post('/users', {
  name: '李四',
  email: 'lisi@example.com',
});

// PUT 请求
const updatedUser = await api.put('/users/123', {
  name: '李四（更新）',
});

// DELETE 请求
await api.delete('/users/123');

// PATCH 请求
const patchedUser = await api.patch('/users/123', {
  status: 'inactive',
});
```

## 🔧 拦截器

拦截器允许你全局转换请求和响应。

### 请求拦截器

```typescript
// 为所有请求添加认证令牌
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 添加请求时间戳
api.interceptors.request.use(config => {
  config.headers['X-Request-Time'] = new Date().toISOString();
  return config;
});
```

### 响应拦截器

```typescript
// 处理认证错误
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 重定向到登录页面
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 转换响应数据
api.interceptors.response.use(response => {
  // 自定义响应转换
  return response;
});
```

### 移除拦截器

```typescript
// 添加拦截器并获取其 ID
const requestId = api.interceptors.request.use(config => {
  config.headers['X-Custom'] = 'value';
  return config;
});

// 移除拦截器
api.interceptors.request.eject(requestId);
```

## ⚙️ 配置

### FetchXConfig

```typescript
interface FetchXConfig {
  baseURL?: string; // 所有请求的基础 URL
  timeout?: number; // 请求超时时间（毫秒）（0 = 无超时）
  headers?: Record<string, string>; // 默认请求头
  credentials?: RequestCredentials; // 凭证模式 ('omit' | 'same-origin' | 'include')
}
```

### RequestOptions

```typescript
interface RequestOptions {
  url?: string; // 请求 URL（相对于 baseURL）
  params?: Record<string, any>; // 查询参数
  body?: any; // 请求体
  method?: string; // HTTP 方法
  signal?: AbortSignal; // 用于请求取消的 AbortSignal
  headers?: Record<string, string>; // 请求特定的请求头
  timeout?: number; // 请求特定的超时时间
  credentials?: RequestCredentials; // 请求特定的凭证
}
```

## 🎯 API 参考

### createFetchX(config?)

使用可选配置创建新的 FetchX 实例。

**参数:**

- `config?: FetchXConfig` - 可选的配置对象

**返回:** `FetchXInstance`

### 实例方法

#### GET 请求

```typescript
get<T = any>(url: string, options?: RequestOptions): Promise<T>
```

#### POST 请求

```typescript
post<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>
```

#### PUT 请求

```typescript
put<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>
```

#### DELETE 请求

```typescript
delete<T = any>(url: string, options?: RequestOptions): Promise<T>
```

#### PATCH 请求

```typescript
patch<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>
```

#### HEAD 请求

```typescript
head<T = any>(url: string, options?: RequestOptions): Promise<T>
```

## 🚨 错误处理

FetchX 提供一致的错误处理，包含详细的错误信息。

```typescript
try {
  const data = await api.get('/users');
} catch (error) {
  if (error.isAxiosError) {
    console.log('错误配置:', error.config);
    console.log('错误代码:', error.code);
    console.log('错误消息:', error.message);

    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', error.response.data);
    }
  }
}
```

### 错误类型

- **网络错误**: `ERR_NETWORK` - 网络连接问题
- **超时错误**: `ECONNABORTED` - 请求超时
- **HTTP 错误**: `ERR_BAD_RESPONSE` - 非 2xx HTTP 状态码
- **中止错误**: `ERR_CANCELED` - 请求被中止

## 💡 高级用法

### 请求取消

```typescript
// 创建用于请求取消的 AbortController
const controller = new AbortController();

// 使用中止信号发起请求
const promise = api.get('/users', {
  signal: controller.signal,
});

// 取消请求
controller.abort();

try {
  const data = await promise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('请求已取消');
  }
}
```

### 自定义请求头

```typescript
// 全局请求头
const api = createFetchX({
  headers: {
    'X-API-Key': 'your-api-key',
    'User-Agent': 'MyApp/1.0',
  },
});

// 请求特定的请求头
const data = await api.get('/users', {
  headers: {
    'X-Custom-Header': 'custom-value',
  },
});
```

### 文件上传

```typescript
// 使用 FormData 上传文件
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', '我的文件');

const result = await api.post('/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
```

### TypeScript 集成

```typescript
// 定义 API 响应类型
interface ApiResponse<T> {
  data: T;
  message: string;
  status: 'success' | 'error';
}

interface User {
  id: number;
  name: string;
  email: string;
}

// 使用类型安全
const response = await api.get<ApiResponse<User[]>>('/users');
const users = response.data; // TypeScript 知道这是 User[]
```

## 🔄 从 Axios 迁移

FetchX 设计为在大多数情况下可以直接替代 axios：

```typescript
// 之前 (axios)
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

// 之后 (FetchX)
import { createFetchX } from '@petite-pluie/fetchx';

const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

// API 使用方式保持不变
const data = await api.get('/users');
```

### 主要差异

- **响应格式**: FetchX 直接返回解析后的数据，不包装在 `data` 属性中
- **错误处理**: 错误直接抛出，不包装在响应对象中
- **拦截器**: 拦截器 API 略有不同（见上述文档）

## 🧪 测试

```typescript
import { createFetchX } from '@petite-pluie/fetchx';

// 为测试模拟 fetch
global.fetch = jest.fn();

const api = createFetchX({
  baseURL: 'https://api.example.com',
});

test('应该发起 GET 请求', async () => {
  const mockData = { id: 1, name: '张三' };

  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(mockData),
  });

  const result = await api.get('/users/1');
  expect(result).toEqual(mockData);
});
```

## 🚀 性能

- **零依赖**: 无外部运行时依赖
- **Tree Shaking**: 完整的 ES 模块支持，优化包体积
- **原生 Fetch**: 利用浏览器优化的 fetch 实现
- **TypeScript**: 编译时优化和类型安全

## 🤝 贡献

我们欢迎贡献！详情请参阅我们的[贡献指南](CONTRIBUTING.md)。

### Git 提交规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。我们使用以下工具确保提交质量：

- **commitizen**: 交互式提交信息生成
- **cz-git**: 中文友好的 commitizen 适配器
- **husky**: Git 钩子管理
- **lint-staged**: 暂存文件检查
- **@commitlint**: 提交信息验证

#### 快速开始

```bash
# 使用交互式提交（推荐）
pnpm commit

# 或直接使用 git commit
git commit -m "feat(core): 添加请求拦截器支持"
```

#### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**作用域**: `core`, `interceptors`, `utils`, `types`, `docs`, `tests`, `config`, `deps`

详细信息请参阅我们的 [Git 提交指南](docs/GIT_COMMIT_GUIDE.md)。

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/PetitePluie-255/FetchX.git
cd FetchX

# 安装依赖
pnpm install

# 运行测试
pnpm test

# 监视模式运行测试
pnpm test:watch

# 构建项目
pnpm build

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 类型检查
pnpm type-check
```

## 📄 许可证

MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 感谢 [axios](https://github.com/axios/axios) 提供的优秀 API 设计灵感
- 基于现代化的 [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) 构建
- 由 [TypeScript](https://www.typescriptlang.org/) 提供类型安全支持

---

## 🌐 语言

- [English](README.en.md)
- [中文](README.zh.md) (当前)
