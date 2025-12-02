# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 重试机制支持
- 请求队列管理
- 进度回调功能
- 流式响应处理
- 缓存机制

### Changed

- 优化错误处理机制
- 改进拦截器性能

## [0.1.2] - 2025-12-02

### Added

- 🚫 **完善的请求取消机制**
  - 新增 `isCancel()` 工具函数，兼容多种取消错误类型
  - 支持识别 FetchX 标准错误（`ERR_CANCELED`, `ECONNABORTED`）
  - 支持识别原生 `AbortError`
  - 兼容 Axios 取消错误（`CanceledError`, `__CANCEL__`）
  - 支持错误消息关键词检测（兜底方案）
- ⚡ **性能优化**
  - 请求前立即检查 `signal.aborted` 状态
  - 避免发起无效的网络请求
  - 提升请求取消响应速度

- 📚 **文档完善**
  - 新增 API 文档"请求取消"章节（约 300 行）
  - 大幅完善 Examples.md 中的取消示例（约 500 行）
  - 更新 QUICK_START.md 快速入门示例
  - 新增 CANCEL_MECHANISM_IMPROVEMENTS.md 详细改进文档
  - 新增 UPDATE_SUMMARY.md 完整更新总结

### Enhanced

- 🔧 **signal + timeout 组合使用**
  - 支持同时使用 `signal` 和 `timeout`
  - 自动协调两种取消机制
  - 清晰区分超时和手动取消

- 🎯 **错误识别增强**
  - `isCancel()` 支持 6 种错误类型识别
  - 不区分大小写的消息关键词匹配
  - 完整的类型安全支持

### Documentation

- 📖 **API 文档更新**
  - 详细的请求取消 API 说明
  - `isCancel()` 函数完整文档
  - signal + timeout 组合使用说明
  - 多种取消场景示例

- 💡 **示例代码增强**
  - React Hook 示例（useEffect cleanup）
  - 可重用的 `useFetch` Hook
  - 搜索防抖 + 自动取消
  - 手动取消按钮组件
  - 竞态条件处理（分页）
  - Vue 3 Composition API 示例
  - onCancel Hook 实现方式

- 📚 **文档结构优化**
  - 更新 README.md 特性列表
  - 更新 FetchX 设计文档项目状态
  - 创建详细的改进说明文档
  - 创建完整的更新总结文档

### Tests

- 🧪 **测试覆盖提升**
  - 测试用例：27 个 → 42 个（+56%）
  - 新增 `isCancel()` 测试（9 个测试用例）
  - 新增 aborted signal 提前检查测试
  - 新增 signal + timeout 组合测试
  - 所有测试 100% 通过

- 📊 **测试覆盖率**
  - `createFetchX.ts`: 89.05%
  - `interceptors.ts`: 92.43%
  - `utils.ts`: 95.43%

### Technical Details

- 🔧 **核心实现**
  - 优化 `isCancel()` 函数实现
  - 增强 `createFetchX` 请求流程
  - 改进 signal 状态检查逻辑
  - 完善错误类型定义

- 📦 **构建优化**
  - 修复 TypeScript 类型错误
  - 优化代码格式和结构
  - 确保构建稳定性
  - 包体积保持轻量（9.84 kB, gzip: 2.93 kB）

### Migration Guide

从 v0.1.1 迁移到 v0.1.2：

```typescript
// 新增：使用 isCancel 检查取消错误
import { createFetchX, isCancel } from '@petite-pluie/fetchx';

const controller = new AbortController();
try {
  const data = await api.get('/users', {
    signal: controller.signal,
  });
} catch (error) {
  // 新增：使用 isCancel 统一识别取消错误
  if (isCancel(error)) {
    console.log('请求被取消');
  } else {
    console.error('请求失败:', error);
  }
}

// 新增：signal + timeout 组合使用
const data = await api.get('/users', {
  timeout: 5000, // 5 秒超时
  signal: controller.signal, // 手动取消
});
```

**向下兼容**：所有 v0.1.1 代码无需修改即可运行。

## [0.1.1] - 2024-01-XX

### Added

- 🔧 Git提交规范配置
  - 集成commitizen和cz-git工具
  - 配置husky Git钩子
  - 设置lint-staged自动代码检查
  - 添加@commitlint提交信息验证
  - 创建详细的Git提交规范指南

### Changed

- 📝 更新项目文档
  - 完善README.md中的贡献指南
  - 添加Git提交规范使用说明
  - 优化文档格式和结构

### Documentation

- 📖 新增Git提交规范指南 (`docs/GIT_COMMIT_GUIDE.md`)
- 📚 更新贡献指南，包含提交规范说明
- 🎯 提供完整的提交类型和作用域说明

## [0.1.0] - 2024-01-XX

### Added

- 🎉 初始版本发布
- ✨ 基于原生 fetch API 的 HTTP 客户端
- 🔧 完整的拦截器系统（请求/响应拦截器）
- ⏱️ 基于 AbortController 的超时控制
- 🛡️ 完整的 TypeScript 类型支持
- 📦 零运行时依赖
- 🎯 统一的错误处理机制
- 🔄 自动 JSON 序列化和响应解析
- 📝 完整的 API 文档和使用示例
- 🧪 全面的测试覆盖（42 个测试用例）

### Features

- **HTTP 方法支持**：GET、POST、PUT、DELETE、PATCH、HEAD
- **配置选项**：baseURL、timeout、headers、credentials
- **查询参数**：自动 URL 参数拼接
- **请求体序列化**：自动 JSON 序列化，支持 FormData、Blob 等
- **响应解析**：根据 Content-Type 自动解析响应内容
- **拦截器链**：支持异步链式调用的请求/响应拦截器
- **错误处理**：标准化的错误对象，包含详细错误信息
- **请求取消**：支持 AbortController 和 AbortSignal
- **类型安全**：完整的 TypeScript 类型定义和泛型支持

### Technical Details

- **构建工具**：Vite + TypeScript
- **测试框架**：Vitest
- **代码质量**：ESLint + Prettier
- **包管理**：pnpm
- **模块格式**：ES Modules + CommonJS
- **类型声明**：完整的 .d.ts 文件

### Documentation

- 📖 详细的 README 文档
- 📚 完整的 API 参考文档
- 💡 丰富的使用示例
- 🏗️ 架构设计文档
- 🧪 测试用例文档

### Examples

- 基础 HTTP 请求示例
- 认证和授权示例
- 错误处理示例
- 文件上传示例
- 请求取消示例
- 拦截器使用示例
- TypeScript 集成示例
- React/Vue 集成示例
- Node.js 使用示例

---

## 版本说明

### 版本号规则

本项目遵循 [语义化版本控制](https://semver.org/lang/zh-CN/)：

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 发布计划

#### v0.1.x (基础阶段)

- ✅ v0.1.0 - 基础功能实现
- ✅ v0.1.1 - Git 提交规范配置
- ✅ v0.1.2 - 请求取消机制完善
- 🔄 v0.1.3 - 性能优化

#### v0.2.x (进阶阶段)

- 📋 v0.2.0 - 重试机制
- 📋 v0.2.1 - 请求队列
- 📋 v0.2.2 - 进度回调

#### v0.3.x (扩展阶段)

- 📋 v0.3.0 - 缓存机制
- 📋 v0.3.1 - 流式响应
- 📋 v0.3.2 - 插件系统

#### v1.0.0 (稳定版本)

- 📋 v1.0.0 - 正式稳定版本

### 兼容性

#### 浏览器支持

- Chrome 42+
- Firefox 39+
- Safari 10.1+
- Edge 14+

#### Node.js 支持

- Node.js 18+
- 支持 ES Modules 和 CommonJS

#### TypeScript 支持

- TypeScript 4.9+

### 迁移指南

#### 从 axios 迁移

FetchX 设计为 axios 的替代品，大部分 API 兼容：

```typescript
// axios
import axios from 'axios';
const api = axios.create({ baseURL: 'https://api.example.com' });

// FetchX
import { createFetchX } from 'fetchx';
const api = createFetchX({ baseURL: 'https://api.example.com' });

// API 使用基本相同
const data = await api.get('/users');
```

#### 主要差异

1. **响应格式**：FetchX 直接返回解析后的数据，不包装在 `data` 属性中
2. **错误处理**：错误直接抛出，不包装在响应对象中
3. **拦截器**：API 略有不同，但功能相同

### 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

### 致谢

- 感谢 [axios](https://github.com/axios/axios) 项目提供的优秀 API 设计灵感
- 感谢 [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) 的现代化实现
- 感谢 [TypeScript](https://www.typescriptlang.org/) 提供的类型安全支持
- 感谢所有贡献者和用户的支持
