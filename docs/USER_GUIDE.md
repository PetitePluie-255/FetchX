# FetchX 使用指南

欢迎使用 FetchX！本指南将帮助你快速上手并掌握 FetchX 的所有功能。

## 📋 目录

- [简介](#简介)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [基础使用](#基础使用)
- [进阶特性](#进阶特性)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)
- [迁移指南](#迁移指南)

---

## 简介

### 什么是 FetchX？

FetchX 是一个现代化的 HTTP 客户端库，它：

- ✅ **基于原生 fetch API** - 零外部依赖，轻量高效
- ✅ **类 axios 接口** - 熟悉的 API 设计，低迁移成本
- ✅ **完整的 TypeScript 支持** - 类型安全，开发体验好
- ✅ **强大的拦截器系统** - 灵活的请求/响应处理
- ✅ **超时控制** - 基于 AbortController 的标准实现
- ✅ **轻量级** - 打包体积小，性能优异

### 为什么选择 FetchX？

| 特性                | FetchX | Axios | 原生 Fetch |
| ------------------- | ------ | ----- | ---------- |
| TypeScript 原生支持 | ✅     | ⚠️    | ✅         |
| 零运行时依赖        | ✅     | ❌    | ✅         |
| 拦截器系统          | ✅     | ✅    | ❌         |
| 超时控制            | ✅     | ✅    | ⚠️         |
| 自动 JSON 转换      | ✅     | ✅    | ❌         |
| 请求取消            | ✅     | ✅    | ✅         |
| 包体积              | 小     | 大    | 0          |

---

## 快速开始

### 安装

```bash
# 使用 pnpm（推荐）
pnpm add @petite-pluie/fetchx

# 使用 npm
npm install @petite-pluie/fetchx

# 使用 yarn
yarn add @petite-pluie/fetchx
```

### 第一个请求

```typescript
import { createFetchX } from '@petite-pluie/fetchx';

// 1. 创建实例
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

// 2. 发起请求
const users = await api.get('/users');
console.log(users);
```

### TypeScript 使用

```typescript
// 定义数据类型
interface User {
  id: number;
  name: string;
  email: string;
}

// 类型安全的请求
const users = await api.get<User[]>('/users');
// TypeScript 知道 users 是 User[] 类型

const newUser = await api.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});
// TypeScript 知道 newUser 是 User 类型
```

---

## 核心概念

### 1. 实例创建

FetchX 使用工厂函数创建实例，每个实例都有独立的配置和拦截器。

```typescript
// 创建默认实例
const api = createFetchX();

// 创建带配置的实例
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**为什么使用实例？**

- 不同的 API 可以有不同的配置
- 每个实例有独立的拦截器
- 便于测试和 Mock

```typescript
// 示例：多个 API 实例
const userAPI = createFetchX({
  baseURL: 'https://user-api.example.com',
});

const paymentAPI = createFetchX({
  baseURL: 'https://payment-api.example.com',
  timeout: 30000, // 支付 API 超时时间更长
});
```

### 2. 请求方法

FetchX 提供 6 种 HTTP 方法：

```typescript
// GET - 获取数据
const users = await api.get('/users');
const user = await api.get('/users/123');

// POST - 创建数据
const newUser = await api.post('/users', {
  name: 'John',
  email: 'john@example.com',
});

// PUT - 更新数据（完整更新）
const updated = await api.put('/users/123', {
  name: 'John Smith',
  email: 'john.smith@example.com',
});

// PATCH - 更新数据（部分更新）
const patched = await api.patch('/users/123', {
  name: 'John Smith', // 只更新名字
});

// DELETE - 删除数据
await api.delete('/users/123');

// HEAD - 获取响应头（不返回数据）
const headers = await api.head('/users/123');
```

### 3. 配置选项

#### 全局配置（FetchXConfig）

```typescript
interface FetchXConfig {
  baseURL?: string; // 基础 URL
  timeout?: number; // 超时时间（毫秒）
  headers?: Record<string, string>; // 默认请求头
  credentials?: RequestCredentials; // 凭证模式
}

const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0',
  },
  credentials: 'include', // 'omit' | 'same-origin' | 'include'
});
```

#### 请求配置（RequestOptions）

```typescript
interface RequestOptions {
  url?: string; // 请求 URL
  method?: string; // HTTP 方法
  params?: Record<string, unknown>; // 查询参数
  body?: unknown; // 请求体
  headers?: Record<string, string>; // 请求头
  timeout?: number; // 超时时间
  signal?: AbortSignal; // 取消信号
  credentials?: RequestCredentials;
}

// 请求级别的配置会覆盖全局配置
const users = await api.get('/users', {
  params: { page: 1, limit: 10 },
  headers: { 'X-Custom': 'value' },
  timeout: 3000, // 覆盖全局的 5000
});
```

### 4. 拦截器

拦截器允许你在请求发送前或响应返回后执行自定义逻辑。

```typescript
// 请求拦截器
api.interceptors.request.use(
  config => {
    // 在发送请求前做些什么
    config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  error => {
    // 处理请求错误
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    // 对响应数据做些什么
    return response;
  },
  error => {
    // 处理响应错误
    if (error.response?.status === 401) {
      // 跳转到登录页
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**拦截器执行顺序：**

```
请求流程：
请求拦截器 1 → 请求拦截器 2 → 发送请求 → 响应拦截器 1 → 响应拦截器 2

添加顺序即执行顺序（先进先出）
```

### 5. 错误处理

FetchX 提供统一的错误对象：

```typescript
interface FetchXError extends Error {
  config?: RequestOptions; // 请求配置
  code?: string; // 错误代码
  request?: unknown; // 请求对象
  response?: FetchXResponse; // 响应对象
  isAxiosError?: boolean; // 标识为 axios 风格错误
}
```

**错误类型：**

| 错误码             | 描述      | 触发条件      |
| ------------------ | --------- | ------------- |
| `ERR_NETWORK`      | 网络错误  | 网络连接失败  |
| `ECONNABORTED`     | 超时错误  | 请求超时      |
| `ERR_BAD_RESPONSE` | HTTP 错误 | 非 2xx 状态码 |
| `ERR_CANCELED`     | 取消错误  | 请求被取消    |

```typescript
try {
  const data = await api.get('/users');
} catch (error) {
  if (error.isAxiosError) {
    console.log('错误代码:', error.code);
    console.log('错误消息:', error.message);

    if (error.response) {
      // 服务器响应了错误状态码
      console.log('状态码:', error.response.status);
      console.log('响应数据:', error.response.data);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.log('网络错误');
    } else {
      // 请求配置出错
      console.log('配置错误');
    }
  }
}
```

---

## 基础使用

### 1. CRUD 操作

#### 获取数据（Read）

```typescript
// 获取列表
const users = await api.get('/users');

// 获取单个资源
const user = await api.get('/users/123');

// 带查询参数
const users = await api.get('/users', {
  params: {
    page: 1,
    limit: 10,
    sort: 'created_at',
    order: 'desc',
  },
});
// 实际请求：GET /users?page=1&limit=10&sort=created_at&order=desc
```

#### 创建数据（Create）

```typescript
const newUser = await api.post('/users', {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
});
```

#### 更新数据（Update）

```typescript
// 完整更新（PUT）
const updatedUser = await api.put('/users/123', {
  name: 'John Smith',
  email: 'john.smith@example.com',
  age: 31,
});

// 部分更新（PATCH）
const patchedUser = await api.patch('/users/123', {
  age: 31, // 只更新年龄
});
```

#### 删除数据（Delete）

```typescript
await api.delete('/users/123');
```

### 2. 查询参数

```typescript
// 简单参数
const users = await api.get('/users', {
  params: { active: true },
});
// GET /users?active=true

// 多个参数
const users = await api.get('/users', {
  params: {
    page: 1,
    limit: 10,
    status: 'active',
    role: 'admin',
  },
});
// GET /users?page=1&limit=10&status=active&role=admin

// 数组参数
const users = await api.get('/users', {
  params: {
    ids: [1, 2, 3],
  },
});
// GET /users?ids=1&ids=2&ids=3
```

### 3. 请求头

```typescript
// 全局请求头
const api = createFetchX({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0',
  },
});

// 请求级别的请求头
const users = await api.get('/users', {
  headers: {
    'X-Custom-Header': 'custom-value',
    Authorization: 'Bearer token123',
  },
});

// 动态设置请求头（使用拦截器）
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
```

### 4. 超时控制

```typescript
// 全局超时
const api = createFetchX({
  timeout: 5000, // 5 秒
});

// 请求级别的超时
const users = await api.get('/users', {
  timeout: 3000, // 覆盖全局配置
});

// 禁用超时
const data = await api.get('/long-request', {
  timeout: 0, // 0 表示无超时
});
```

### 5. 请求取消

```typescript
// 创建 AbortController
const controller = new AbortController();

// 发起请求
const promise = api.get('/users', {
  signal: controller.signal,
});

// 取消请求（例如在用户导航离开时）
controller.abort();

// 处理取消
try {
  const data = await promise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('请求已取消');
  }
}
```

**实际应用场景：**

```typescript
// React 组件示例
import { useEffect, useRef } from 'react';

function UserList() {
  const abortControllerRef = useRef<AbortController>();

  useEffect(() => {
    const fetchUsers = async () => {
      abortControllerRef.current = new AbortController();

      try {
        const users = await api.get('/users', {
          signal: abortControllerRef.current.signal,
        });
        // 处理数据
      } catch (error) {
        if (error.name !== 'AbortError') {
          // 处理其他错误
        }
      }
    };

    fetchUsers();

    // 清理函数：组件卸载时取消请求
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return <div>User List</div>;
}
```

---

## 进阶特性

### 1. 认证和授权

#### JWT Token 认证

```typescript
// 方法 1：在实例创建时设置
const api = createFetchX({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// 方法 2：使用请求拦截器（推荐）
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 登录流程
async function login(username: string, password: string) {
  const response = await api.post('/auth/login', {
    username,
    password,
  });

  const { token } = response;
  localStorage.setItem('authToken', token);

  return response;
}

// 登出流程
function logout() {
  localStorage.removeItem('authToken');
  window.location.href = '/login';
}
```

#### Token 自动刷新

```typescript
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(null);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // 如果响应是 401 且不是重试请求
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 如果正在刷新，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api.request(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await api.post('/auth/refresh', {
          refreshToken,
        });

        const { accessToken } = response;
        localStorage.setItem('accessToken', accessToken);

        // 更新请求头
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

        processQueue();
        return api.request(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

#### API Key 认证

```typescript
const api = createFetchX({
  baseURL: 'https://api.example.com',
  headers: {
    'X-API-Key': process.env.API_KEY,
  },
});

// 或者使用拦截器
api.interceptors.request.use(config => {
  config.headers['X-API-Key'] = process.env.API_KEY;
  return config;
});
```

### 2. 文件上传

#### 单文件上传

```typescript
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('description', 'My file');

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response;
}

// 使用示例
const fileInput = document.querySelector<HTMLInputElement>('#file-input');
fileInput?.addEventListener('change', async event => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const result = await uploadFile(file);
    console.log('上传成功:', result);
  }
});
```

#### 多文件上传

```typescript
async function uploadFiles(files: File[]) {
  const formData = new FormData();

  files.forEach((file, index) => {
    formData.append(`files[${index}]`, file);
  });

  formData.append('totalFiles', files.length.toString());

  const response = await api.post('/upload/multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response;
}
```

### 3. 拦截器高级用法

#### 请求日志

```typescript
// 开发环境日志
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(config => {
    console.log(
      `[${new Date().toISOString()}]`,
      config.method?.toUpperCase(),
      config.url,
      config
    );
    return config;
  });

  api.interceptors.response.use(
    response => {
      console.log(
        `[${new Date().toISOString()}] Response:`,
        response.status,
        response
      );
      return response;
    },
    error => {
      console.error(
        `[${new Date().toISOString()}] Error:`,
        error.message,
        error
      );
      return Promise.reject(error);
    }
  );
}
```

#### 请求重试

```typescript
// 简单重试逻辑
function retryInterceptor(maxRetries: number = 3, delay: number = 1000) {
  return async (error: any) => {
    const config = error.config;

    // 初始化重试计数
    config._retryCount = config._retryCount || 0;

    // 检查是否超过最大重试次数
    if (config._retryCount >= maxRetries) {
      return Promise.reject(error);
    }

    // 增加重试计数
    config._retryCount += 1;

    // 等待指定时间后重试
    await new Promise(resolve => setTimeout(resolve, delay));

    // 重试请求
    return api.request(config);
  };
}

// 使用重试拦截器
api.interceptors.response.use(response => response, retryInterceptor(3, 1000));
```

#### 指数退避重试

```typescript
function exponentialBackoffRetry(maxRetries: number = 3) {
  return async (error: any) => {
    const config = error.config;
    config._retryCount = config._retryCount || 0;

    if (config._retryCount >= maxRetries) {
      return Promise.reject(error);
    }

    config._retryCount += 1;

    // 指数退避：2^n * 1000 毫秒
    const delay = Math.pow(2, config._retryCount) * 1000;

    console.log(`重试第 ${config._retryCount} 次，等待 ${delay}ms...`);

    await new Promise(resolve => setTimeout(resolve, delay));

    return api.request(config);
  };
}

api.interceptors.response.use(response => response, exponentialBackoffRetry(3));
```

#### 请求缓存

```typescript
// 简单的内存缓存
class RequestCache {
  private cache = new Map<
    string,
    {
      data: unknown;
      timestamp: number;
    }
  >();

  constructor(private ttl: number = 5 * 60 * 1000) {} // 默认 5 分钟

  // 生成缓存键
  private generateKey(config: RequestOptions): string {
    return `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
  }

  // 获取缓存
  get(config: RequestOptions): unknown | null {
    const key = this.generateKey(config);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log('返回缓存数据:', key);
      return cached.data;
    }

    // 缓存过期，删除
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  // 设置缓存
  set(config: RequestOptions, data: unknown): void {
    const key = this.generateKey(config);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
  }
}

// 使用缓存
const cache = new RequestCache(5 * 60 * 1000); // 5 分钟

api.interceptors.request.use(async config => {
  // 只缓存 GET 请求
  if (config.method === 'GET') {
    const cached = cache.get(config);
    if (cached) {
      // 返回缓存数据（需要转换为 Response 对象）
      return Promise.resolve(cached);
    }
  }
  return config;
});

api.interceptors.response.use(response => {
  // 缓存 GET 请求的响应
  if (response.config?.method === 'GET') {
    cache.set(response.config, response);
  }
  return response;
});
```

### 4. TypeScript 高级用法

#### 泛型 API 客户端

```typescript
// 定义通用的 API 响应格式
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 定义资源类型
interface User {
  id: number;
  name: string;
  email: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
}

// 创建泛型 API 服务类
class ApiService<T> {
  constructor(
    private api: FetchXInstance,
    private basePath: string
  ) {}

  async getAll(params?: Record<string, unknown>): Promise<T[]> {
    const response = await this.api.get<ApiResponse<T[]>>(this.basePath, {
      params,
    });
    return response.data;
  }

  async getById(id: number | string): Promise<T> {
    const response = await this.api.get<ApiResponse<T>>(
      `${this.basePath}/${id}`
    );
    return response.data;
  }

  async create(data: Partial<T>): Promise<T> {
    const response = await this.api.post<ApiResponse<T>>(this.basePath, data);
    return response.data;
  }

  async update(id: number | string, data: Partial<T>): Promise<T> {
    const response = await this.api.put<ApiResponse<T>>(
      `${this.basePath}/${id}`,
      data
    );
    return response.data;
  }

  async delete(id: number | string): Promise<void> {
    await this.api.delete(`${this.basePath}/${id}`);
  }
}

// 使用泛型服务
const userService = new ApiService<User>(api, '/users');
const postService = new ApiService<Post>(api, '/posts');

// 类型安全的调用
const users = await userService.getAll(); // User[]
const user = await userService.getById(1); // User
const newUser = await userService.create({
  name: 'John',
  email: 'john@example.com',
}); // User

const posts = await postService.getAll(); // Post[]
```

#### 类型守卫和验证

```typescript
// 定义类型守卫
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'email' in obj
  );
}

function isUserArray(obj: unknown): obj is User[] {
  return Array.isArray(obj) && obj.every(isUser);
}

// 带类型验证的 API 调用
async function fetchUsers(): Promise<User[]> {
  const data = await api.get('/users');

  if (!isUserArray(data)) {
    throw new Error('Invalid user data received');
  }

  return data;
}

// 使用
try {
  const users = await fetchUsers(); // 保证类型安全
  users.forEach(user => {
    console.log(user.name); // TypeScript 确保 name 存在
  });
} catch (error) {
  console.error('数据验证失败:', error);
}
```

---

## 最佳实践

### 1. 项目组织结构

```
src/
├── api/
│   ├── index.ts          # API 实例
│   ├── user.ts           # 用户相关 API
│   ├── post.ts           # 文章相关 API
│   └── auth.ts           # 认证相关 API
├── types/
│   ├── user.ts           # 用户类型定义
│   └── post.ts           # 文章类型定义
└── services/
    └── api.service.ts    # API 服务封装
```

#### api/index.ts

```typescript
import { createFetchX } from 'fetchx';

// 创建主 API 实例
export const api = createFetchX({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 添加响应拦截器
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 清除 token 并跳转到登录页
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

#### api/user.ts

```typescript
import { api } from './index';
import type { User, CreateUserRequest, UpdateUserRequest } from '../types/user';

export const userAPI = {
  // 获取用户列表
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<User[]> {
    return api.get('/users', { params });
  },

  // 获取单个用户
  async getUser(id: number): Promise<User> {
    return api.get(`/users/${id}`);
  },

  // 创建用户
  async createUser(data: CreateUserRequest): Promise<User> {
    return api.post('/users', data);
  },

  // 更新用户
  async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    return api.put(`/users/${id}`, data);
  },

  // 删除用户
  async deleteUser(id: number): Promise<void> {
    return api.delete(`/users/${id}`);
  },
};
```

#### types/user.ts

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  avatar?: string;
}
```

### 2. 环境配置

```typescript
// config/api.config.ts
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000/api',
    timeout: 10000,
  },
  staging: {
    baseURL: 'https://staging-api.example.com',
    timeout: 15000,
  },
  production: {
    baseURL: 'https://api.example.com',
    timeout: 20000,
  },
};

const env = process.env.NODE_ENV || 'development';

export const config = API_CONFIG[env];

// 使用
import { config } from './config/api.config';

const api = createFetchX(config);
```

### 3. 错误处理策略

```typescript
// utils/error-handler.ts
export class ErrorHandler {
  static handle(error: any): void {
    if (error.isAxiosError) {
      if (error.response) {
        // 服务器响应错误
        this.handleResponseError(error.response);
      } else if (error.request) {
        // 网络错误
        this.handleNetworkError();
      } else {
        // 配置错误
        this.handleConfigError(error.message);
      }
    } else {
      // 其他错误
      this.handleUnknownError(error);
    }
  }

  private static handleResponseError(response: any): void {
    const { status, data } = response;

    switch (status) {
      case 400:
        console.error('请求参数错误:', data);
        // 显示表单验证错误
        break;
      case 401:
        console.error('未授权，请重新登录');
        // 跳转到登录页
        break;
      case 403:
        console.error('权限不足');
        // 显示权限不足提示
        break;
      case 404:
        console.error('资源不存在');
        // 显示 404 页面
        break;
      case 500:
        console.error('服务器错误');
        // 显示服务器错误提示
        break;
      default:
        console.error(`请求失败: ${status}`);
    }
  }

  private static handleNetworkError(): void {
    console.error('网络连接失败，请检查网络设置');
    // 显示网络错误提示
  }

  private static handleConfigError(message: string): void {
    console.error('请求配置错误:', message);
  }

  private static handleUnknownError(error: Error): void {
    console.error('未知错误:', error.message);
  }
}

// 使用
try {
  const data = await api.get('/users');
} catch (error) {
  ErrorHandler.handle(error);
}
```

### 4. React Hook 封装

```typescript
// hooks/useApi.ts
import { useState, useEffect } from 'react';

export function useApi<T>(
  fetcher: () => Promise<T>,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetcher();

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, dependencies);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}

// 使用示例
function UserList() {
  const { data: users, loading, error, refetch } = useApi(
    () => userAPI.getUsers(),
    []
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={refetch}>刷新</button>
      <ul>
        {users?.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 5. 测试

```typescript
// __tests__/api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createFetchX } from 'fetchx';

describe('FetchX', () => {
  it('should make GET request', async () => {
    const api = createFetchX({
      baseURL: 'https://api.example.com',
    });

    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [{ id: 1, name: 'John' }],
      } as Response)
    );

    const users = await api.get('/users');

    expect(users).toEqual([{ id: 1, name: 'John' }]);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.any(Object)
    );
  });

  it('should handle errors', async () => {
    const api = createFetchX({
      baseURL: 'https://api.example.com',
    });

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
      } as Response)
    );

    await expect(api.get('/users')).rejects.toThrow();
  });
});
```

---

## 常见问题

### Q1: 如何处理 CORS 问题？

**A:** CORS 是服务器端的配置，FetchX 本身不能解决 CORS 问题。但你可以：

1. **开发环境使用代理**：

```javascript
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
};
```

2. **使用 credentials**：

```typescript
const api = createFetchX({
  baseURL: 'https://api.example.com',
  credentials: 'include', // 发送 Cookie
});
```

3. **联系后端开发者配置 CORS 头**：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Q2: 如何取消多个请求？

**A:** 使用一个 AbortController 控制多个请求：

```typescript
const controller = new AbortController();
const { signal } = controller;

// 发起多个请求
const promise1 = api.get('/users', { signal });
const promise2 = api.get('/posts', { signal });
const promise3 = api.get('/comments', { signal });

// 取消所有请求
controller.abort();

// 处理结果
try {
  const results = await Promise.all([promise1, promise2, promise3]);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('所有请求已取消');
  }
}
```

### Q3: 如何上传文件并显示进度？

**A:** FetchX 基于 fetch API，原生不支持进度监控。可以使用 XMLHttpRequest：

```typescript
function uploadWithProgress(
  file: File,
  onProgress: (progress: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    // 监听上传进度
    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', 'https://api.example.com/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

// 使用
await uploadWithProgress(file, progress => {
  console.log(`上传进度: ${progress.toFixed(2)}%`);
});
```

### Q4: 如何实现请求去重？

**A:** 使用 Map 缓存正在进行的请求：

```typescript
class RequestDeduplicator {
  private pending = new Map<string, Promise<unknown>>();

  private generateKey(config: RequestOptions): string {
    return `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
  }

  async request<T>(
    config: RequestOptions,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const key = this.generateKey(config);

    // 如果请求正在进行，返回现有的 Promise
    if (this.pending.has(key)) {
      console.log('请求去重:', key);
      return this.pending.get(key) as Promise<T>;
    }

    // 发起新请求
    const promise = fetcher().finally(() => {
      // 请求完成后删除缓存
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

// 使用
const deduplicator = new RequestDeduplicator();

api.interceptors.request.use(async config => {
  return deduplicator.request(config, () => Promise.resolve(config));
});
```

### Q5: 如何模拟网络延迟（测试用）？

**A:** 使用请求拦截器添加延迟：

```typescript
// 仅在开发环境使用
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(async config => {
    // 模拟 1 秒延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    return config;
  });
}
```

### Q6: 如何处理大数据量的响应？

**A:** 使用流式处理（如果服务器支持）：

```typescript
async function fetchLargeData(url: string) {
  const response = await fetch(url);
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);

    // 处理每个数据块
    console.log(`收到 ${value.length} 字节`);
  }

  // 合并所有数据块
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}
```

---

## 迁移指南

### 从 Axios 迁移到 FetchX

FetchX 设计时参考了 Axios 的 API，因此迁移非常简单。

#### 1. 基础 API 对比

| 功能       | Axios                               | FetchX                            |
| ---------- | ----------------------------------- | --------------------------------- |
| 创建实例   | `axios.create()`                    | `createFetchX()`                  |
| GET 请求   | `axios.get(url, config)`            | `api.get(url, options)`           |
| POST 请求  | `axios.post(url, data, config)`     | `api.post(url, data, options)`    |
| 请求拦截器 | `axios.interceptors.request.use()`  | `api.interceptors.request.use()`  |
| 响应拦截器 | `axios.interceptors.response.use()` | `api.interceptors.response.use()` |

#### 2. 代码迁移示例

**Axios 代码：**

```typescript
import axios from 'axios';

// 创建实例
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 使用
const users = await api.get('/users');
```

**迁移后的 FetchX 代码：**

```typescript
import { createFetchX } from 'fetchx';

// 创建实例（API 完全相同）
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器（API 完全相同）
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 响应拦截器（需要调整：FetchX 返回原始响应）
api.interceptors.response.use(
  response => response, // ⚠️ FetchX 不自动提取 data
  error => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 使用（完全相同）
const users = await api.get('/users');
```

#### 3. 主要差异

| 项目       | Axios                               | FetchX             | 迁移建议                 |
| ---------- | ----------------------------------- | ------------------ | ------------------------ |
| 响应数据   | 自动提取 `response.data`            | 返回完整响应       | 在拦截器中手动提取       |
| 默认请求头 | `application/x-www-form-urlencoded` | `application/json` | 检查 Content-Type        |
| 取消请求   | CancelToken                         | AbortController    | 使用标准 AbortController |
| 上传进度   | 支持                                | 不支持             | 使用 XMLHttpRequest      |
| 下载进度   | 支持                                | 不支持             | 使用 XMLHttpRequest      |

#### 4. 兼容层（可选）

如果需要完全兼容 Axios 的行为，可以创建兼容层：

```typescript
import { createFetchX } from 'fetchx';

// 创建兼容 Axios 的实例
function createAxiosLike(config: FetchXConfig) {
  const instance = createFetchX(config);

  // 自动提取 data
  instance.interceptors.response.use(
    response => {
      // 模拟 Axios 的 response.data
      return {
        data: response,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: response.config,
      };
    },
    error => Promise.reject(error)
  );

  return instance;
}

// 使用
const api = createAxiosLike({
  baseURL: 'https://api.example.com',
});

const response = await api.get('/users');
console.log(response.data); // 像 Axios 一样访问数据
```

---

## 总结

FetchX 是一个功能强大且易于使用的 HTTP 客户端库。通过本指南，你应该已经掌握了：

✅ 基础的请求方法和配置  
✅ 拦截器的使用和高级技巧  
✅ TypeScript 的类型安全实践  
✅ 认证、文件上传等常见场景  
✅ 项目组织和最佳实践  
✅ 问题排查和解决方案

如果你在使用过程中遇到问题，请参考：

- 📖 [API 文档](./API.md) - 详细的 API 参考
- 💡 [示例代码](./Examples.md) - 更多使用示例
- 🐛 [GitHub Issues](https://github.com/your-username/fetchx/issues) - 报告问题
- 💬 [GitHub Discussions](https://github.com/your-username/fetchx/discussions) - 社区讨论

祝你使用愉快！🎉
