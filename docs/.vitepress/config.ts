import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'FetchX',
  description:
    'A modern HTTP client library based on fetch API with axios-like interface',
  lang: 'zh-CN',
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: '插件', link: '/plugins/logger' },
      { text: 'API', link: '/api/reference' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '基础用法', link: '/guide/basic-usage' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '请求配置', link: '/guide/request-config' },
            { text: '拦截器', link: '/guide/interceptors' },
            { text: '错误处理', link: '/guide/error-handling' },
            { text: '取消请求', link: '/guide/cancellation' },
            { text: '进度监听', link: '/guide/progress' },
          ],
        },
        {
          text: '高级功能',
          items: [
            { text: '请求重试', link: '/guide/retry' },
            { text: '请求缓存', link: '/guide/cache' },
            { text: '并发控制', link: '/guide/concurrency' },
            { text: '请求去重', link: '/guide/dedupe' },
            { text: '防抖与节流', link: '/guide/debounce-throttle' },
            { text: '流式请求', link: '/guide/streaming' },
          ],
        },
        {
          text: '插件系统',
          items: [
            { text: '插件开发', link: '/guide/plugin-development' },
          ],
        },
      ],
      '/plugins/': [
        {
          text: '官方插件',
          items: [{ text: '日志插件', link: '/plugins/logger' }],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '完整参考', link: '/api/reference' },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/PetitePluie-255/FetchX',
      },
    ],

    footer: {
      message: 'MIT License',
      copyright: 'Copyright 2026 PetitePluie-255',
    },

    editLink: {
      pattern: 'https://github.com/PetitePluie-255/FetchX/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新',
    },
  },
});
