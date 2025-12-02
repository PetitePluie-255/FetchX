import { defineConfig } from 'cz-git';

export default defineConfig({
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // 修复
        'docs', // 文档变更
        'style', // 代码格式（不影响功能，例如空格、分号等）
        'refactor', // 代码重构（既不是新增功能，也不是修复bug）
        'perf', // 性能优化
        'test', // 增加测试
        'build', // 构建过程或辅助工具的变动
        'ci', // 修改 CI 配置文件和脚本
        'chore', // 构建过程或辅助工具的变动
        'revert', // 回滚
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
    // 文件类型校验规则 - 暂时禁用，避免循环依赖
    // 'file-type': [2, 'always'],
  },
  prompt: {
    types: [
      {
        value: 'feat',
        name: 'feat:     ✨  新功能',
        title: '新功能',
      },
      {
        value: 'fix',
        name: 'fix:      🐛  修复',
        title: '修复',
      },
      {
        value: 'docs',
        name: 'docs:     📝  文档变更',
        title: '文档变更',
      },
      {
        value: 'style',
        name: 'style:    💄  代码格式（不影响功能，例如空格、分号等）',
        title: '代码格式',
      },
      {
        value: 'refactor',
        name: 'refactor: ♻️  代码重构（既不是新增功能，也不是修复bug）',
        title: '代码重构',
      },
      {
        value: 'perf',
        name: 'perf:     ⚡️  性能优化',
        title: '性能优化',
      },
      {
        value: 'test',
        name: 'test:     ✅  增加测试',
        title: '增加测试',
      },
      {
        value: 'build',
        name: 'build:    📦️  构建过程或辅助工具的变动',
        title: '构建过程',
      },
      {
        value: 'ci',
        name: 'ci:       🎯  修改 CI 配置文件和脚本',
        title: 'CI 配置',
      },
      {
        value: 'chore',
        name: 'chore:    🔨  构建过程或辅助工具的变动',
        title: '构建过程',
      },
      {
        value: 'revert',
        name: 'revert:   ⏪️  回滚',
        title: '回滚',
      },
    ],
    scopes: [
      {
        value: 'core',
        name: 'core:     核心功能',
      },
      {
        value: 'interceptors',
        name: 'interceptors: 拦截器',
      },
      {
        value: 'utils',
        name: 'utils:    工具函数',
      },
      {
        value: 'types',
        name: 'types:    类型定义',
      },
      {
        value: 'docs',
        name: 'docs:     文档',
      },
      {
        value: 'tests',
        name: 'tests:    测试',
      },
      {
        value: 'config',
        name: 'config:   配置',
      },
      {
        value: 'deps',
        name: 'deps:     依赖',
      },
    ],
    messages: {
      type: '选择你要提交的类型:',
      scope: '选择一个提交范围 (可选):',
      customScope: '请输入自定义的提交范围:',
      subject: '填写简短精炼的变更描述:',
      body: '填写更加详细的变更描述 (可选). 使用 "|" 换行:',
      breaking: '列举非兼容性重大的变更 (可选). 使用 "|" 换行:',
      footerPrefixSelect: '选择关联issue前缀 (可选):',
      customFooterPrefix: '输入自定义issue前缀:',
      footer: '列举关联issue (可选) 例如: #31, #I3244:',
      confirmCommit: '是否提交或修改commit?',
    },
    // 文件类型提示
    useAI: false,
    useCommitizen: true,
    useEmoji: true,
    emojiAlign: 'center',
    aiNumber: 1,
    themeColorCode: '',
    allowCustomScopes: true,
    allowEmptyScopes: true,
    customScopesAlign: 'bottom',
    customScopesAlias: 'custom',
    emptyScopesAlias: 'empty',
    upperCaseSubject: false,
    markBreakingChangeMode: false,
    allowBreakingChanges: ['feat', 'fix'],
    breaklineNumber: 100,
    breaklineChar: '|',
    skipQuestions: [],
    issuePrefixes: [
      {
        value: 'closed',
        name: 'closed:   ISSUES has been processed',
      },
    ],
    customIssuePrefixAlign: 'top',
    emptyIssuePrefixAlias: 'skip',
    customIssuePrefixAlias: 'custom',
    allowCustomIssuePrefix: true,
    allowEmptyIssuePrefix: true,
    confirmColorize: true,
    maxHeaderLength: 100,
    maxSubjectLength: 150,
    minSubjectLength: 0,
    scopeOverrides: null,
    defaultBody: '',
    defaultIssues: '',
    defaultScope: '',
    defaultSubject: '',
  },
});
