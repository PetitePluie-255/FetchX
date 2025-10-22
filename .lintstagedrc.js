module.exports = {
  // TypeScript 和 JavaScript 文件
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],

  // JSON 和 Markdown 文件
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
