# FetchX

[![npm version](https://img.shields.io/npm/v/@petite-pluie/fetchx.svg)](https://www.npmjs.com/package/@petite-pluie/fetchx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

A modern, lightweight HTTP client library built on the native fetch API with an axios-like interface. Perfect for TypeScript projects that need a reliable, type-safe HTTP client.

基于原生 fetch API 构建的现代化、轻量级 HTTP 客户端库，提供类似 axios 的接口。完美适用于需要可靠、类型安全的 HTTP 客户端的 TypeScript 项目。

## 🌐 Language / 语言

Choose your preferred language:

选择您偏好的语言：

### 🇺🇸 English

[📖 Read English Documentation](docs/i18n/README.en.md)

A modern, lightweight HTTP client library built on the native fetch API with an axios-like interface. Perfect for TypeScript projects that need a reliable, type-safe HTTP client.

**Key Features:**

- 🚀 Modern: Built on native fetch API, no external dependencies
- 🔄 Axios Compatible: Easy migration from axios with familiar API
- 🛡️ Type Safe: Full TypeScript support with comprehensive type definitions
- 🔧 Interceptors: Powerful request/response interceptor system
- ⏱️ Timeout Control: Built-in timeout with AbortController
- 🚫 Request Cancellation: Full AbortController support with isCancel utility
- 📊 Progress Tracking: Upload/download progress monitoring (v0.2.0+)
- 🔌 Plugin System: Extensible plugin architecture for advanced features (v0.2.0+)
- 📦 Lightweight: Zero runtime dependencies, minimal bundle size

### 🇨🇳 中文

[📖 阅读中文文档](docs/i18n/README.zh.md)

基于原生 fetch API 构建的现代化、轻量级 HTTP 客户端库，提供类似 axios 的接口。完美适用于需要可靠、类型安全的 HTTP 客户端的 TypeScript 项目。

**主要特性:**

- 🚀 现代化: 基于原生 fetch API，无外部依赖
- 🔄 Axios 兼容: 从 axios 轻松迁移，熟悉的 API
- 🛡️ 类型安全: 完整的 TypeScript 支持，全面的类型定义
- 🔧 拦截器: 强大的请求/响应拦截器系统
- ⏱️ 超时控制: 基于 AbortController 的内置超时
- 🚫 请求取消: 完整的 AbortController 支持和 isCancel 工具函数
- 📊 进度追踪: 上传/下载进度监控 (v0.2.0+)
- 🔌 插件系统: 可扩展的插件架构，支持高级功能 (v0.2.0+)
- 📦 轻量级: 零运行时依赖，最小化包体积

## 📦 Installation / 安装

```bash
# Using pnpm (recommended) / 使用 pnpm（推荐）
pnpm add @petite-pluie/fetchx

# Using npm / 使用 npm
npm install @petite-pluie/fetchx

# Using yarn / 使用 yarn
yarn add @petite-pluie/fetchx
```

## 🚀 Quick Start / 快速开始

```typescript
import { createFetchX, isCancel } from '@petite-pluie/fetchx';

// Create instance with configuration / 创建带配置的实例
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Make requests with full TypeScript support / 使用完整的 TypeScript 支持发起请求
interface User {
  id: number;
  name: string;
  email: string;
}

const users = await api.get<User[]>('/users');
const newUser = await api.post<User>('/users', {
  name: 'John Doe', // 或 '张三'
  email: 'john@example.com',
});

// Request cancellation / 请求取消
const controller = new AbortController();
try {
  const data = await api.get('/users', { signal: controller.signal });
} catch (error) {
  if (isCancel(error)) {
    console.log('Request cancelled / 请求已取消');
  }
}
```

## 📊 Progress Tracking / 进度追踪 (v0.2.0+)

```typescript
import { createFetchX } from '@petite-pluie/fetchx';
import { uploadProgressPlugin } from '@petite-pluie/fetchx/plugins/upload-progress';

// Create instance with upload progress plugin / 创建带上传进度插件的实例
const api = createFetchX({
  baseURL: 'https://api.example.com',
  plugins: [uploadProgressPlugin()],
});

// Upload with progress / 带进度的上传
await api.post('/upload', fileData, {
  onUploadProgress: progress => {
    console.log(`Upload: ${progress.percentage}%`);
    console.log(`上传: ${progress.percentage}%`);
  },
});

// Download with progress / 带进度的下载（内置支持）
await api.get('/large-file', {
  onDownloadProgress: progress => {
    console.log(`Download: ${progress.percentage}%`);
    console.log(`下载: ${progress.percentage}%`);
  },
});
```

## 🤝 Contributing / 贡献

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

我们欢迎贡献！详情请参阅我们的[贡献指南](CONTRIBUTING.md)。

### Git Commit Convention / Git 提交规范

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

#### Quick Start / 快速开始

```bash
# Use interactive commit (recommended) / 使用交互式提交（推荐）
pnpm commit

# Or use git commit directly / 或直接使用 git commit
git commit -m "feat(core): add request interceptor support"
```

For detailed information, see our [Git Commit Guide](docs/GIT_COMMIT_GUIDE.md).

详细信息请参阅我们的 [Git 提交指南](docs/GIT_COMMIT_GUIDE.md)。

## 📄 License / 许可证

MIT License - see [LICENSE](LICENSE) file for details.

MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。

## 🙏 Acknowledgments / 致谢

- Inspired by [axios](https://github.com/axios/axios) for its excellent API design
- Built on the modern [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- Powered by [TypeScript](https://www.typescriptlang.org/) for type safety

- 感谢 [axios](https://github.com/axios/axios) 提供的优秀 API 设计灵感
- 基于现代化的 [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) 构建
- 由 [TypeScript](https://www.typescriptlang.org/) 提供类型安全支持

---

## 📚 Documentation / 文档

- [📖 English Documentation](docs/i18n/README.en.md)
- [📖 中文文档](docs/i18n/README.zh.md)
- [⚡ Quick Start / 快速入门](docs/QUICK_START.md)
- [📚 User Guide / 使用指南](docs/USER_GUIDE.md)
- [📋 API Reference](docs/API.md)
- [💡 Examples](docs/Examples.md)
- [🔌 Plugin System & Progress / 插件系统与进度追踪](docs/PLUGIN_SYSTEM_AND_PROGRESS.md) (v0.2.0+)
- [🔧 Git Setup Guide](docs/GIT_SETUP.md)
- [📝 Git Commit Guide](docs/GIT_COMMIT_GUIDE.md)
- [🤝 Contributing Guide](CONTRIBUTING.md)
- [📋 Changelog](CHANGELOG.md)
