# FetchX 文档

欢迎来到 FetchX 文档中心！这里包含了使用 FetchX 所需的所有信息。

## 📚 文档导航

### 核心文档

- [**快速入门**](./QUICK_START.md) - ⚡ 5 分钟快速上手
- [**使用指南**](./USER_GUIDE.md) - 📚 从入门到精通的完整使用指南
- [**API 参考**](./API.md) - 📋 完整的 API 文档和类型定义
- [**使用示例**](./Examples.md) - 💡 丰富的使用场景和代码示例

### 国际化文档

- [**English README**](./i18n/README.en.md) - 英文版项目介绍和快速开始
- [**中文 README**](./i18n/README.zh.md) - 中文版项目介绍和快速开始

### 项目文档

- [**README**](../README.md) - 项目介绍和快速开始（语言选择页面）
- [**设计文档**](../FetchX%20设计文档（基础阶段）.md) - 架构设计和实现细节
- [**变更日志**](../CHANGELOG.md) - 版本更新记录
- [**贡献指南**](../CONTRIBUTING.md) - 如何参与项目开发
- [**发布指南**](./RELEASE_GUIDE.md) - 自动发布和版本管理指南

## 🚀 快速开始

### 安装

```bash
pnpm add fetchx
```

### 基础使用

```typescript
import { createFetchX } from 'fetchx';

const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

const users = await api.get('/users');
```

## 📖 文档结构

### API 参考文档

- [createFetchX](./API.md#createfetchx) - 创建实例
- [FetchXConfig](./API.md#fetchxconfig) - 配置选项
- [RequestOptions](./API.md#requestoptions) - 请求选项
- [FetchXInstance](./API.md#fetchxinstance) - 实例方法
- [拦截器](./API.md#拦截器) - 请求/响应拦截器
- [错误处理](./API.md#错误处理) - 错误处理机制
- [类型定义](./API.md#类型定义) - 完整的类型定义

### 使用示例

- [基础使用](./Examples.md#基础使用) - 基本 HTTP 请求
- [认证和授权](./Examples.md#认证和授权) - JWT、API Key 等
- [错误处理](./Examples.md#错误处理) - 全局错误处理
- [文件上传](./Examples.md#文件上传) - 单文件/多文件上传
- [请求取消](./Examples.md#请求取消) - 超时和取消机制
- [拦截器使用](./Examples.md#拦截器使用) - 日志、重试、缓存
- [TypeScript 集成](./Examples.md#typescript-集成) - 类型安全
- [React 集成](./Examples.md#react-集成) - React Hook 和状态管理
- [Vue 集成](./Examples.md#vue-集成) - Composition API 和 Pinia
- [Node.js 使用](./Examples.md#nodejs-使用) - 服务端使用

## 🎯 使用场景

### 前端应用

- **React 应用** - 使用自定义 Hook 和 Redux Toolkit
- **Vue 应用** - 使用 Composition API 和 Pinia
- **原生 JavaScript** - 直接使用 API 方法
- **TypeScript 项目** - 完整的类型支持

### 后端应用

- **Node.js 服务** - Express 中间件和 API 代理
- **微服务架构** - 服务间通信
- **API 网关** - 请求转发和代理

### 开发工具

- **测试环境** - Mock 和测试工具
- **开发工具** - 调试和监控
- **构建工具** - Webpack、Vite 等

## 🔧 配置选项

### 基础配置

```typescript
const api = createFetchX({
  baseURL: 'https://api.example.com', // 基础 URL
  timeout: 5000, // 超时时间
  headers: {
    // 默认请求头
    'Content-Type': 'application/json',
  },
  credentials: 'include', // 凭证模式
});
```

### 高级配置

```typescript
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0',
    'X-API-Key': 'your-api-key',
  },
  credentials: 'include',
});
```

## 🛡️ 类型安全

FetchX 提供完整的 TypeScript 支持：

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
  name: 'John Doe',
  email: 'john@example.com',
});
```

## 🔄 拦截器

### 请求拦截器

```typescript
api.interceptors.request.use(config => {
  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});
```

### 响应拦截器

```typescript
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 处理认证错误
    }
    return Promise.reject(error);
  }
);
```

## 🚨 错误处理

```typescript
try {
  const data = await api.get('/users');
} catch (error) {
  if (error.isAxiosError) {
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
  }
}
```

## 📊 性能特性

- **零依赖** - 基于原生 fetch API
- **Tree Shaking** - 支持按需加载
- **类型安全** - 编译时类型检查
- **轻量级** - 最小化包体积

## 🤝 社区支持

- **GitHub Issues** - 报告 Bug 和功能请求
- **GitHub Discussions** - 社区讨论
- **文档贡献** - 改进文档和示例

## 📝 更新日志

查看 [CHANGELOG](../CHANGELOG.md) 了解最新更新：

- **v0.1.0** - 初始版本发布
- **v0.2.0** - 重试机制和请求队列
- **v0.3.0** - 缓存机制和流式响应

## 🔗 相关链接

- [GitHub 仓库](https://github.com/your-username/fetchx)
- [npm 包](https://www.npmjs.com/package/fetchx)
- [在线示例](https://fetchx-examples.vercel.app)
- [API 文档](https://fetchx-docs.vercel.app)

---

如果您在使用过程中遇到任何问题，请查看相关文档或提交 Issue。我们很乐意为您提供帮助！ 🎉
