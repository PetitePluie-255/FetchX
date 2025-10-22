#!/usr/bin/env node

/**
 * 文件类型校验脚本
 * 根据提交的文件类型提示用户使用正确的提交类型
 */

import { execSync } from 'child_process';
import { minimatch } from 'minimatch';
import fs from 'fs';

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
  'commitlint.config.*': ['build', 'chore'],
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
 * 根据文件类型获取允许的提交类型
 */
function getAllowedTypesForFiles(files) {
  const allowedTypes = new Set();

  for (const file of files) {
    for (const [pattern, types] of Object.entries(FILE_TYPE_MAPPING)) {
      if (minimatch(file, pattern)) {
        types.forEach(type => allowedTypes.add(type));
      }
    }
  }

  return Array.from(allowedTypes);
}

/**
 * 获取提交信息
 */
function getCommitMessage() {
  // 从 commit-msg hook 参数中获取提交信息文件路径
  const commitMsgFile = process.argv[2] || '.git/COMMIT_EDITMSG';

  try {
    if (fs.existsSync(commitMsgFile)) {
      return fs.readFileSync(commitMsgFile, 'utf8').trim();
    }
  } catch (error) {
    // 忽略错误，继续尝试其他方法
  }

  // 如果无法从文件获取，尝试从 git log 获取
  try {
    const output = execSync('git log -1 --pretty=%B', { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    return '';
  }
}

/**
 * 主函数
 */
function main() {
  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    console.log('✅ 没有文件需要提交');
    return;
  }

  const allowedTypes = getAllowedTypesForFiles(stagedFiles);

  if (allowedTypes.length === 0) {
    console.log('⚠️  无法确定文件类型，请手动选择提交类型');
    return;
  }

  const commitMessage = getCommitMessage();
  const commitType = commitMessage.split(':')[0];

  if (allowedTypes.includes(commitType)) {
    console.log(`✅ 提交类型 "${commitType}" 与文件类型匹配`);
    return;
  }

  // 显示建议
  console.log('\n📋 文件类型校验结果:');
  console.log(`📁 提交文件: ${stagedFiles.join(', ')}`);
  console.log(`❌ 当前提交类型: "${commitType}"`);
  console.log(`✅ 建议的提交类型: ${allowedTypes.join(', ')}`);
  console.log('\n💡 提示:');
  console.log('   - 文档文件 (*.md) 建议使用 "docs" 类型');
  console.log(
    '   - 源代码文件 (src/**/*.ts) 建议使用 "feat", "fix", "refactor" 等'
  );
  console.log('   - 测试文件 (tests/**/*.ts) 建议使用 "test" 类型');
  console.log('   - 配置文件建议使用 "build", "chore", "deps" 等');
  console.log('\n🔄 请使用以下命令重新提交:');
  console.log('   pnpm commit');

  // 阻止提交，返回错误码
  process.exit(1);
}

main();
