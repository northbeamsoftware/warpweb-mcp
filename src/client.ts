/**
 * Thin fetch wrapper for the Warpweb V1 REST API.
 *
 * - Reads `WARPWEB_API_KEY` (Bearer) and optional `WARPWEB_API_URL` (default `https://api.warpweb.ai/v1`) from env.
 * - JSON in / JSON out.
 * - Surfaces non-2xx as `WarpwebApiError` carrying status + parsed body.
 */

export const DEFAULT_BASE_URL = 'https://api.warpweb.ai/v1';

export interface WarpwebClientConfig {
  apiKey: string;
  baseUrl?: string;
  /** Override for tests. Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
  /** User-Agent header. Defaults to `warpweb-mcp/<version>`. */
  userAgent?: string;
}

export class WarpwebApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly url: string;
  readonly method: string;

  constructor(args: { status: number; body: unknown; url: string; method: string; message: string }) {
    super(args.message);
    this.name = 'WarpwebApiError';
    this.status = args.status;
    this.body = args.body;
    this.url = args.url;
    this.method = args.method;
  }
}

export class WarpwebClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;

  constructor(config: WarpwebClientConfig) {
    if (!config.apiKey) {
      throw new Error('WarpwebClient: apiKey is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch;
    this.userAgent = config.userAgent ?? 'warpweb-mcp/0.1.0';
    if (!this.fetchImpl) {
      throw new Error(
        'WarpwebClient: global fetch is not available. Node 18+ is required, or pass a fetchImpl.'
      );
    }
  }

  /**
   * Issues an authenticated request to the Warpweb API.
   *
   * @param method HTTP method
   * @param path  Path relative to base URL (must start with `/`)
   * @param body  Optional JSON body
   */
  async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    if (!path.startsWith('/')) {
      throw new Error(`WarpwebClient: path must start with '/', got: ${path}`);
    }
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'User-Agent': this.userAgent,
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, init);
    } catch (err) {
      throw new WarpwebApiError({
        status: 0,
        body: { error: err instanceof Error ? err.message : String(err) },
        url,
        method,
        message: `Network error reaching Warpweb API (${method} ${url}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }

    const rawText = await res.text();
    let parsed: unknown = rawText;
    if (rawText.length > 0) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // leave as string
      }
    } else {
      parsed = null;
    }

    if (!res.ok) {
      throw new WarpwebApiError({
        status: res.status,
        body: parsed,
        url,
        method,
        message: friendlyErrorMessage(res.status, parsed, method, path),
      });
    }

    return parsed as T;
  }

  get<T = unknown>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body ?? {});
  }
}

function friendlyErrorMessage(status: number, body: unknown, method: string, path: string): string {
  const bodyStr = typeof body === 'string' ? body : safeJsonStringify(body);
  switch (status) {
    case 401:
      return `Warpweb API rejected the request (401 Unauthorized). Check your WARPWEB_API_KEY env var — it should look like \`wwk_...\` and you can manage keys at https://warpweb.ai/app. Server said: ${bodyStr}`;
    case 402:
      return `Warpweb API returned 402 PAYMENT_REQUIRED. Your account balance is 0 and auto-refill is off — add credits at https://warpweb.ai/app/credits or enable auto-refill. Server said: ${bodyStr}`;
    case 403:
      return `Warpweb API returned 403 Forbidden — your API key isn't authorized for this resource. Server said: ${bodyStr}`;
    case 404:
      return `Warpweb API returned 404 Not Found for ${method} ${path}. Either the resource doesn't exist, isn't owned by your account, or the path isn't part of the V1 API. Server said: ${bodyStr}`;
    case 429:
      return `Warpweb API returned 429 Too Many Requests — daily quota hit or revision queue full. Server said: ${bodyStr}`;
    case 500:
      return `Warpweb API returned 500 Internal Server Error. Safe to retry. Server said: ${bodyStr}`;
    case 502:
      return `Warpweb API returned 502 Bad Gateway — upstream (Cloudflare) failure. Try again shortly. Server said: ${bodyStr}`;
    case 503:
      return `Warpweb API returned 503 Service Unavailable — registrar/transient issue. Try again shortly. Server said: ${bodyStr}`;
    default:
      return `Warpweb API request failed with status ${status} for ${method} ${path}. Server said: ${bodyStr}`;
  }
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
