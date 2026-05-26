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

/**
 * Create a FetchX logger plugin.
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

  return {
    name: 'logger',
    priority: 100,

    onRequest: (config, context) => {
      if (
        logRequest &&
        (!options.filterRequest || options.filterRequest(config, context))
      ) {
        log(`[→ ${context.method}] ${context.url}`);
      }
      return config;
    },

    onResponse: (response, context) => {
      if (
        logResponse &&
        (!options.filterResponse || options.filterResponse(response, context))
      ) {
        log(`[← ${response.status}] ${context.url}`);
      }
      return response;
    },

    onError: (error, context) => {
      if (
        logError &&
        (!options.filterError || options.filterError(error, context))
      ) {
        log(
          `[✗ ${error.code ?? 'UNKNOWN'}] ${context.method} ${context.url}: ${error.message}`
        );
      }
      return null;
    },
  };
}
