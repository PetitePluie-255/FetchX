import type {
  Plugin,
  PluginContext,
  RequestOptions,
  FetchXResponse,
  FetchXError,
  FetchXInstance,
} from './types';
import type { FetchXStream } from './stream';

/**
 * Manages plugin registration, lifecycle, and hook dispatch.
 *
 * Each PluginManager is bound to a FetchX instance so that
 * onInit hooks receive the instance they belong to.
 */
export class PluginManager {
  private plugins: Plugin[] = [];

  private _instance: FetchXInstance;

  constructor(instance: FetchXInstance) {
    this._instance = instance;
  }

  /**
   * Register a plugin. Throws if a plugin with the same name already exists.
   * Returns an unregister function.
   */
  use(plugin: Plugin): () => void {
    if (this.plugins.some(p => p.name === plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    this.plugins.push(plugin);
    this.sort();
    // Fire onInit immediately — sync errors throw, async rejections are
    // the plugin's responsibility to handle
    try {
      const ret = plugin.onInit?.(this._instance);
      if (ret instanceof Promise) {
        ret.catch(() => {});
      }
    } catch {
      this.unuse(plugin.name);
      throw new Error(`Plugin "${plugin.name}" onInit failed`);
    }
    return () => this.unuse(plugin.name);
  }

  /**
   * Unregister a plugin by name. Returns true if found and removed.
   */
  unuse(name: string): boolean {
    const idx = this.plugins.findIndex(p => p.name === name);
    if (idx === -1) return false;
    this.plugins.splice(idx, 1);
    return true;
  }

  /** Sort plugins by priority (lower = runs first) */
  private sort(): void {
    this.plugins.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }

  /** Get combined global + per-request plugins, sorted */
  private getAll(extra?: Plugin[]): Plugin[] {
    if (!extra || extra.length === 0) return this.plugins;
    const combined = [...this.plugins, ...extra];
    combined.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    return combined;
  }

  /**
   * Run onRequest hooks. Each plugin receives the previous plugin's config.
   */
  async runOnRequest(
    config: RequestOptions,
    context: PluginContext,
    extra?: Plugin[]
  ): Promise<RequestOptions> {
    let result = config;
    for (const plugin of this.getAll(extra)) {
      if (plugin.onRequest) {
        result = await plugin.onRequest(result, context);
      }
    }
    return result;
  }

  /**
   * Run onResponse hooks. Each plugin receives the previous plugin's response.
   */
  async runOnResponse<T>(
    response: FetchXResponse<T>,
    context: PluginContext,
    extra?: Plugin[]
  ): Promise<FetchXResponse<T>> {
    let result: FetchXResponse<unknown> = response;
    for (const plugin of this.getAll(extra)) {
      if (plugin.onResponse) {
        result = await plugin.onResponse(result, context);
      }
    }
    return result as FetchXResponse<T>;
  }

  /**
   * Run onError hooks. The first plugin to return a FetchXResponse
   * recovers the error. Returns undefined if no plugin handles it.
   */
  async runOnError(
    error: FetchXError,
    context: PluginContext,
    extra?: Plugin[]
  ): Promise<FetchXResponse<unknown> | undefined> {
    for (const plugin of this.getAll(extra)) {
      if (plugin.onError) {
        const result = await plugin.onError(error, context);
        if (result !== undefined && result !== null) {
          return result;
        }
      }
    }
    return undefined;
  }

  /**
   * Run onStream hooks. Each plugin can wrap or modify the stream.
   */
  async runOnStream<T extends FetchXStream<unknown>>(
    stream: T,
    context: PluginContext,
    extra?: Plugin[]
  ): Promise<T> {
    let result: FetchXStream<unknown> = stream;
    for (const plugin of this.getAll(extra)) {
      if (plugin.onStream) {
        result = await plugin.onStream(result, context);
      }
    }
    return result as T;
  }
}
