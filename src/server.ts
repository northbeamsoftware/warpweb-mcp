import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WarpwebClient } from './client.js';
import { WarpwebApiError } from './client.js';
import { allTools } from './tools/index.js';
import type { AnyTool } from './tools/index.js';

export interface BuildServerOptions {
  client: WarpwebClient;
  /** Override tool list (used in tests). Defaults to all tools. */
  tools?: AnyTool[];
  serverName?: string;
  serverVersion?: string;
}

export function buildServer(opts: BuildServerOptions): McpServer {
  const server = new McpServer({
    name: opts.serverName ?? 'warpweb',
    version: opts.serverVersion ?? '0.1.0',
  });

  const tools = opts.tools ?? allTools;
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args: unknown) => {
        try {
          // args is already validated against inputSchema by the SDK
          const result = await tool.handler(args, opts.client);
          return {
            content: [
              {
                type: 'text' as const,
                text: stringifyResult(result),
              },
            ],
          };
        } catch (err) {
          return formatToolError(err);
        }
      }
    );
  }

  return server;
}

function stringifyResult(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatToolError(err: unknown): {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
} {
  if (err instanceof WarpwebApiError) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: err.message,
              status: err.status,
              body: err.body,
            },
            null,
            2
          ),
        },
      ],
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: 'text', text: `Tool error: ${message}` }],
  };
}
