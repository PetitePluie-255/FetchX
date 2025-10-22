# 发布指南

本指南说明如何使用 commitlint、cz-git、husky 和 release-it 进行规范的 Git 提交和自动发布。

## 🔧 工具配置

### 已配置的工具

- **commitlint**: 提交信息格式验证
- **cz-git**: 交互式提交信息生成（中文界面）
- **husky**: Git 钩子管理
- **release-it**: 自动版本发布和 CHANGELOG 生成
- **@release-it/conventional-changelog**: 基于 Conventional Commits 的 CHANGELOG 生成

## 📝 提交流程

### 1. 开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发代码...

# 3. 添加文件到暂存区
git add .

# 4. 使用交互式提交（推荐）
pnpm commit
# 或
npx cz

# 5. 推送分支
git push origin feature/new-feature
```

### 2. 提交信息规范

使用 cz-git 交互式提交时，会看到中文界面：

```
? 选择你要提交的类型: feat: ✨ 新功能
? 选择一个提交范围 (可选): core
? 填写简短精炼的变更描述: 添加请求拦截器支持
? 填写更加详细的变更描述 (可选):
- 支持请求拦截器链式调用
- 支持异步拦截器
- 支持拦截器错误处理
? 列举非兼容性重大的变更 (可选):
? 列举关联issue (可选): #123
? 是否提交或修改commit? Yes
```

### 3. 自动检查

提交时会自动运行：

- **Pre-commit 钩子**: ESLint + Prettier 代码检查和格式化
- **Commit-msg 钩子**: commitlint 提交信息格式验证

## 🚀 发布流程

### 1. 准备发布

确保所有更改都已提交并推送到 main 分支：

```bash
# 确保工作区干净
git status

# 确保所有测试通过
pnpm test

# 确保代码检查通过
pnpm lint
pnpm type-check
```

### 2. 发布命令

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

### 3. 发布过程

release-it 会自动执行以下步骤：

1. **预检查**:
   - 运行测试 (`pnpm test`)
   - 代码检查 (`pnpm lint`)
   - 类型检查 (`pnpm type-check`)
   - 构建项目 (`pnpm build`)

2. **版本管理**:
   - 根据提交信息自动确定版本类型
   - 更新 `package.json` 中的版本号
   - 生成 Git 标签

3. **CHANGELOG 生成**:
   - 基于 Conventional Commits 自动生成 CHANGELOG.md
   - 包含所有提交的变更记录

4. **发布**:
   - 提交版本变更
   - 创建 Git 标签
   - 推送到远程仓库
   - 发布到 npm（如果配置了 NPM_TOKEN）

## 📋 版本规则

### 自动版本确定

release-it 会根据提交信息自动确定版本类型：

- **feat**: 新功能 → minor 版本 (0.1.0 → 0.2.0)
- **fix**: 修复 → patch 版本 (0.1.0 → 0.1.1)
- **BREAKING CHANGE**: 破坏性变更 → major 版本 (0.1.0 → 1.0.0)

### 提交类型说明

| 类型       | 描述     | 版本影响 |
| ---------- | -------- | -------- |
| `feat`     | 新功能   | minor    |
| `fix`      | 修复 bug | patch    |
| `docs`     | 文档变更 | patch    |
| `style`    | 代码格式 | patch    |
| `refactor` | 代码重构 | patch    |
| `perf`     | 性能优化 | patch    |
| `test`     | 测试相关 | patch    |
| `build`    | 构建相关 | patch    |
| `ci`       | CI 相关  | patch    |
| `chore`    | 其他变更 | patch    |

## 🔄 GitHub Actions 自动化

项目配置了 GitHub Actions 工作流，当推送标签到 main 分支时会自动：

1. 运行测试和检查
2. 构建项目
3. 发布到 npm
4. 创建 GitHub Release

### 触发条件

```yaml
on:
  push:
    branches:
      - main
    tags:
      - 'v*'
```

## 📖 CHANGELOG 格式

自动生成的 CHANGELOG.md 遵循 [Keep a Changelog](https://keepachangelog.com/) 格式：

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added

- 新功能 A
- 新功能 B

### Changed

- 改进功能 C

### Fixed

- 修复 bug D

### Breaking Changes

- 破坏性变更 E
```

## 🛠️ 配置说明

### release-it 配置 (.release-it.json)

```json
{
  "_comment": "npm 发布配置：正式版发布时将 'publish' 改为 true",
  "git": {
    "commitMessage": "chore: release v${version}",
    "tagName": "v${version}",
    "requireCleanWorkingDir": true
  },
  "github": {
    "release": true,
    "releaseName": "Release v${version}"
  },
  "npm": {
    "publish": false, // 开发阶段关闭，正式版时改为 true
    "access": "public"
  },
  "plugins": {
    "@release-it/conventional-changelog": {
      "preset": "conventionalcommits",
      "infile": "CHANGELOG.md"
    }
  }
}
```

### npm 发布配置

**开发阶段**：

- `"publish": false` - 不发布到 npm，只进行本地版本管理

**正式版发布时**：

1. 修改 `.release-it.json` 中的配置：

   ```json
   "npm": {
     "publish": true,  // 改为 true
     "access": "public"
   }
   ```

2. 配置 NPM_TOKEN 环境变量：

   ```bash
   # 在 GitHub Secrets 中添加 NPM_TOKEN
   # 或在本地环境变量中设置
   export NPM_TOKEN=your_npm_token
   ```

3. 执行发布：
   ```bash
   pnpm release
   ```

## 📋 文件类型校验

项目集成了智能文件类型校验功能，会根据提交的文件类型自动提示正确的提交类型。

### 校验规则

| 文件类型        | 允许的提交类型                             | 说明       |
| --------------- | ------------------------------------------ | ---------- |
| `src/**/*.ts`   | `feat`, `fix`, `refactor`, `perf`, `style` | 源代码文件 |
| `tests/**/*.ts` | `test`, `feat`, `fix`                      | 测试文件   |
| `docs/**/*.md`  | `docs`                                     | 文档文件   |
| `package.json`  | `deps`, `build`, `chore`                   | 依赖管理   |
| `*.config.*`    | `build`, `chore`                           | 配置文件   |
| `.github/**/*`  | `ci`, `build`, `chore`                     | CI 配置    |

### 使用方式

1. **自动检查**：每次提交时会自动运行文件类型检查
2. **手动检查**：使用 `pnpm check-file-types` 手动检查
3. **智能提示**：检查失败时会显示建议的提交类型

### 示例

```bash
# 提交文档文件时
git add README.md
git commit -m "docs: update README"  # ✅ 正确

# 提交源代码文件时
git add src/utils.ts
git commit -m "feat: add utility function"  # ✅ 正确
git commit -m "docs: add utility function"  # ⚠️ 会提示使用 feat
```

## 🚨 故障排除

### 常见问题

1. **提交信息格式错误**

   ```
   Error: commit message format is invalid
   ```

   解决：使用 `pnpm commit` 或确保提交信息符合 Conventional Commits 格式

2. **工作区不干净**

   ```
   Error: Working directory is not clean
   ```

   解决：提交或暂存所有更改

3. **测试失败**

   ```
   Error: Tests failed
   ```

   解决：修复测试问题后再发布

4. **npm 发布失败**
   ```
   Error: npm publish failed
   ```
   解决：检查 NPM_TOKEN 配置和包名是否可用

### 回滚发布

如果发布出现问题，可以回滚：

```bash
# 删除标签
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# 回滚版本
git reset --hard HEAD~1
git push origin main --force
```

## 📚 相关链接

- [Conventional Commits](https://www.conventionalcommits.org/)
- [cz-git](https://cz-git.qbb.sh/)
- [release-it](https://github.com/release-it/release-it)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
