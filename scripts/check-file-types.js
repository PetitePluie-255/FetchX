#!/usr/bin/env node
/**
 * 根据暂存文件类型校验提交类型是否合理
 */

import { execSync } from 'child_process';
import fs from 'fs';

const RULES = [
  [/^packages\/[^/]+\/src\/.*\.(ts|js)$/, ['feat', 'fix', 'refactor', 'perf', 'style']],
  [/\/test(s)?\//, ['test', 'feat', 'fix']],
  [/\.(test|spec)\.(ts|js)$/, ['test', 'feat', 'fix']],
  [/\.md$/, ['docs']],
  [/^(package\.json|pnpm-lock\.yaml)$/, ['deps', 'build', 'chore']],
  [/^packages\/[^/]+\/(tsconfig|vite\.config|vitest\.config)\./, ['build', 'chore']],
  [/^(tsconfig\.base|tsconfig\.eslint|eslint\.config|commitlint\.config|\.lintstagedrc)/, ['build', 'chore']],
];

const files = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

if (files.length === 0) process.exit(0);

const msg = fs.readFileSync(process.argv[2], 'utf8').trim();
const type = msg.split(':')[0].split('(')[0];

const allowed = new Set();
for (const f of files) {
  for (const [re, types] of RULES) {
    if (re.test(f)) types.forEach(t => allowed.add(t));
  }
}

const list = [...allowed];
if (list.length === 0 || list.includes(type)) {
  console.log('✅ 文件类型校验通过');
  process.exit(0);
}

console.log(`❌ 提交类型 "${type}" 与文件不匹配`);
console.log(`   文件: ${files.join(', ')}`);
console.log(`   可用: ${list.join(', ')}`);
process.exit(1);
