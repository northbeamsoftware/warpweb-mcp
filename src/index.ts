#!/usr/bin/env node
/**
 * warpweb-mcp — official MCP server for the Warpweb API.
 *
 * Reads `WARPWEB_API_KEY` from env, builds a stdio MCP server, and forwards
 * tool calls to https://api.warpweb.ai/v1 (overridable via `WARPWEB_API_URL`).
 *
 * Run via:   warpweb-mcp                 (when installed globally)
 *            npx warpweb-mcp             (no install)
 *            node dist/index.js          (from source)
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WarpwebClient, DEFAULT_BASE_URL } from './client.js';
import { buildServer } from './server.js';

const VERSION = '0.1.0';

async function main(): Promise<void> {
  const apiKey = process.env.WARPWEB_API_KEY?.trim();
  const baseUrl = process.env.WARPWEB_API_URL?.trim() || DEFAULT_BASE_URL;

  // We always print a startup banner to STDERR so we don't pollute the
  // stdio protocol stream (stdout). Clients see this in their MCP logs.
  process.stderr.write(`warpweb-mcp v${VERSION} starting up...\n`);
  process.stderr.write(`  API base: ${baseUrl}\n`);

  let server: McpServer;

  if (!apiKey) {
    process.stderr.write(
      [
        '',
        '  WARPWEB_API_KEY is not set.',
        '',
        '  To use this server, you need a Warpweb API key (format: wwk_...).',
        '  Get one at https://warpweb.ai/app, then set it in your MCP client config:',
        '',
        '    Claude Desktop (claude_desktop_config.json):',
        '      "mcpServers": {',
        '        "warpweb": {',
        '          "command": "npx",',
        '          "args": ["-y", "warpweb-mcp"],',
        '          "env": { "WARPWEB_API_KEY": "wwk_your_key_here" }',
        '        }',
        '      }',
        '',
        '  Starting in NO-TOOL mode so the client connection still completes.',
        '  Set the env var and restart to enable tools.',
        '',
      ].join('\n')
    );
    server = buildServer({
      client: new WarpwebClient({
        apiKey: 'wwk_placeholder_NOT_SET',
        baseUrl,
      }),
      tools: [], // no tools registered — client sees an empty toolset
      serverVersion: VERSION,
    });
  } else {
    if (!apiKey.startsWith('wwk_')) {
      process.stderr.write(
        `  WARN: WARPWEB_API_KEY does not start with "wwk_" — keys issued at https://warpweb.ai/app use that prefix. Proceeding anyway.\n`
      );
    }
    const client = new WarpwebClient({ apiKey, baseUrl });
    server = buildServer({ client, serverVersion: VERSION });
    process.stderr.write(`  Tools registered. Ready on stdio.\n`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(
    `warpweb-mcp: fatal error: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`
  );
  process.exit(1);
});
