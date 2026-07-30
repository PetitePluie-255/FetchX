# 插件开发

FetchX 内置插件系统，通过 `api.use(plugin)` 注册。

## 插件钩子

| 钩子            | 触发时机                 | 用途               |
| --------------- | ------------------------ | ------------------ |
| `onInit`        | 注册插件时               | 初始化、注入能力   |
| `onRequest`     | 请求发出前（拦截器之后） | 修改配置、添加头   |
| `onResponse`    | 收到响应后               | 响应变换、埋点     |
| `onError`       | 请求出错时               | 错误上报、恢复     |
| `onStream`      | 流式请求建立时           | 流式数据转换       |
| `onStreamEnd`   | 流自然完成或被取消时     | 清理资源、记录耗时 |
| `onStreamError` | 流建立或消费失败时       | 流错误上报         |

## 基本插件

```typescript
import type { Plugin } from '@petite-pluie/fetchx';

const loggingPlugin: Plugin = {
  name: 'logger',
  onRequest: config => {
    console.log(`[${config.method}] ${config.url}`);
    return config;
  },
  onResponse: response => {
    console.log(`[${response.status}] ${response.config?.url}`);
    return response;
  },
};

const api = createFetchX();
const unsub = api.use(loggingPlugin); // 注册
api.unuse('logger'); // 按名称移除
```

## 优先级

插件按 `priority` 排序执行，数字越小越先执行。默认 `100`：

```typescript
const highPriority: Plugin = {
  name: 'auth',
  priority: 0, // 最先执行
  onRequest: config => {
    config.headers = { ...config.headers, Authorization: getToken() };
    return config;
  },
};
```

## 错误恢复

`onError` 返回 `FetchXResponse` 即可从错误中恢复：

```typescript
const recoveryPlugin: Plugin = {
  name: 'recovery',
  onError: (error, { url }) => {
    if (error.code === 'ERR_NETWORK' && url.endsWith('/retry')) {
      // 返回降级响应，请求不再抛异常
      return {
        data: { cached: true },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        config: {},
      };
    }
    return null; // 继续抛出
  },
};
```

## 请求级插件

```typescript
await api.get('/users', {
  plugins: [{ name: 'track', onRequest: config => config }],
});
```

## 插件类型

```typescript
interface Plugin {
  name: string;
  priority?: number;
  onInit?: (context: PluginContext) => void;
  onRequest?: (
    config: RequestOptions,
    context: PluginContext
  ) => RequestOptions | Promise<RequestOptions>;
  onResponse?: (
    response: FetchXResponse,
    context: PluginContext
  ) => FetchXResponse | Promise<FetchXResponse>;
  onError?: (
    error: FetchXError,
    context: PluginContext
  ) => FetchXResponse | null | Promise<FetchXResponse | null>;
  onStream?: (
    stream: FetchXStream<unknown>,
    context: PluginContext
  ) => FetchXStream<unknown> | Promise<FetchXStream<unknown>>;
  onStreamEnd?: (
    stream: FetchXStream<unknown>,
    reason: 'complete' | 'cancelled',
    context: PluginContext
  ) => void | Promise<void>;
  onStreamError?: (
    error: unknown,
    stream: FetchXStream<unknown> | undefined,
    context: PluginContext
  ) => void | Promise<void>;
}
```

`onStreamEnd` 对自然读完传入 `complete`，对提前退出迭代或显式
`stream.abort()` 传入 `cancelled`。连接建立前失败时
`onStreamError` 的 `stream` 为 `undefined`。
