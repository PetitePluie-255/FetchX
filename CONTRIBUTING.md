# 贡献指南

感谢您对 FetchX 项目的关注！我们欢迎所有形式的贡献，包括但不限于：

- 🐛 报告 Bug
- ✨ 提出新功能建议
- 📝 改进文档
- 🔧 提交代码
- 🧪 编写测试
- 📢 分享使用经验

## 开发环境设置

### 前置要求

- Node.js 18+
- pnpm 8+
- Git

### 安装步骤

1. **Fork 并克隆项目**

   ```bash
   git clone https://github.com/your-username/fetchx.git
   cd fetchx
   ```

2. **安装依赖**

   ```bash
   pnpm install
   ```

3. **运行测试**

   ```bash
   pnpm test
   ```

4. **启动开发模式**
   ```bash
   pnpm dev
   ```

## 开发流程

### 1. 创建分支

```bash
# 从 main 分支创建新分支
git checkout -b feature/your-feature-name

# 或者修复 bug
git checkout -b fix/your-bug-fix
```

### 2. 开发规范

#### 代码风格

- 使用 TypeScript 编写所有代码
- 遵循 ESLint 和 Prettier 配置
- 使用 camelCase 命名变量和函数
- 使用 PascalCase 命名类型和接口

#### 提交信息规范

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，并集成了以下工具来确保提交质量：

- **commitizen**: 交互式提交信息生成
- **cz-git**: 中文友好的commitizen适配器
- **husky**: Git钩子管理
- **lint-staged**: 暂存文件自动检查
- **@commitlint**: 提交信息格式验证
- **文件类型校验**: 智能校验提交类型与文件类型的匹配性

##### 文件类型校验

项目会根据提交的文件类型自动提示正确的提交类型，避免文档变更被错误归类到功能日志中。

**校验规则**：

- 📁 源代码文件 (`src/**/*.ts`) → `feat`, `fix`, `refactor`, `perf`, `style`
- 🧪 测试文件 (`tests/**/*.ts`) → `test`, `feat`, `fix`
- 📝 文档文件 (`docs/**/*.md`, `*.md`) → `docs`
- ⚙️ 配置文件 (`*.config.*`) → `build`, `chore`
- 📦 依赖文件 (`package.json`) → `deps`, `build`, `chore`
- 🔧 CI 配置 (`.github/**/*`) → `ci`, `build`, `chore`

##### 推荐使用方式

```bash
# 使用交互式提交（推荐）
pnpm commit
# 或
npx cz
```

##### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

##### 提交类型

| 类型       | 描述                     | 示例                                         |
| ---------- | ------------------------ | -------------------------------------------- |
| `feat`     | 新功能                   | `feat(core): 添加请求拦截器支持`             |
| `fix`      | 修复bug                  | `fix(utils): 修复URL拼接问题`                |
| `docs`     | 文档变更                 | `docs: 更新API文档`                          |
| `style`    | 代码格式（不影响功能）   | `style: 修复代码格式问题`                    |
| `refactor` | 代码重构                 | `refactor(types): 重构类型定义`              |
| `perf`     | 性能优化                 | `perf(core): 优化请求性能`                   |
| `test`     | 增加测试                 | `test(utils): 添加工具函数测试`              |
| `build`    | 构建过程或辅助工具的变动 | `build: 更新构建配置`                        |
| `ci`       | 修改CI配置文件和脚本     | `ci: 添加GitHub Actions`                     |
| `chore`    | 构建过程或辅助工具的变动 | `chore: 更新依赖版本`                        |
| `revert`   | 回滚                     | `revert: 回滚feat(core): 添加请求拦截器支持` |

##### 作用域

| 范围           | 描述     |
| -------------- | -------- |
| `core`         | 核心功能 |
| `interceptors` | 拦截器   |
| `utils`        | 工具函数 |
| `types`        | 类型定义 |
| `docs`         | 文档     |
| `tests`        | 测试     |
| `config`       | 配置     |
| `deps`         | 依赖     |

##### 示例

```bash
# 功能新增
git commit -m "feat(core): 添加请求拦截器支持"

# 修复 bug
git commit -m "fix(utils): 修复URL拼接问题"

# 文档更新
git commit -m "docs: 更新API文档"

# 重构代码
git commit -m "refactor(types): 重构类型定义"

# 性能优化
git commit -m "perf(core): 优化请求性能"

# 测试相关
git commit -m "test(utils): 添加工具函数测试"
```

##### 自动化检查

- **Pre-commit钩子**: 自动运行ESLint和Prettier检查暂存文件
- **Commit-msg钩子**: 自动验证提交信息格式

详细说明请参考 [Git提交规范指南](docs/GIT_COMMIT_GUIDE.md)。

#### 类型定义

- 所有公共 API 必须有完整的类型定义
- 使用泛型提供类型安全
- 避免使用 `any` 类型

#### 测试要求

- 新功能必须包含测试用例
- 测试覆盖率不能低于 90%
- 使用描述性的测试名称

### 3. 运行检查

在提交代码前，请运行以下命令：

```bash
# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 运行测试
pnpm test

# 测试覆盖率
pnpm test:coverage

# 构建项目
pnpm build
```

### 4. 提交 Pull Request

1. **推送分支**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **创建 Pull Request**
   - 在 GitHub 上创建 Pull Request
   - 填写详细的描述信息
   - 关联相关的 Issue（如果有）

3. **Pull Request 模板**

   ```markdown
   ## 变更描述

   简要描述本次变更的内容和目的。

   ## 变更类型

   - [ ] Bug 修复
   - [ ] 新功能
   - [ ] 破坏性变更
   - [ ] 文档更新
   - [ ] 性能优化
   - [ ] 重构

   ## 测试

   - [ ] 添加了新的测试用例
   - [ ] 所有测试通过
   - [ ] 测试覆盖率符合要求

   ## 检查清单

   - [ ] 代码遵循项目规范
   - [ ] 类型定义完整
   - [ ] 文档已更新
   - [ ] 无 ESLint 错误
   - [ ] 无 TypeScript 错误

   ## 相关 Issue

   关联的 Issue: #123
   ```

## 代码规范

### TypeScript 规范

```typescript
// ✅ 好的示例
interface User {
  id: number;
  name: string;
  email: string;
}

const createUser = async (userData: CreateUserRequest): Promise<User> => {
  // 实现
};

// ❌ 避免的示例
const createUser = async (userData: any): Promise<any> => {
  // 避免使用 any
};
```

### 错误处理

```typescript
// ✅ 好的示例
try {
  const data = await api.get('/users');
  return data;
} catch (error) {
  if (error instanceof FetchXError) {
    throw new UserFriendlyError(error.message);
  }
  throw error;
}

// ❌ 避免的示例
try {
  const data = await api.get('/users');
  return data;
} catch (error) {
  console.log(error); // 不要直接打印错误
  return null; // 不要静默失败
}
```

### 测试规范

```typescript
// ✅ 好的示例
describe('createFetchX', () => {
  it('should create instance with default config', () => {
    const api = createFetchX();
    expect(api).toBeDefined();
    expect(api.get).toBeDefined();
  });

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const api = createFetchX();
    await expect(api.get('/test')).rejects.toThrow('Network error');
  });
});

// ❌ 避免的示例
it('test', () => {
  // 测试名称不够描述性
  const api = createFetchX();
  expect(api).toBeDefined();
});
```

## 文档规范

### API 文档

- 所有公共 API 必须有 JSDoc 注释
- 包含参数说明、返回值说明和示例
- 使用 TypeScript 类型注解

````typescript
/**
 * 创建 FetchX 实例
 * @param config - 可选的配置对象
 * @returns FetchX 实例
 * @example
 * ```typescript
 * const api = createFetchX({
 *   baseURL: 'https://api.example.com',
 *   timeout: 5000
 * });
 * ```
 */
export function createFetchX(config?: FetchXConfig): FetchXInstance {
  // 实现
}
````

### README 更新

- 新功能需要更新 README
- 提供使用示例
- 更新特性列表

### 变更日志

- 所有变更都需要在 CHANGELOG.md 中记录
- 遵循 [Keep a Changelog](https://keepachangelog.com/) 格式

## 报告 Bug

### Bug 报告模板

````markdown
## Bug 描述

简要描述 bug 的内容。

## 重现步骤

1. 执行 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

## 预期行为

描述您期望发生的情况。

## 实际行为

描述实际发生的情况。

## 环境信息

- OS: [e.g. macOS 12.0]
- Node.js 版本: [e.g. 18.0.0]
- FetchX 版本: [e.g. 0.1.0]
- 浏览器: [e.g. Chrome 91]

## 代码示例

```typescript
// 提供重现 bug 的最小代码示例
```
````

## 额外信息

添加任何其他相关的上下文信息。

````

## 功能建议

### 功能建议模板

```markdown
## 功能描述
简要描述您希望添加的功能。

## 使用场景
描述这个功能的使用场景和解决的问题。

## 实现建议
如果您有实现建议，请提供。

## 替代方案
描述您考虑过的其他解决方案。

## 额外信息
添加任何其他相关的上下文信息。
````

## 发布流程

项目使用 release-it 进行自动化发布，支持基于 Conventional Commits 的自动版本管理和 CHANGELOG 生成。

### 自动发布步骤

1. **准备发布**

   ```bash
   # 确保所有更改已提交
   git status

   # 确保测试通过
   pnpm test
   pnpm lint
   pnpm type-check
   ```

2. **执行发布**

   ```bash
   # 交互式发布（推荐）
   pnpm release

   # 指定版本类型发布
   pnpm release:patch  # 0.1.0 -> 0.1.1
   pnpm release:minor  # 0.1.0 -> 0.2.0
   pnpm release:major  # 0.1.0 -> 1.0.0

   # 预览发布（不实际发布）
   pnpm release:dry
   ```

3. **自动执行的操作**
   - 运行测试和代码检查
   - 根据提交信息自动确定版本类型
   - 更新 package.json 版本号
   - 生成 CHANGELOG.md
   - 创建 Git 标签
   - 推送到远程仓库
   - 发布到 npm（如果配置了 NPM_TOKEN）

### 版本规则

- **feat**: 新功能 → minor 版本
- **fix**: 修复 → patch 版本
- **BREAKING CHANGE**: 破坏性变更 → major 版本
- 其他类型 → patch 版本

详细说明请参考 [发布指南](docs/RELEASE_GUIDE.md)。

## 社区准则

### 行为准则

我们承诺为每个人提供友好、安全、包容的环境，无论：

- 经验水平
- 性别认同和表达
- 性取向
- 残疾
- 个人外貌
- 种族
- 民族
- 年龄
- 宗教
- 国籍

### 期望行为

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 挑衅、侮辱或贬损性评论
- 公开或私人骚扰
- 未经许可发布他人私人信息
- 其他在专业环境中不当的行为

## 联系方式

- **Issues**: [GitHub Issues](https://github.com/your-username/fetchx/issues)
- **讨论**: [GitHub Discussions](https://github.com/your-username/fetchx/discussions)
- **邮件**: your-email@example.com

## 许可证

通过贡献代码，您同意您的贡献将在 MIT 许可证下发布。

---

再次感谢您的贡献！🎉
