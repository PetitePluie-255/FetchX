# FetchX 快速入门

> 5 分钟上手 FetchX，开始你的第一个 HTTP 请求！

## 📦 安装

```bash
# 使用 pnpm（推荐）
pnpm add @petite-pluie/fetchx

# 或使用 npm
npm install @petite-pluie/fetchx

# 或使用 yarn
yarn add @petite-pluie/fetchx
```

## 🚀 第一个请求

### 1. 创建 API 实例

```typescript
import { createFetchX } from '@petite-pluie/fetchx';

const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});
```

### 2. 发起 GET 请求

```typescript
// 获取用户列表
const users = await api.get('/users');
console.log(users);

// 带查询参数
const users = await api.get('/users', {
  params: { page: 1, limit: 10 },
});
```

### 3. 发起 POST 请求

```typescript
// 创建用户
const newUser = await api.post('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});
```

## 💡 TypeScript 支持

```typescript
// 定义类型
interface User {
  id: number;
  name: string;
  email: string;
}

// 类型安全的请求
const users = await api.get<User[]>('/users');
const user = await api.post<User>('/users', {
  name: 'John',
  email: 'john@example.com',
});
```

## 🔐 添加认证

```typescript
// 方式 1：全局配置
const api = createFetchX({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer your-token',
  },
});

// 方式 2：使用拦截器（推荐）
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
```

## 🛡️ 错误处理

```typescript
try {
  const users = await api.get('/users');
} catch (error) {
  if (error.response) {
    // 服务器返回错误状态码
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  } else if (error.request) {
    // 网络错误
    console.error('Network error');
  } else {
    // 其他错误
    console.error('Error:', error.message);
  }
}
```

## 🔄 所有 HTTP 方法

```typescript
// GET - 获取数据
await api.get('/users');

// POST - 创建数据
await api.post('/users', { name: 'John' });

// PUT - 完整更新
await api.put('/users/1', { name: 'John', email: 'john@example.com' });

// PATCH - 部分更新
await api.patch('/users/1', { name: 'John' });

// DELETE - 删除数据
await api.delete('/users/1');

// HEAD - 获取响应头
await api.head('/users/1');
```

## 🎯 常见场景

### 分页查询

```typescript
const getUsers = async (page: number, limit: number) => {
  return api.get('/users', {
    params: { page, limit },
  });
};

const users = await getUsers(1, 10);
```

### 搜索和过滤

```typescript
const searchUsers = async (keyword: string) => {
  return api.get('/users', {
    params: {
      search: keyword,
      status: 'active',
    },
  });
};

const results = await searchUsers('john');
```

### 文件上传

```typescript
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
```

### 请求取消

```typescript
// 创建控制器
const controller = new AbortController();

// 发起请求
const promise = api.get('/users', {
  signal: controller.signal,
});

// 取消请求
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

## 🔧 拦截器

### 请求拦截器

```typescript
api.interceptors.request.use(
  config => {
    // 在发送前修改配置
    console.log('Request:', config.method, config.url);
    return config;
  },
  error => {
    // 处理错误
    return Promise.reject(error);
  }
);
```

### 响应拦截器

```typescript
api.interceptors.response.use(
  response => {
    // 处理响应
    console.log('Response:', response.status);
    return response;
  },
  error => {
    // 处理错误
    if (error.response?.status === 401) {
      // 跳转登录页
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## 📝 完整示例

```typescript
import { createFetchX } from '@petite-pluie/fetchx';

// 1. 创建 API 实例
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. 添加请求拦截器（认证）
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 3. 添加响应拦截器（错误处理）
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

// 4. 定义类型
interface User {
  id: number;
  name: string;
  email: string;
}

// 5. 封装 API 方法
export const userAPI = {
  async getUsers(params?: { page?: number; limit?: number }) {
    return api.get<User[]>('/users', { params });
  },

  async getUser(id: number) {
    return api.get<User>(`/users/${id}`);
  },

  async createUser(data: Omit<User, 'id'>) {
    return api.post<User>('/users', data);
  },

  async updateUser(id: number, data: Partial<User>) {
    return api.put<User>(`/users/${id}`, data);
  },

  async deleteUser(id: number) {
    return api.delete(`/users/${id}`);
  },
};

// 6. 使用
async function main() {
  try {
    // 获取用户列表
    const users = await userAPI.getUsers({ page: 1, limit: 10 });
    console.log('Users:', users);

    // 创建用户
    const newUser = await userAPI.createUser({
      name: 'John Doe',
      email: 'john@example.com',
    });
    console.log('Created:', newUser);

    // 更新用户
    const updated = await userAPI.updateUser(newUser.id, {
      name: 'John Smith',
    });
    console.log('Updated:', updated);

    // 删除用户
    await userAPI.deleteUser(newUser.id);
    console.log('Deleted');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

## 🎓 下一步

恭喜！你已经掌握了 FetchX 的基础用法。接下来可以：

- 📖 阅读 [完整使用指南](./USER_GUIDE.md) 了解更多高级特性
- 📋 查看 [API 文档](./API.md) 了解所有配置选项
- 💡 浏览 [示例代码](./Examples.md) 学习实际应用场景
- 🔧 查看 [最佳实践](./USER_GUIDE.md#最佳实践) 优化你的代码

## ❓ 需要帮助？

- 🐛 [报告 Bug](https://github.com/PetitePluie-255/FetchX/issues)
- 💬 [社区讨论](https://github.com/PetitePluie-255/FetchX/discussions)
- 📖 [查看文档](./README.md)

---

Happy coding! 🎉
