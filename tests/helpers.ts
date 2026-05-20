import { vi } from 'vitest';
import { z, type ZodRawShape } from 'zod';
import { WarpwebClient } from '../src/client.js';
import type { WarpwebToolDefinition } from '../src/tools/types.js';

export interface CapturedCall {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}

export function mockClient(responseBody: unknown = { ok: true }, status = 200) {
  const calls: CapturedCall[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(init.body as string) : undefined,
      headers,
    });
    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  const client = new WarpwebClient({
    apiKey: 'wwk_test',
    baseUrl: 'https://api.example.com/v1',
    fetchImpl,
  });
  return { client, calls };
}

/**
 * Runs a tool's input through its zod schema then invokes the handler.
 * Returns whatever the handler returned (typically the API JSON).
 */
export async function runTool<Shape extends ZodRawShape>(
  tool: WarpwebToolDefinition<Shape>,
  rawArgs: unknown,
  client: WarpwebClient
): Promise<unknown> {
  const schema = z.object(tool.inputSchema);
  const parsed = schema.parse(rawArgs);
  return tool.handler(parsed as z.infer<typeof schema>, client);
}
