# FetchX API 文档

## 目录

- [createFetchX](#createfetchx)
- [FetchXConfig](#fetchxconfig)
- [RequestOptions](#requestoptions)
- [FetchXInstance](#fetchxinstance)
- [拦截器](#拦截器)
- [错误处理](#错误处理)
- [类型定义](#类型定义)

## createFetchX

创建一个新的 FetchX 实例。

### 语法

```typescript
createFetchX(config?: FetchXConfig): FetchXInstance
```

### 参数

- `config?: FetchXConfig` - 可选的配置对象

### 返回值

返回一个 `FetchXInstance` 实例。

### 示例

```typescript
import { createFetchX } from '@petite-pluie/fetchx';

// 使用默认配置
const api = createFetchX();

// 使用自定义配置
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## FetchXConfig

FetchX 实例的配置接口。

### 属性

| 属性           | 类型                     | 默认值                                   | 描述                               |
| -------------- | ------------------------ | ---------------------------------------- | ---------------------------------- |
| `baseURL?`     | `string`                 | -                                        | 所有请求的基础 URL                 |
| `timeout?`     | `number`                 | `0`                                      | 请求超时时间（毫秒），0 表示无超时 |
| `headers?`     | `Record<string, string>` | `{ 'Content-Type': 'application/json' }` | 默认请求头                         |
| `credentials?` | `RequestCredentials`     | -                                        | 凭证模式                           |

### RequestCredentials

```typescript
type RequestCredentials = 'omit' | 'same-origin' | 'include';
```

- `'omit'`: 不发送凭证
- `'same-origin'`: 仅在同源请求中发送凭证
- `'include'`: 在所有请求中发送凭证

### 示例

```typescript
const config: FetchXConfig = {
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0',
  },
  credentials: 'include',
};
```

## RequestOptions

单次请求的配置选项。

### 属性

| 属性           | 类型                     | 描述                       |
| -------------- | ------------------------ | -------------------------- |
| `url?`         | `string`                 | 请求 URL（相对于 baseURL） |
| `params?`      | `Record<string, any>`    | 查询参数                   |
| `body?`        | `any`                    | 请求体                     |
| `method?`      | `string`                 | HTTP 方法                  |
| `signal?`      | `AbortSignal`            | 用于请求取消的信号         |
| `headers?`     | `Record<string, string>` | 请求特定的头部             |
| `timeout?`     | `number`                 | 请求特定的超时时间         |
| `credentials?` | `RequestCredentials`     | 请求特定的凭证模式         |

### 示例

```typescript
const options: RequestOptions = {
  params: { page: 1, limit: 10 },
  headers: { 'X-Custom': 'value' },
  timeout: 3000,
};
```

## FetchXInstance

FetchX 实例接口，提供所有 HTTP 方法。

### 方法

#### get

发送 GET 请求。

```typescript
get<T = any>(url: string, options?: RequestOptions): Promise<T>
```

**参数：**

- `url: string` - 请求 URL
- `options?: RequestOptions` - 可选的请求配置

**返回值：** `Promise<T>` - 解析后的响应数据

**示例：**

```typescript
// 简单 GET 请求
const users = await api.get('/users');

// 带查询参数的 GET 请求
const users = await api.get('/users', {
  params: { page: 1, limit: 10 },
});

// 带类型注解的 GET 请求
interface User {
  id: number;
  name: string;
}
const users = await api.get<User[]>('/users');
```

#### post

发送 POST 请求。

```typescript
post<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>
```

**参数：**

- `url: string` - 请求 URL
- `body?: any` - 请求体数据
- `options?: RequestOptions` - 可选的请求配置

**返回值：** `Promise<T>` - 解析后的响应数据

**示例：**

```typescript
// 创建用户
const newUser = await api.post('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// 带类型注解的 POST 请求
interface CreateUserRequest {
  name: string;
  email: string;
}
interface User {
  id: number;
  name: string;
  email: string;
}
const user = await api.post<User>('/users', {
  name: 'Jane Doe',
  email: 'jane@example.com',
} as CreateUserRequest);
```

#### put

发送 PUT 请求。

```typescript
put<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>
```

**参数：**

- `url: string` - 请求 URL
- `body?: any` - 请求体数据
- `options?: RequestOptions` - 可选的请求配置

**返回值：** `Promise<T>` - 解析后的响应数据

**示例：**

```typescript
// 更新用户
const updatedUser = await api.put('/users/123', {
  name: 'John Smith',
});
```

#### delete

发送 DELETE 请求。

```typescript
delete<T = any>(url: string, options?: RequestOptions): Promise<T>
```

**参数：**

- `url: string` - 请求 URL
- `options?: RequestOptions` - 可选的请求配置

**返回值：** `Promise<T>` - 解析后的响应数据

**示例：**

```typescript
// 删除用户
await api.delete('/users/123');
```

#### patch

发送 PATCH 请求。

```typescript
patch<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>
```

**参数：**

- `url: string` - 请求 URL
- `body?: any` - 请求体数据
- `options?: RequestOptions` - 可选的请求配置

**返回值：** `Promise<T>` - 解析后的响应数据

**示例：**

```typescript
// 部分更新用户
const patchedUser = await api.patch('/users/123', {
  status: 'inactive',
});
```

#### head

发送 HEAD 请求。

```typescript
head<T = any>(url: string, options?: RequestOptions): Promise<T>
```

**参数：**

- `url: string` - 请求 URL
- `options?: RequestOptions` - 可选的请求配置

**返回值：** `Promise<T>` - 解析后的响应数据

**示例：**

```typescript
// 检查资源是否存在
const response = await api.head('/users/123');
```

## 拦截器

### 请求拦截器

请求拦截器允许你在发送请求之前修改请求配置。

#### 添加请求拦截器

```typescript
const id = api.interceptors.request.use(
  config => {
    // 修改请求配置
    config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  error => {
    // 处理请求错误
    return Promise.reject(error);
  }
);
```

#### 移除请求拦截器

```typescript
api.interceptors.request.eject(id);
```

### 响应拦截器

响应拦截器允许你在处理响应之前修改响应数据。

#### 添加响应拦截器

```typescript
const id = api.interceptors.response.use(
  response => {
    // 修改响应数据
    return response;
  },
  error => {
    // 处理响应错误
    if (error.response?.status === 401) {
      // 处理认证错误
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);
```

#### 移除响应拦截器

```typescript
api.interceptors.response.eject(id);
```

### 拦截器示例

```typescript
// 添加认证令牌
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 处理认证错误
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 添加请求日志
api.interceptors.request.use(config => {
  console.log(`Making ${config.method} request to ${config.url}`);
  return config;
});
```

## 请求取消

FetchX 支持使用 `AbortController` 来取消请求，提供灵活的请求控制能力。

### 基础用法

```typescript
// 创建 AbortController
const controller = new AbortController();

// 发起可取消的请求
const promise = api.get('/users', {
  signal: controller.signal,
});

// 取消请求
controller.abort();

// 处理取消错误
try {
  const data = await promise;
} catch (error) {
  if (isCancel(error)) {
    console.log('请求已被取消');
  }
}
```

### timeout 配置

FetchX 支持两种超时配置方式：

#### 1. 全局 timeout

```typescript
// 所有请求默认 5 秒超时
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});
```

#### 2. 单次请求 timeout

```typescript
// 仅此请求 3 秒超时
const data = await api.get('/users', {
  timeout: 3000,
});
```

### signal + timeout 组合使用

当同时使用 `signal` 和 `timeout` 时，FetchX 会创建一个新的 `AbortController` 来协调两者：

- **timeout 触发**：抛出 `ECONNABORTED` 错误
- **signal 触发**：抛出 `ERR_CANCELED` 错误
- **谁先触发谁生效**：先发生的取消原因会成为最终错误

```typescript
const controller = new AbortController();

// 同时设置 timeout 和 signal
const promise = api.get('/users', {
  timeout: 5000, // 5 秒超时
  signal: controller.signal, // 用户手动取消
});

// 场景 1: 用户主动取消（快于 timeout）
setTimeout(() => controller.abort(), 1000);
// 结果: ERR_CANCELED 错误

// 场景 2: timeout 先触发
// 等待超过 5 秒
// 结果: ECONNABORTED 错误
```

### 已 aborted 的 signal

FetchX 会在请求开始前立即检查 `signal.aborted` 状态：

```typescript
const controller = new AbortController();
controller.abort(); // 提前 abort

// 请求会立即失败，不会发起网络请求
await api.get('/users', {
  signal: controller.signal,
});
// 抛出: ERR_CANCELED 错误
```

这个优化可以避免发起无效的网络请求，提升性能。

### isCancel 工具函数

FetchX 提供 `isCancel` 函数来识别各种取消错误，兼容多种取消机制：

```typescript
import { isCancel } from '@petite-pluie/fetchx';

try {
  const data = await api.get('/users', { signal: controller.signal });
} catch (error) {
  if (isCancel(error)) {
    // 这是一个取消错误，可以安全忽略
    console.log('请求被取消');
    return;
  }
  // 其他错误需要处理
  console.error('请求失败:', error);
}
```

`isCancel` 可以识别以下类型的取消错误：

| 错误类型        | 识别方式                         | 来源             |
| --------------- | -------------------------------- | ---------------- |
| FetchX 标准错误 | `error.code === 'ERR_CANCELED'`  | FetchX 用户取消  |
| FetchX 超时错误 | `error.code === 'ECONNABORTED'`  | FetchX timeout   |
| 原生 AbortError | `error.name === 'AbortError'`    | 原生 fetch abort |
| Axios 取消错误  | `error.name === 'CanceledError'` | Axios 迁移兼容   |
| Axios 取消标识  | `error.__CANCEL__ === true`      | Axios 迁移兼容   |
| 消息关键词      | 消息包含 'cancel' 或 'abort'     | 兜底识别         |

### 取消场景示例

#### 1. 组件卸载时取消

```typescript
// React 示例
useEffect(() => {
  const controller = new AbortController();

  api
    .get('/users', { signal: controller.signal })
    .then(data => setUsers(data))
    .catch(error => {
      if (!isCancel(error)) {
        console.error(error);
      }
    });

  return () => controller.abort();
}, []);
```

#### 2. 搜索防抖取消

```typescript
let currentController: AbortController | null = null;

const search = async (keyword: string) => {
  // 取消上一次搜索
  currentController?.abort();

  // 创建新的 controller
  currentController = new AbortController();

  try {
    const results = await api.get('/search', {
      params: { q: keyword },
      signal: currentController.signal,
    });
    return results;
  } catch (error) {
    if (!isCancel(error)) {
      throw error;
    }
  }
};
```

#### 3. 手动取消按钮

```typescript
let controller: AbortController | null = null;

const startRequest = () => {
  controller = new AbortController();

  api
    .get('/long-running-task', {
      signal: controller.signal,
    })
    .then(data => {
      console.log('完成:', data);
    })
    .catch(error => {
      if (isCancel(error)) {
        console.log('用户取消了请求');
      }
    });
};

const cancelRequest = () => {
  controller?.abort();
};
```

### onCancel Hook（通过拦截器实现）

虽然 FetchX 没有内置 `onCancel` hook，但你可以通过拦截器轻松实现：

```typescript
// 请求拦截器中添加取消监听
api.interceptors.request.use(config => {
  const onCancel = config.onCancel;

  if (onCancel && config.signal) {
    config.signal.addEventListener(
      'abort',
      () => {
        onCancel(config);
      },
      { once: true }
    );
  }

  return config;
});

// 使用示例
api.get('/users', {
  signal: controller.signal,
  onCancel: config => {
    console.log('请求被取消:', config.url);
    // 执行清理操作
  },
});
```

## 错误处理

FetchX 提供统一的错误处理机制。

### FetchXError

```typescript
interface FetchXError extends Error {
  config?: RequestOptions;
  code?: string;
  request?: any;
  response?: FetchXResponse;
  isAxiosError?: boolean;
}
```

### 错误类型

| 错误码             | 描述      | 触发条件      |
| ------------------ | --------- | ------------- |
| `ERR_NETWORK`      | 网络错误  | 网络连接问题  |
| `ECONNABORTED`     | 超时错误  | 请求超时      |
| `ERR_BAD_RESPONSE` | HTTP 错误 | 非 2xx 状态码 |
| `ERR_CANCELED`     | 取消错误  | 请求被取消    |

### 错误处理示例

```typescript
try {
  const data = await api.get('/users');
} catch (error) {
  if (error.isAxiosError) {
    console.log('Error config:', error.config);
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);

    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }

    // 根据错误类型处理
    switch (error.code) {
      case 'ERR_NETWORK':
        showNetworkError();
        break;
      case 'ECONNABORTED':
        showTimeoutError();
        break;
      case 'ERR_BAD_RESPONSE':
        showHttpError(error.response.status);
        break;
    }
  }
}
```

## 类型定义

### 完整类型定义

```typescript
// 配置接口
interface FetchXConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  credentials?: RequestCredentials;
  [key: string]: any;
}

// 请求选项
interface RequestOptions extends Omit<FetchXConfig, 'baseURL'> {
  url?: string;
  params?: Record<string, any>;
  body?: any;
  method?: string;
  signal?: AbortSignal;
}

// 响应接口
interface FetchXResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestOptions;
}

// 错误接口
interface FetchXError extends Error {
  config?: RequestOptions;
  code?: string;
  request?: any;
  response?: FetchXResponse;
  isAxiosError?: boolean;
}

// 拦截器类型
type RequestInterceptor = (
  options: RequestOptions
) => Promise<RequestOptions> | RequestOptions;

type ResponseInterceptor = (response: Response) => Promise<Response> | Response;

// 实例接口
interface FetchXInstance {
  get<T = any>(url: string, options?: RequestOptions): Promise<T>;
  post<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>;
  put<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>;
  delete<T = any>(url: string, options?: RequestOptions): Promise<T>;
  patch<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>;
  head<T = any>(url: string, options?: RequestOptions): Promise<T>;

  interceptors: {
    request: {
      use: (fn: RequestInterceptor) => number;
      eject: (id: number) => void;
    };
    response: {
      use: (fn: ResponseInterceptor) => number;
      eject: (id: number) => void;
    };
  };
}

// HTTP 方法类型
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
```

### 使用类型注解

```typescript
// 定义 API 响应类型
interface ApiResponse<T> {
  data: T;
  message: string;
  status: 'success' | 'error';
}

// 定义用户类型
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

// 使用类型注解
const response = await api.get<ApiResponse<User[]>>('/users');
const users = response.data; // TypeScript 知道这是 User[] 类型

// 创建用户请求类型
interface CreateUserRequest {
  name: string;
  email: string;
}

const newUser = await api.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
} as CreateUserRequest);
```

---

## 最佳实践

### 1. 类型安全

```typescript
// 定义完整的 API 类型
interface UserAPI {
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User>;
  createUser(user: CreateUserRequest): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
}

// 实现类型安全的 API 客户端
class UserService implements UserAPI {
  constructor(private api: FetchXInstance) {}

  async getUsers(): Promise<User[]> {
    return this.api.get<User[]>('/users');
  }

  async getUser(id: number): Promise<User> {
    return this.api.get<User>(`/users/${id}`);
  }

  async createUser(user: CreateUserRequest): Promise<User> {
    return this.api.post<User>('/users', user);
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    return this.api.put<User>(`/users/${id}`, user);
  }

  async deleteUser(id: number): Promise<void> {
    return this.api.delete<void>(`/users/${id}`);
  }
}
```

### 2. 错误处理

```typescript
// 创建错误处理工具
class ApiErrorHandler {
  static handle(error: FetchXError) {
    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response;
      switch (status) {
        case 400:
          throw new ValidationError(data.message);
        case 401:
          throw new AuthenticationError('请先登录');
        case 403:
          throw new AuthorizationError('权限不足');
        case 404:
          throw new NotFoundError('资源不存在');
        case 500:
          throw new ServerError('服务器内部错误');
        default:
          throw new ApiError(`请求失败: ${status}`);
      }
    } else if (error.request) {
      // 网络错误
      throw new NetworkError('网络连接失败');
    } else {
      // 其他错误
      throw new ApiError(error.message);
    }
  }
}

// 使用错误处理
try {
  const users = await api.get('/users');
} catch (error) {
  ApiErrorHandler.handle(error);
}
```

### 3. 拦截器最佳实践

```typescript
// 认证拦截器
const authInterceptor = (config: RequestOptions) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
};

// 日志拦截器
const logInterceptor = (config: RequestOptions) => {
  console.log(`[${new Date().toISOString()}] ${config.method} ${config.url}`);
  return config;
};

// 错误处理拦截器
const errorInterceptor = (error: FetchXError) => {
  if (error.response?.status === 401) {
    clearAuthToken();
    redirectToLogin();
  }
  return Promise.reject(error);
};

// 注册拦截器
api.interceptors.request.use(authInterceptor);
api.interceptors.request.use(logInterceptor);
api.interceptors.response.use(undefined, errorInterceptor);
```
