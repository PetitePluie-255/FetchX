# Git 工作流配置完成

## 🎉 配置完成

FetchX 项目已成功配置了完整的 Git 工作流，包括：

### ✅ 已安装的工具

- **commitizen** - 交互式提交信息生成器
- **cz-git** - 中文友好的 commitizen 适配器
- **husky** - Git 钩子管理工具
- **lint-staged** - 暂存文件检查工具
- **@commitlint/cli** - 提交信息检查工具
- **@commitlint/config-conventional** - 标准提交规范

### ✅ 配置文件

1. **package.json** - 添加了相关脚本和配置
2. **.czrc** - commitizen 配置文件
3. **.cz.json** - cz-git 详细配置
4. **commitlint.config.js** - 提交信息检查规则
5. **.lintstagedrc.js** - 暂存文件检查配置
6. **.husky/** - Git 钩子目录
   - `commit-msg` - 提交信息检查钩子
   - `pre-commit` - 提交前代码检查钩子

### ✅ 文档

- **docs/GIT_COMMIT_GUIDE.md** - 详细的提交规范说明
- **docs/GIT_SETUP.md** - Git 配置说明（本文件）

## 🚀 使用方法

### 1. 使用 commitizen 提交

```bash
# 使用交互式提交
pnpm commit

# 或者直接使用
npx cz
```

### 2. 手动提交

```bash
# 遵循提交规范
git commit -m "feat(core): add new feature"
```

### 3. 提交类型

| 类型       | 描述     | 示例                             |
| ---------- | -------- | -------------------------------- |
| `feat`     | 新功能   | `feat: add retry mechanism`      |
| `fix`      | 修复 bug | `fix: handle timeout error`      |
| `docs`     | 文档变更 | `docs: update API docs`          |
| `style`    | 代码格式 | `style: fix formatting`          |
| `refactor` | 代码重构 | `refactor: optimize code`        |
| `perf`     | 性能优化 | `perf: improve performance`      |
| `test`     | 增加测试 | `test: add unit tests`           |
| `build`    | 构建过程 | `build: update config`           |
| `ci`       | CI 配置  | `ci: add GitHub Actions`         |
| `chore`    | 其他变更 | `chore: update deps`             |
| `revert`   | 回滚     | `revert: revert previous commit` |

### 4. 提交范围

| 范围           | 描述     | 示例                               |
| -------------- | -------- | ---------------------------------- |
| `core`         | 核心功能 | `feat(core): add request method`   |
| `interceptors` | 拦截器   | `fix(interceptors): handle errors` |
| `utils`        | 工具函数 | `refactor(utils): optimize code`   |
| `types`        | 类型定义 | `feat(types): add interface`       |
| `docs`         | 文档     | `docs(docs): update examples`      |
| `tests`        | 测试     | `test(tests): add cases`           |
| `config`       | 配置     | `chore(config): update rules`      |
| `deps`         | 依赖     | `chore(deps): update packages`     |

## 🔧 工作流程

### 提交前检查

1. **pre-commit 钩子**：
   - 运行 lint-staged
   - 自动格式化代码
   - 运行 ESLint 检查

2. **commit-msg 钩子**：
   - 检查提交信息格式
   - 验证提交类型和范围

### 提交流程

```bash
# 1. 添加文件到暂存区
git add .

# 2. 使用 commitizen 提交
pnpm commit

# 3. 或者手动提交
git commit -m "feat(core): add new feature"
```

## 📝 提交信息格式

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 示例

```bash
# 基础提交
feat: add request timeout support

# 带范围的提交
feat(core): add request timeout support

# 详细提交
feat(core): add request timeout support

Add configurable timeout option to all HTTP methods.
Uses AbortController for proper request cancellation.

Closes #123
```

## 🛠️ 故障排除

### 跳过钩子检查

```bash
# 紧急情况下跳过所有检查
git commit --no-verify -m "feat: add feature"
```

### 修复配置问题

如果遇到配置问题，可以：

1. 检查配置文件语法
2. 重新安装依赖
3. 重新初始化 husky

```bash
# 重新安装依赖
pnpm install

# 重新初始化 husky
pnpm prepare
```

## 📚 相关文档

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Commitizen](https://github.com/commitizen/cz-cli)
- [cz-git](https://github.com/Zhengqbbb/cz-git)
- [Husky](https://github.com/typicode/husky)
- [Lint-staged](https://github.com/okonet/lint-staged)
- [Commitlint](https://github.com/conventional-changelog/commitlint)

## 🎯 最佳实践

1. **频繁提交**：每次提交只做一件事
2. **清晰描述**：使用清晰、描述性的提交信息
3. **遵循规范**：严格按照提交规范格式
4. **代码质量**：提交前确保代码格式化
5. **测试通过**：确保所有测试通过

---

现在你的 FetchX 项目已经拥有了完整的 Git 工作流配置！🎉
