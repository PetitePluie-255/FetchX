# FetchX 使用示例

本文档提供了 FetchX 的各种使用场景和实际示例。

## 目录

- [基础使用](#基础使用)
- [认证和授权](#认证和授权)
- [错误处理](#错误处理)
- [文件上传](#文件上传)
- [请求取消](#请求取消)
- [拦截器使用](#拦截器使用)
- [TypeScript 集成](#typescript-集成)
- [React 集成](#react-集成)
- [Vue 集成](#vue-集成)
- [Node.js 使用](#nodejs-使用)

## 基础使用

### 创建 API 客户端

```typescript
import { createFetchX } from '@petite-pluie/fetchx';

// 基础配置
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0',
  },
});

// 使用
const users = await api.get('/users');
console.log(users);
```

### CRUD 操作示例

```typescript
// 获取用户列表
const users = await api.get('/users');

// 获取单个用户
const user = await api.get('/users/123');

// 创建用户
const newUser = await api.post('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// 更新用户
const updatedUser = await api.put('/users/123', {
  name: 'John Smith',
  email: 'johnsmith@example.com',
});

// 部分更新用户
const patchedUser = await api.patch('/users/123', {
  status: 'active',
});

// 删除用户
await api.delete('/users/123');
```

### 查询参数

```typescript
// 分页查询
const users = await api.get('/users', {
  params: {
    page: 1,
    limit: 10,
    sort: 'created_at',
    order: 'desc',
  },
});

// 搜索和过滤
const filteredUsers = await api.get('/users', {
  params: {
    search: 'john',
    status: 'active',
    role: 'admin',
  },
});
```

## 认证和授权

### JWT Token 认证

```typescript
// 创建带认证的 API 客户端
const api = createFetchX({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 登录获取 token
const loginResponse = await api.post('/auth/login', {
  username: 'user@example.com',
  password: 'password123',
});

const { token } = loginResponse;

// 设置认证头
api.interceptors.request.use(config => {
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 现在所有请求都会自动包含认证头
const profile = await api.get('/auth/profile');
```

### 自动 Token 刷新

```typescript
let refreshToken = localStorage.getItem('refreshToken');
let accessToken = localStorage.getItem('accessToken');

const api = createFetchX({
  baseURL: 'https://api.example.com',
});

// 请求拦截器：添加认证头
api.interceptors.request.use(config => {
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return config;
});

// 响应拦截器：处理 token 刷新
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await api.post('/auth/refresh', {
          refreshToken,
        });

        const { accessToken: newAccessToken } = response;
        accessToken = newAccessToken;
        localStorage.setItem('accessToken', newAccessToken);

        // 重试原始请求
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api.request(originalRequest);
      } catch (refreshError) {
        // 刷新失败，跳转到登录页
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### API Key 认证

```typescript
const api = createFetchX({
  baseURL: 'https://api.example.com',
  headers: {
    'X-API-Key': 'your-api-key-here',
  },
});

// 或者动态设置
api.interceptors.request.use(config => {
  const apiKey = process.env.REACT_APP_API_KEY;
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  return config;
});
```

## 错误处理

### 全局错误处理

```typescript
// 创建错误处理工具类
class ErrorHandler {
  static handle(error: any) {
    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response;

      switch (status) {
        case 400:
          this.handleBadRequest(data);
          break;
        case 401:
          this.handleUnauthorized();
          break;
        case 403:
          this.handleForbidden();
          break;
        case 404:
          this.handleNotFound();
          break;
        case 422:
          this.handleValidationError(data);
          break;
        case 500:
          this.handleServerError();
          break;
        default:
          this.handleGenericError(status, data);
      }
    } else if (error.request) {
      // 网络错误
      this.handleNetworkError();
    } else {
      // 其他错误
      this.handleGenericError(0, error.message);
    }
  }

  static handleBadRequest(data: any) {
    console.error('Bad Request:', data);
    // 显示验证错误消息
  }

  static handleUnauthorized() {
    console.error('Unauthorized');
    // 跳转到登录页
    window.location.href = '/login';
  }

  static handleForbidden() {
    console.error('Forbidden');
    // 显示权限不足消息
  }

  static handleNotFound() {
    console.error('Not Found');
    // 显示 404 页面
  }

  static handleValidationError(data: any) {
    console.error('Validation Error:', data);
    // 显示表单验证错误
  }

  static handleServerError() {
    console.error('Server Error');
    // 显示服务器错误消息
  }

  static handleNetworkError() {
    console.error('Network Error');
    // 显示网络连接错误
  }

  static handleGenericError(status: number, message: string) {
    console.error(`Error ${status}:`, message);
    // 显示通用错误消息
  }
}

// 使用错误处理
try {
  const data = await api.get('/users');
} catch (error) {
  ErrorHandler.handle(error);
}
```

### 自定义错误类

```typescript
// 定义自定义错误类
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ValidationError extends ApiError {
  constructor(message: string, data?: any) {
    super(message, 400, 'VALIDATION_ERROR', data);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

// 在拦截器中使用
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          throw new ValidationError(data.message, data);
        case 401:
          throw new AuthenticationError();
        case 403:
          throw new ApiError('Access denied', 403, 'FORBIDDEN');
        default:
          throw new ApiError(data.message || 'Request failed', status);
      }
    }

    throw error;
  }
);
```

## 文件上传

### 单文件上传

```typescript
// 上传单个文件
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('description', 'My uploaded file');

  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Upload successful:', response);
    return response;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

// 使用示例
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
fileInput.addEventListener('change', async event => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    await uploadFile(file);
  }
});
```

### 多文件上传

```typescript
// 上传多个文件
const uploadFiles = async (files: File[]) => {
  const formData = new FormData();

  files.forEach((file, index) => {
    formData.append(`files[${index}]`, file);
  });

  formData.append('description', 'Multiple files upload');

  try {
    const response = await api.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Upload successful:', response);
    return response;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

### 带进度监控的文件上传

```typescript
// 带进度的文件上传
const uploadFileWithProgress = async (
  file: File,
  onProgress?: (progress: number) => void
) => {
  const formData = new FormData();
  formData.append('file', file);

  // 使用 XMLHttpRequest 来监控上传进度
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable && onProgress) {
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

    xhr.open('POST', '/upload');
    xhr.send(formData);
  });
};

// 使用示例
const file = document.getElementById('fileInput').files[0];
await uploadFileWithProgress(file, progress => {
  console.log(`Upload progress: ${progress}%`);
});
```

## 请求取消

### 基础取消

```typescript
import { createFetchX, isCancel } from '@petite-pluie/fetchx';

const api = createFetchX({
  baseURL: 'https://api.example.com',
});

// 创建 AbortController
const controller = new AbortController();

// 发起可取消的请求
const promise = api.get('/users', {
  signal: controller.signal,
});

// 在某个时刻取消请求
setTimeout(() => {
  controller.abort();
}, 1000);

// 处理取消错误
try {
  const data = await promise;
  console.log('请求成功:', data);
} catch (error) {
  if (isCancel(error)) {
    console.log('请求被取消');
  } else {
    console.error('请求失败:', error);
  }
}
```

### 使用 isCancel 工具函数

FetchX 提供了 `isCancel` 工具函数来识别各种类型的取消错误：

```typescript
import { isCancel } from '@petite-pluie/fetchx';

const fetchData = async () => {
  const controller = new AbortController();

  try {
    const data = await api.get('/data', {
      signal: controller.signal,
    });
    return data;
  } catch (error) {
    // isCancel 可以识别多种取消错误
    if (isCancel(error)) {
      // FetchX ERR_CANCELED
      // FetchX ECONNABORTED (timeout)
      // 原生 AbortError
      // Axios CanceledError
      // 或包含 'cancel'/'abort' 关键词的错误
      console.log('请求被取消，这是预期行为');
      return null;
    }

    // 其他错误需要处理
    console.error('请求失败:', error);
    throw error;
  }
};
```

### 超时控制

#### 使用 FetchX 内置 timeout

```typescript
// 全局超时配置
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000, // 所有请求 5 秒超时
});

// 单次请求超时配置
try {
  const data = await api.get('/slow-endpoint', {
    timeout: 10000, // 此请求 10 秒超时
  });
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    console.log('请求超时');
  }
}
```

#### signal + timeout 组合使用

```typescript
const controller = new AbortController();

// 同时使用 signal 和 timeout
const promise = api.get('/users', {
  timeout: 5000, // 5 秒超时
  signal: controller.signal, // 手动取消能力
});

// 场景 1: 用户主动取消（在 timeout 之前）
setTimeout(() => {
  controller.abort(); // 抛出 ERR_CANCELED
}, 2000);

// 场景 2: 如果 5 秒后请求仍未完成
// 自动超时，抛出 ECONNABORTED

try {
  const data = await promise;
} catch (error) {
  if (error.code === 'ERR_CANCELED') {
    console.log('用户取消了请求');
  } else if (error.code === 'ECONNABORTED') {
    console.log('请求超时');
  } else if (isCancel(error)) {
    console.log('请求被取消（其他原因）');
  }
}
```

#### 自定义超时逻辑

```typescript
// 自定义超时取消（不使用 FetchX timeout）
const requestWithCustomTimeout = async (
  url: string,
  timeout: number = 5000
) => {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await api.get(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (isCancel(error)) {
      throw new Error('请求超时');
    }
    throw error;
  }
};

// 使用
try {
  const data = await requestWithCustomTimeout('/users', 3000);
} catch (error) {
  console.error(error.message); // "请求超时"
}
```

### 已 aborted 的 signal

FetchX 会在请求开始前检查 signal 是否已经 aborted：

```typescript
const controller = new AbortController();

// 提前 abort
controller.abort();

// 请求会立即失败，不会发起网络请求
try {
  await api.get('/users', {
    signal: controller.signal,
  });
} catch (error) {
  console.log(error.code); // "ERR_CANCELED"
  console.log(isCancel(error)); // true
}
```

这个优化避免了发起无效的网络请求，提升了性能。

### 组件卸载时取消请求

#### React Hook 示例

```typescript
import { useEffect, useRef, useState } from 'react';
import { isCancel } from '@petite-pluie/fetchx';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef<AbortController>();

  useEffect(() => {
    const fetchUsers = async () => {
      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const data = await api.get('/users', {
          signal: abortControllerRef.current.signal,
        });
        setUsers(data);
      } catch (error) {
        // 使用 isCancel 检查是否为取消错误
        if (!isCancel(error)) {
          // 只有非取消错误才需要显示给用户
          console.error('获取用户失败:', error);
          setError(error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    // 组件卸载时取消请求
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
};
```

#### 可重用的 Hook

```typescript
import { useState, useEffect, useRef } from 'react';
import { isCancel } from '@petite-pluie/fetchx';

/**
 * 支持取消的数据获取 Hook
 */
export const useFetch = <T>(
  url: string,
  options?: any
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController>();

  const fetchData = async () => {
    // 取消之前的请求
    abortControllerRef.current?.abort();

    // 创建新的 controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await api.get<T>(url, {
        ...options,
        signal: abortControllerRef.current.signal,
      });
      setData(result);
    } catch (err) {
      if (!isCancel(err)) {
        setError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [url]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};

// 使用示例
const UserProfile = ({ userId }: { userId: number }) => {
  const { data: user, loading, error } = useFetch<User>(
    `/users/${userId}`
  );

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;
  if (!user) return null;

  return <div>{user.name}</div>;
};
```

### 搜索防抖 + 自动取消

```typescript
import { useState, useCallback, useRef } from 'react';
import { isCancel } from '@petite-pluie/fetchx';

const SearchBox = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController>();

  const search = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }

    // 取消上一次搜索
    controllerRef.current?.abort();

    // 创建新的 controller
    controllerRef.current = new AbortController();

    setLoading(true);

    try {
      const data = await api.get('/search', {
        params: { q: keyword },
        signal: controllerRef.current.signal,
      });
      setResults(data);
    } catch (error) {
      if (!isCancel(error)) {
        console.error('搜索失败:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // 使用防抖
    const timeoutId = setTimeout(() => {
      search(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="搜索..."
      />
      {loading && <div>搜索中...</div>}
      <ul>
        {results.map(result => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
    </div>
  );
};
```

### 手动取消按钮

```typescript
import { useState, useRef } from 'react';
import { isCancel } from '@petite-pluie/fetchx';

const LongRunningTask = () => {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'cancelled'>('idle');
  const [result, setResult] = useState(null);
  const controllerRef = useRef<AbortController>();

  const startTask = async () => {
    controllerRef.current = new AbortController();
    setStatus('running');
    setResult(null);

    try {
      const data = await api.get('/long-running-task', {
        signal: controllerRef.current.signal,
        timeout: 60000, // 60 秒超时
      });

      setResult(data);
      setStatus('completed');
    } catch (error) {
      if (isCancel(error)) {
        setStatus('cancelled');
        console.log('任务被取消');
      } else {
        setStatus('idle');
        console.error('任务失败:', error);
      }
    }
  };

  const cancelTask = () => {
    controllerRef.current?.abort();
  };

  return (
    <div>
      <h2>长时间运行的任务</h2>
      <div>状态: {status}</div>

      {status === 'idle' && (
        <button onClick={startTask}>开始任务</button>
      )}

      {status === 'running' && (
        <>
          <div>任务进行中...</div>
          <button onClick={cancelTask}>取消任务</button>
        </>
      )}

      {status === 'completed' && (
        <div>任务完成: {JSON.stringify(result)}</div>
      )}

      {status === 'cancelled' && (
        <div>任务已取消</div>
      )}
    </div>
  );
};
```

### 竞态条件处理

```typescript
import { useState, useEffect } from 'react';
import { isCancel } from '@petite-pluie/fetchx';

/**
 * 处理快速切换页面时的竞态条件
 */
const PaginatedList = () => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchPage = async () => {
      setLoading(true);

      try {
        const result = await api.get('/items', {
          params: { page },
          signal: controller.signal,
        });

        // 只有当前页面的数据才会被设置
        setData(result);
      } catch (error) {
        if (!isCancel(error)) {
          console.error('加载失败:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPage();

    // 当 page 变化时，取消之前的请求
    return () => {
      controller.abort();
    };
  }, [page]);

  return (
    <div>
      {loading && <div>加载中...</div>}
      <ul>
        {data.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        上一页
      </button>
      <span>第 {page} 页</span>
      <button onClick={() => setPage(p => p + 1)}>
        下一页
      </button>
    </div>
  );
};
```

### onCancel Hook 实现

虽然 FetchX 没有内置 `onCancel`，但可以通过拦截器轻松实现：

```typescript
// 在应用初始化时设置
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
const controller = new AbortController();

api.get('/users', {
  signal: controller.signal,
  onCancel: config => {
    console.log('请求被取消:', config.url);
    // 执行清理操作
    // 例如：清理 UI 状态、记录日志等
  },
});

// 取消时会触发 onCancel 回调
controller.abort();
```

### Vue 3 示例

```typescript
import { ref, onUnmounted, watchEffect } from 'vue';
import { isCancel } from '@petite-pluie/fetchx';

export const useApi = <T>(url: string, options?: any) => {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  let controller: AbortController | null = null;

  const fetchData = async () => {
    // 取消之前的请求
    controller?.abort();

    controller = new AbortController();
    loading.value = true;
    error.value = null;

    try {
      const result = await api.get<T>(url, {
        ...options,
        signal: controller.signal,
      });
      data.value = result;
    } catch (err) {
      if (!isCancel(err)) {
        error.value = err as Error;
      }
    } finally {
      loading.value = false;
    }
  };

  // 组件卸载时取消请求
  onUnmounted(() => {
    controller?.abort();
  });

  // 自动执行
  watchEffect(() => {
    fetchData();
  });

  return { data, loading, error, refetch: fetchData };
};
```

## 拦截器使用

### 请求日志

```typescript
// 请求日志拦截器
api.interceptors.request.use(config => {
  console.log(
    `[${new Date().toISOString()}] ${config.method?.toUpperCase()} ${config.url}`
  );
  console.log('Request config:', config);
  return config;
});

// 响应日志拦截器
api.interceptors.response.use(
  response => {
    console.log(`[${new Date().toISOString()}] Response:`, response);
    return response;
  },
  error => {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    return Promise.reject(error);
  }
);
```

### 请求重试

```typescript
// 请求重试拦截器
const retryInterceptor = (maxRetries: number = 3) => {
  return (error: any) => {
    const { config } = error;

    if (!config || !config.retry) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount >= maxRetries) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;

    // 延迟重试
    const delay = Math.pow(2, config.__retryCount) * 1000;

    return new Promise(resolve => {
      setTimeout(() => {
        resolve(api.request(config));
      }, delay);
    });
  };
};

// 使用重试拦截器
api.interceptors.response.use(undefined, retryInterceptor(3));

// 在请求中启用重试
const data = await api.get('/users', { retry: true });
```

### 缓存拦截器

```typescript
// 简单的内存缓存
const cache = new Map();

const cacheInterceptor = (ttl: number = 5 * 60 * 1000) => {
  return (config: any) => {
    const cacheKey = `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log('Returning cached response');
      return Promise.resolve(cached.data);
    }

    return config;
  };
};

const cacheResponseInterceptor = (config: any) => {
  return (response: any) => {
    const cacheKey = `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });
    return response;
  };
};

// 使用缓存拦截器
api.interceptors.request.use(cacheInterceptor());
api.interceptors.response.use(cacheResponseInterceptor);
```

## TypeScript 集成

### 定义 API 类型

```typescript
// 定义 API 响应类型
interface ApiResponse<T> {
  data: T;
  message: string;
  status: 'success' | 'error';
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 定义用户相关类型
interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
  avatar?: string;
}

interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'name' | 'email' | 'createdAt';
  order?: 'asc' | 'desc';
}
```

### 类型安全的 API 客户端

```typescript
// 创建类型安全的 API 客户端
class UserAPI {
  constructor(private api: any) {}

  async getUsers(params?: UserListParams): Promise<ApiResponse<User[]>> {
    return this.api.get('/users', { params });
  }

  async getUser(id: number): Promise<ApiResponse<User>> {
    return this.api.get(`/users/${id}`);
  }

  async createUser(user: CreateUserRequest): Promise<ApiResponse<User>> {
    return this.api.post('/users', user);
  }

  async updateUser(
    id: number,
    user: UpdateUserRequest
  ): Promise<ApiResponse<User>> {
    return this.api.put(`/users/${id}`, user);
  }

  async deleteUser(id: number): Promise<ApiResponse<void>> {
    return this.api.delete(`/users/${id}`);
  }
}

// 使用类型安全的 API
const userAPI = new UserAPI(api);

const users = await userAPI.getUsers({ page: 1, limit: 10 });
const user = await userAPI.getUser(123);
const newUser = await userAPI.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
});
```

### 泛型 API 客户端

```typescript
// 泛型 API 客户端
class GenericAPI<T, CreateT = Partial<T>, UpdateT = Partial<T>> {
  constructor(
    private api: any,
    private basePath: string
  ) {}

  async getAll(params?: Record<string, any>): Promise<ApiResponse<T[]>> {
    return this.api.get(this.basePath, { params });
  }

  async getById(id: number | string): Promise<ApiResponse<T>> {
    return this.api.get(`${this.basePath}/${id}`);
  }

  async create(data: CreateT): Promise<ApiResponse<T>> {
    return this.api.post(this.basePath, data);
  }

  async update(id: number | string, data: UpdateT): Promise<ApiResponse<T>> {
    return this.api.put(`${this.basePath}/${id}`, data);
  }

  async delete(id: number | string): Promise<ApiResponse<void>> {
    return this.api.delete(`${this.basePath}/${id}`);
  }
}

// 使用泛型 API 客户端
const userAPI = new GenericAPI<User, CreateUserRequest, UpdateUserRequest>(
  api,
  '/users'
);

const postAPI = new GenericAPI<Post, CreatePostRequest, UpdatePostRequest>(
  api,
  '/posts'
);
```

## React 集成

### 自定义 Hook

```typescript
import { useState, useEffect } from 'react';

// 数据获取 Hook
export const useApi = <T>(
  url: string,
  options?: any,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await api.get<T>(url, options);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: () => fetchData() };
};

// 使用示例
const UserList = () => {
  const { data: users, loading, error } = useApi<User[]>('/users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {users?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
};
```

### 状态管理集成

```typescript
// Redux Toolkit 集成
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// 异步 thunk
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params?: UserListParams) => {
    const response = await api.get<ApiResponse<User[]>>('/users', { params });
    return response.data;
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData: CreateUserRequest) => {
    const response = await api.post<ApiResponse<User>>('/users', userData);
    return response.data;
  }
);

// Slice
const usersSlice = createSlice({
  name: 'users',
  initialState: {
    users: [] as User[],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchUsers.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch users';
      });
  },
});
```

## Vue 集成

### Composition API

```typescript
import { ref, onMounted } from 'vue';

// 数据获取组合函数
export const useApi = <T>(url: string, options?: any) => {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const fetchData = async () => {
    try {
      loading.value = true;
      error.value = null;
      const result = await api.get<T>(url, options);
      data.value = result;
    } catch (err) {
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetchData);

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    refetch: fetchData,
  };
};

// 使用示例
export default {
  setup() {
    const { data: users, loading, error } = useApi<User[]>('/users');

    return {
      users,
      loading,
      error,
    };
  },
};
```

### Pinia 集成

```typescript
import { defineStore } from 'pinia';

export const useUserStore = defineStore('users', {
  state: () => ({
    users: [] as User[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchUsers(params?: UserListParams) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get<ApiResponse<User[]>>('/users', {
          params,
        });
        this.users = response.data;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async createUser(userData: CreateUserRequest) {
      try {
        const response = await api.post<ApiResponse<User>>('/users', userData);
        this.users.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },
  },
});
```

## Node.js 使用

### 服务端 API 客户端

```typescript
import { createFetchX } from 'fetchx';

// 服务端配置
const api = createFetchX({
  baseURL: process.env.API_BASE_URL || 'https://api.example.com',
  timeout: 30000,
  headers: {
    'User-Agent': 'MyServer/1.0',
    'X-Server-Key': process.env.SERVER_API_KEY,
  },
});

// 服务端使用示例
export class UserService {
  async getUsers(): Promise<User[]> {
    try {
      const response = await api.get<ApiResponse<User[]>>('/users');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const response = await api.post<ApiResponse<User>>('/users', userData);
      return response.data;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }
}
```

### Express 中间件

```typescript
import express from 'express';

// API 代理中间件
export const apiProxy = (targetUrl: string) => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const response = await api.request({
        method: req.method as any,
        url: `${targetUrl}${req.path}`,
        params: req.query,
        body: req.body,
        headers: {
          ...req.headers,
          host: undefined, // 移除 host 头
        },
      });

      res.status(response.status).json(response.data);
    } catch (error) {
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

// 使用中间件
app.use('/api/users', apiProxy('https://user-service.example.com'));
```

---

这些示例涵盖了 FetchX 的主要使用场景。你可以根据具体需求选择合适的模式来实现你的应用。
