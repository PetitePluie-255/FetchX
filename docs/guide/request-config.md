# 请求配置

## RequestOptions

| 字段                 | 类型                                                                    | 说明                       |
| -------------------- | ----------------------------------------------------------------------- | -------------------------- |
| `url`                | `string`                                                                | 请求路径（相对于 baseURL） |
| `method`             | `string`                                                                | HTTP 方法                  |
| `params`             | `Record<string, unknown>`                                               | 查询参数，自动序列化       |
| `body`               | `unknown`                                                               | 请求体，自动 JSON 序列化   |
| `headers`            | `Record<string, string>`                                                | 请求头（合并到默认头）     |
| `timeout`            | `number`                                                                | 本次请求超时时间           |
| `connectTimeout`     | `number`                                                                | 流式请求等待响应头超时     |
| `idleTimeout`        | `number`                                                                | 流式请求块间空闲超时       |
| `throwHttpErrors`    | `boolean`                                                               | 状态校验失败时抛 HTTPError |
| `signal`             | `AbortSignal`                                                           | 取消信号                   |
| `baseURL`            | `string`                                                                | 覆盖实例的 baseURL         |
| `credentials`        | `RequestCredentials`                                                    | 凭证模式                   |
| `validateStatus`     | `(status: number) => boolean`                                           | 自定义成功状态码判定       |
| `responseType`       | `'json' \| 'text' \| 'blob' \| 'arrayBuffer' \| 'formData' \| 'stream'` | 强制响应解析类型           |
| `dedupe`             | `boolean`                                                               | 是否启用去重               |
| `cache`              | `CacheConfig \| false`                                                  | 请求缓存配置               |
| `retry`              | `RetryConfig \| false`                                                  | 请求重试配置               |
| `maxConcurrency`     | `number`                                                                | 最大并发请求数             |
| `sanitizeConfig`     | `boolean`                                                               | 脱敏 config.headers        |
| `paramsSerializer`   | `(params: Record<string, unknown>) => string`                           | 自定义参数序列化函数       |
| `plugins`            | `Plugin[]`                                                              | 请求级插件                 |
| `onDownloadProgress` | `(e: ProgressEvent) => void`                                            | 下载进度回调               |
| `onUploadProgress`   | `(e: ProgressEvent) => void`                                            | 上传进度回调               |

## 配置优先级

单次请求的配置会合并到实例配置，请求级配置优先：

```
实例默认配置 → 单次请求配置（合并覆盖） → 请求拦截器
```
