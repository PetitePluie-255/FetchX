/**
 * FetchX 主入口文件
 * 导出所有公共 API
 */

export { createFetchX, FetchX } from './createFetchX';
export type {
  FetchXConfig,
  RequestOptions,
  FetchXInstance,
  FetchXResponse,
  FetchXError,
  FetchXInterceptor,
  RequestInterceptor,
  ResponseInterceptor,
  HttpMethod,
} from './types';

// 默认导出
export { default } from './createFetchX';
