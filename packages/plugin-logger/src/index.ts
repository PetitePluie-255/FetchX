import type {
  Plugin,
  PluginContext,
  RequestOptions,
  FetchXResponse,
  FetchXError,
} from '@petite-pluie/fetchx';

export interface LoggerPluginOptions {
  /** Custom log function. Default: console.log */
  log?: (..._args: unknown[]) => void;
  /** Log outgoing requests. Default: true */
  logRequest?: boolean;
  /** Log incoming responses. Default: true */
  logResponse?: boolean;
  /** Log errors. Default: true */
  logError?: boolean;
  /** Show request duration in ms. Default: true */
  logTiming?: boolean;
  /** Filter which requests to log. Return false to skip. */
  filterRequest?: (_config: RequestOptions, _context: PluginContext) => boolean;
  /** Filter which responses to log. Return false to skip. */
  filterResponse?: (
    _response: FetchXResponse,
    _context: PluginContext
  ) => boolean;
  /** Filter which errors to log. Return false to skip. */
  filterError?: (_error: FetchXError, _context: PluginContext) => boolean;
}

const DEFAULT_PRIORITY = 100;

// Shared counter across all plugin instances for unique request IDs.
// Allows matching onRequest timing to onResponse/onError.
let _requestId = 0;

/**
 * Create a FetchX logger plugin.
 *
 * Logs every request, response, and error to the console with timing info.
 *
 * ```ts
 * import { createFetchX } from '@petite-pluie/fetchx';
 * import { createLoggerPlugin } from '@petite-pluie/fetchx-logger';
 *
 * const api = createFetchX({ baseURL: 'https://api.example.com' });
 * api.use(createLoggerPlugin());
 * ```
 */
export function createLoggerPlugin(options: LoggerPluginOptions = {}): Plugin {
  const log = options.log ?? console.log;
  const logRequest = options.logRequest ?? true;
  const logResponse = options.logResponse ?? true;
  const logError = options.logError ?? true;
  const logTiming = options.logTiming ?? true;

  // Track request timing per plugin instance, keyed by unique request ID.
  // The ID is attached to the config so onResponse/onError can retrieve it.
  const startTimes = new Map<number, number>();

  function formatTiming(id: number | undefined): string {
    if (!logTiming || id === undefined) return '';
    const start = startTimes.get(id);
    if (start === undefined) return '';
    startTimes.delete(id);
    return ` (${(globalThis.performance.now() - start).toFixed(0)}ms)`;
  }

  return {
    name: 'logger',
    priority: DEFAULT_PRIORITY,

    onRequest: (config, context) => {
      if (!logRequest || options.filterRequest?.(config, context) === false) {
        return config;
      }

      const id = ++_requestId;
      startTimes.set(id, globalThis.performance.now());

      // Attach ID for timing lookup in onResponse/onError
      log(`→ ${context.method} ${context.url}`);
      return Object.assign({}, config, { __loggerId: id });
    },

    onResponse: (response, context) => {
      if (
        !logResponse ||
        options.filterResponse?.(response, context) === false
      ) {
        return response;
      }

      const id = (response.config as Record<string, unknown>).__loggerId as
        | number
        | undefined;
      const timing = formatTiming(id);

      const statusLabel =
        response.status >= 400 ? '✗' : response.status >= 300 ? '→' : '✓';

      log(`${statusLabel} ${response.status} ${context.url}${timing}`);
      return response;
    },

    onError: (error, context) => {
      if (!logError || options.filterError?.(error, context) === false) {
        return null;
      }

      const id = (error.config as Record<string, unknown>).__loggerId as
        | number
        | undefined;
      const timing = formatTiming(id);

      log(
        `✗ ${error.code ?? 'UNKNOWN'} ${context.method} ${context.url}: ${error.message}${timing}`
      );
      return null;
    },
  };
}
