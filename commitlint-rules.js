/**
 * 自定义 commitlint 规则
 * 根据提交的文件类型自动校验提交类型
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import minimatch from 'minimatch';

// 文件类型映射规则
const FILE_TYPE_MAPPING = {
  // 源代码文件
  'src/**/*.ts': ['feat', 'fix', 'refactor', 'perf', 'style'],
  'src/**/*.js': ['feat', 'fix', 'refactor', 'perf', 'style'],

  // 测试文件
  'tests/**/*.ts': ['test', 'feat', 'fix'],
  'tests/**/*.js': ['test', 'feat', 'fix'],
  '**/*.test.ts': ['test', 'feat', 'fix'],
  '**/*.test.js': ['test', 'feat', 'fix'],
  '**/*.spec.ts': ['test', 'feat', 'fix'],
  '**/*.spec.js': ['test', 'feat', 'fix'],

  // 文档文件
  'docs/**/*.md': ['docs'],
  'README.md': ['docs'],
  'CHANGELOG.md': ['docs'],
  'CONTRIBUTING.md': ['docs'],
  '**/*.md': ['docs'],

  // 配置文件
  'package.json': ['deps', 'build', 'chore'],
  'pnpm-lock.yaml': ['deps', 'build', 'chore'],
  'tsconfig*.json': ['build', 'chore'],
  'vite.config.ts': ['build', 'chore'],
  'vitest.config.ts': ['build', 'chore'],
  'eslint.config.js': ['build', 'chore'],
  'commitlint.config.js': ['build', 'chore'],
  '.release-it.json': ['build', 'chore'],
  '.github/**/*': ['ci', 'build', 'chore'],

  // 构建文件
  'dist/**/*': ['build', 'chore'],

  // 其他文件
  '**/*.json': ['build', 'chore', 'deps'],
  '**/*.yml': ['ci', 'build', 'chore'],
  '**/*.yaml': ['ci', 'build', 'chore'],
};

/**
 * 获取提交的文件列表
 */
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', {
      encoding: 'utf8',
    });
    return output
      .trim()
      .split('\n')
      .filter(file => file.length > 0);
  } catch (error) {
    console.warn('无法获取暂存文件列表:', error.message);
    return [];
  }
}

/**
 * 检查文件是否匹配模式
 */
function matchesPattern(filePath, pattern) {
  return minimatch(filePath, pattern);
}

/**
 * 根据文件类型获取允许的提交类型
 */
function getAllowedTypesForFiles(files) {
  const allowedTypes = new Set();

  for (const file of files) {
    for (const [pattern, types] of Object.entries(FILE_TYPE_MAPPING)) {
      if (matchesPattern(file, pattern)) {
        types.forEach(type => allowedTypes.add(type));
      }
    }
  }

  return Array.from(allowedTypes);
}

/**
 * 文件类型校验规则
 */
function fileTypeValidation(parsed, when = 'always') {
  const { type, scope } = parsed;
  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    return [true]; // 没有文件变更，跳过校验
  }

  const allowedTypes = getAllowedTypesForFiles(stagedFiles);

  if (allowedTypes.length === 0) {
    return [true]; // 没有匹配的文件类型规则，跳过校验
  }

  const isValid = allowedTypes.includes(type);

  if (!isValid) {
    const fileList = stagedFiles.join(', ');
    const allowedTypesList = allowedTypes.join(', ');

    return [
      false,
      `提交类型 "${type}" 与文件类型不匹配。
文件: ${fileList}
允许的类型: ${allowedTypesList}
建议使用: ${allowedTypes[0]}`,
    ];
  }

  return [true];
}

export default {
  'file-type': fileTypeValidation,
};
