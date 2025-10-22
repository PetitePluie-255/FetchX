# FetchX 设计文档（基础阶段）

基于 fetch 的 axios 风格 HTTP 工具库

---

## 技术栈

- **使用pnpm作为包管理器**
- **使用vite作为项目管理工具**
- **使用eslint作为项目语法检查工具**
- **使用prettier作为项目格式化工具（以prettier风格优先）**
- **使用vitest作为测试框架**
- **使用c8作为代码覆盖率工具**
- **单包架构**（当前阶段，未来可考虑monorepo）

---

## 一、设计目标

- **采用原生 fetch 替换 XMLHttpRequest**
- **提供 axios 风格 API**（实例化、拦截器、简便请求、错误处理等）
- **TypeScript 全类型安全友好**
- **便于进一步扩展（如重试、取消、流式处理等）**

---

## 二、核心架构

1. **实例化配置**
   - `createFetchX(config)`
   - 支持 `baseURL`、`headers`、`timeout` 等全局配置

2. **拦截器机制**
   - `request` 拦截器：请求前统一处理（如自动加 token）
   - `response` 拦截器：统一响应解包/错误抛出
   - 拦截器支持异步链式调用

3. **请求方法集合**
   - `get` / `post` / `put` / `delete` / `patch` / `head`
   - 方法签名贴合 axios，支持 `params`、`body`、`headers`、`timeout` 等

4. **统一错误处理**
   - 网络错误/非 2xx HTTP 状态统一 Promise reject
   - 错误对象标准化

5. **类型安全**
   - 请求、响应、拦截器均支持强类型/泛型

---

## 三、类型与接口设计（TypeScript 示意）

```ts
export interface FetchXConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  credentials?: RequestCredentials;
  [key: string]: any;
}

export interface RequestOptions extends Omit<FetchXConfig, 'baseURL'> {
  url?: string;
  params?: Record<string, any>;
  body?: any;
  method?: string;
  signal?: AbortSignal;
}

export type RequestInterceptor = (options: RequestOptions) => Promise<RequestOptions> | RequestOptions;
export type ResponseInterceptor = (response: Response) => Promise<Response> | Response;

export interface FetchXInstance {
  get<T = any>(url: string, options?: RequestOptions): Promise<T>;
  post<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>;
  put<T = any>(...);
  delete<T = any>(...);

  interceptors: {
    request: { use: (fn: RequestInterceptor) => void };
    response: { use: (fn: ResponseInterceptor) => void };
  };
}
```

---

## 四、请求流程（核心逻辑）

1. 用户通过实例请求方法（get/post...）发起请求
2. 合并全局和单次配置，拼接 baseURL/params
3. 请求前执行 request 拦截器链（异步/同步皆可）
4. 调用 fetch，支持超时（通过 AbortController 实现）
5. 响应后执行 response 拦截器链
6. 根据配置自动解析 json/text/blob
7. 对错误统一处理和抛出

---

## 五、基础 API 用例（示例）

```js
const api = createFetchX({ baseURL: '/api', timeout: 5000 });

api.interceptors.request.use(options => {
  options.headers['Authorization'] = getToken();
  return options;
});

api.interceptors.response.use(response => {
  if (!response.ok)
    throw new Error(`${response.status}: ${response.statusText}`);
  return response;
});

const user = await api.get('/user/123');
const result = await api.post('/data', { foo: 'bar' }, { timeout: 3000 });
```

---

## 六、项目当前状态

### ✅ 已完成功能（v0.1.0）

- ✅ **基础请求方法**：GET、POST、PUT、DELETE、PATCH、HEAD
- ✅ **拦截器系统**：请求和响应拦截器，支持异步链式调用
- ✅ **超时控制**：基于 AbortController 实现
- ✅ **错误处理**：统一的错误处理机制
- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **自动序列化**：JSON 自动序列化和响应解析
- ✅ **URL 构建**：自动拼接 baseURL 和查询参数
- ✅ **测试覆盖**：27 个测试用例，覆盖核心功能

### 🚧 进阶阶段（计划中）

- 🔄 **请求取消优化**：更完善的 AbortController 集成
- 🔄 **重试机制**：指数退避算法和重试策略
- 🔄 **并发管理**：请求队列和并发控制
- 🔄 **进度回调**：上传/下载进度监控
- 🔄 **流式响应**：支持 ReadableStream 处理
- 🔄 **缓存机制**：请求缓存和响应缓存

### 🔮 扩展阶段（未来规划）

- 📋 **断点续传**：Range 请求支持
- 📋 **自定义错误**：更丰富的错误类型和错误码
- 📋 **多实例管理**：多环境配置和实例隔离
- 📋 **插件系统**：可扩展的中间件架构
- 📋 **离线支持**：Service Worker 集成和离线缓存

---

## 七、架构优势

### 🎯 设计优势

- ✅ **零依赖**：基于原生 fetch，无外部运行时依赖
- ✅ **类型安全**：完整的 TypeScript 支持，编译时类型检查
- ✅ **性能优化**：利用浏览器原生 fetch 优化
- ✅ **Tree Shaking**：ES 模块支持，按需加载
- ✅ **拦截器链**：可插拔的请求/响应处理机制
- ✅ **错误统一**：标准化的错误处理流程

### 🔧 技术实现

- **URL 构建**：自动拼接 baseURL 和查询参数
- **请求序列化**：自动 JSON 序列化，支持 FormData、Blob 等
- **超时控制**：基于 AbortController 的高效超时机制
- **响应解析**：根据 Content-Type 自动解析响应内容
- **错误包装**：统一的错误对象格式，便于前端处理

### 📊 测试覆盖

- **单元测试**：27 个测试用例，覆盖核心功能
- **集成测试**：拦截器链、错误处理、超时机制
- **类型测试**：TypeScript 类型安全验证
- **覆盖率**：核心功能 100% 测试覆盖

---

## 八、项目总结

### 🎉 当前成就

- ✅ **基础功能完整**：所有核心 HTTP 方法已实现
- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **测试完善**：全面的测试覆盖
- ✅ **文档齐全**：详细的 API 文档和使用示例
- ✅ **工程化完善**：ESLint、Prettier、Vite 等工具链

### 🚀 技术亮点

- **现代化架构**：基于 fetch API，拥抱现代 Web 标准
- **Axios 兼容**：API 设计高度兼容，迁移成本低
- **零依赖设计**：无外部依赖，包体积小
- **类型安全**：完整的 TypeScript 支持
- **可扩展性**：模块化设计，便于功能扩展

### 🔮 发展前景

- **社区生态**：为开源社区提供现代化的 HTTP 客户端选择
- **企业应用**：适合需要轻量级、类型安全的 HTTP 客户端的企业项目
- **学习价值**：作为现代 TypeScript 项目的最佳实践示例

---

_本设计文档记录了 FetchX 项目的完整设计思路、实现方案和发展规划。随着项目的发展，将持续更新和完善。_
