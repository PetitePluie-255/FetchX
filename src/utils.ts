/**
 * FetchX 工具函数
 * 序列化、URL 拼接、错误包装等通用功能
 */

import type { RequestOptions, FetchXError } from './types';

/**
 * 序列化 URL 参数
 */
export function serializeParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(item => {
          searchParams.append(key, String(item));
        });
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
}

/**
 * 构建完整 URL
 */
export function buildURL(
  baseURL: string,
  url: string,
  params?: Record<string, unknown>
): string {
  let fullURL = url;

  // 处理 baseURL
  if (baseURL) {
    fullURL = `${baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  }

  // 处理查询参数
  if (params && Object.keys(params).length > 0) {
    const serializedParams = serializeParams(params);
    if (serializedParams) {
      const separator = fullURL.includes('?') ? '&' : '?';
      fullURL += separator + serializedParams;
    }
  }

  return fullURL;
}

/**
 * 序列化请求体
 */
export function serializeBody(
  body: unknown
): string | FormData | Blob | ArrayBuffer {
  if (body === null || body === undefined) {
    return '';
  }

  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  if (typeof body === 'object') {
    return JSON.stringify(body);
  }

  return String(body);
}

/**
 * 创建 FetchX 错误对象
 */
export function createFetchXError(
  message: string,
  config?: RequestOptions,
  code?: string,
  request?: unknown
): FetchXError {
  const error = new Error(message) as FetchXError;
  error.config = config;
  error.code = code;
  error.request = request;
  error.isAxiosError = true;
  return error;
}

/**
 * 检查是否为特殊对象（DOM/Browser API 对象等），这些对象不应该被深度合并
 */
function isSpecialObject(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // 检查是否为 DOM/Browser API 对象
  return !!(
    value instanceof AbortSignal ||
    value instanceof FormData ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    value instanceof Headers ||
    value instanceof URLSearchParams ||
    // 检查是否有 DOM 对象的特征（有 constructor.name）
    (typeof (value as { constructor?: { name?: string } }).constructor?.name ===
      'string' &&
      [
        'AbortSignal',
        'FormData',
        'Blob',
        'ArrayBuffer',
        'Headers',
        'URLSearchParams',
      ].includes((value as { constructor: { name: string } }).constructor.name))
  );
}

/**
 * 合并配置对象
 */
export function mergeConfig(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };

  Object.keys(source).forEach(key => {
    const sourceValue = source[key];
    const targetValue = result[key];

    // 如果是特殊对象，直接赋值，不进行深度合并
    if (isSpecialObject(sourceValue)) {
      result[key] = sourceValue;
    } else if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue)
    ) {
      result[key] = mergeConfig(
        (targetValue as Record<string, unknown> | undefined) ??
          ({} as Record<string, unknown>),
        sourceValue as Record<string, unknown>
      );
    } else {
      result[key] = sourceValue;
    }
  });

  return result;
}

/**
 * 检查是否为 2xx 状态码
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * 解析响应内容
 */
export async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return response.json();
  }

  if (contentType?.includes('text/')) {
    return response.text();
  }

  if (contentType?.includes('multipart/form-data')) {
    return response.formData();
  }

  return response.blob();
}

/**
 * 检查是否为取消错误
 * 兼容多种取消错误类型：FetchX、原生 AbortError、Axios 等
 */
export function isCancel(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const error = value as FetchXError;

  // 检查多种取消标识
  return !!(
    // FetchX 标准错误码
    (
      error.code === 'ERR_CANCELED' ||
      error.code === 'ECONNABORTED' ||
      // 原生 AbortError
      error.name === 'AbortError' ||
      // Axios 兼容
      error.name === 'CanceledError' ||
      error.__CANCEL__ === true ||
      // 消息关键词检测（兜底方案）
      (error.message &&
        typeof error.message === 'string' &&
        (error.message.toLowerCase().includes('cancel') ||
          error.message.toLowerCase().includes('abort')))
    )
  );
}
