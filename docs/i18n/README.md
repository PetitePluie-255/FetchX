# FetchX 国际化文档

本文档说明了 FetchX 项目的国际化（i18n）支持和如何添加新的语言版本。

## 🌐 支持的语言

目前支持以下语言：

- 🇺🇸 **English** - [README.en.md](README.en.md)
- 🇨🇳 **中文** - [README.zh.md](README.zh.md)

## 📁 文件结构

```
docs/i18n/
├── README.md          # 本文件 - 国际化说明
├── README.en.md       # 英文版 README
└── README.zh.md       # 中文版 README
```

## 🔧 如何添加新语言

### 1. 创建新的语言文件

为新语言创建 README 文件，命名格式为 `README.{语言代码}.md`：

```bash
# 例如添加日语支持
touch docs/i18n/README.ja.md
```

### 2. 翻译内容

将英文版 README 翻译为目标语言，保持以下结构：

- 标题和徽章
- 项目描述
- 特性列表
- 安装说明
- 快速开始
- 基础用法
- 拦截器
- 配置
- API 参考
- 错误处理
- 高级用法
- 从 Axios 迁移
- 测试
- 性能
- 贡献指南
- 许可证
- 致谢
- 语言选择链接

### 3. 更新语言选择页面

在以下文件中添加新语言的链接：

- `README.md` (主语言选择页面)
- `docs/README.md` (文档导航)
- 其他语言版本的 README 文件

### 4. 更新语言选择部分

在每个语言版本的 README 文件末尾，更新语言选择部分：

```markdown
## 🌐 Language / 语言

- [English](README.en.md)
- [中文](README.zh.md)
- [日本語](README.ja.md) <!-- 新添加的语言 -->
```

## 📝 翻译指南

### 保持一致性

- 使用相同的技术术语
- 保持代码示例不变
- 保持链接和引用正确
- 保持 markdown 格式一致

### 代码示例

代码示例中的注释可以翻译，但保持代码本身不变：

```typescript
// 英文版
const users = await api.get<User[]>('/users');

// 中文版
const users = await api.get<User[]>('/users'); // 获取用户列表
```

### 链接处理

确保所有内部链接都指向正确的文件：

```markdown
<!-- 英文版 -->

[Contributing Guide](CONTRIBUTING.md)

<!-- 中文版 -->

[贡献指南](CONTRIBUTING.md)
```

## 🎯 最佳实践

### 1. 版本控制

- 所有语言版本应该同步更新
- 在 CHANGELOG 中记录国际化更新
- 使用相同的提交信息格式

### 2. 质量保证

- 请母语使用者检查翻译质量
- 确保技术术语的准确性
- 测试所有链接的有效性

### 3. 维护

- 定期检查翻译的时效性
- 及时更新新功能的翻译
- 保持各语言版本的一致性

## 🔗 相关资源

- [Conventional Commits](https://www.conventionalcommits.org/) - 提交信息规范
- [Git Commit Guide](../GIT_COMMIT_GUIDE.md) - 项目提交指南
- [Contributing Guide](../../CONTRIBUTING.md) - 贡献指南

## 📞 贡献翻译

如果您想为 FetchX 项目贡献翻译，请：

1. Fork 项目
2. 创建新的语言文件
3. 完成翻译
4. 提交 Pull Request

我们欢迎所有语言的翻译贡献！

---

**注意**: 请确保翻译质量，并遵循项目的代码规范和提交规范。
