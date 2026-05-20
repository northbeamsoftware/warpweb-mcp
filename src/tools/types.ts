import type { z, ZodRawShape } from 'zod';
import type { WarpwebClient } from '../client.js';

/**
 * Shape of a single MCP tool registration.
 *
 * `inputSchema` is a zod *raw shape* (the object passed inside `z.object({...})`).
 * The MCP SDK consumes it that way and emits a JSON schema for clients. Keeping
 * `Shape` as a generic preserves per-tool input typing for handlers.
 */
export interface WarpwebToolDefinition<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  handler: (args: z.infer<z.ZodObject<Shape>>, client: WarpwebClient) => Promise<unknown>;
}

/**
 * Type-erased alias used when storing tools in a heterogeneous array.
 *
 * The handler accepts `unknown` because per-tool input types vary; at runtime
 * the MCP SDK validates input against the tool's `inputSchema` (zod) before
 * the handler runs, so the handler can safely cast.
 */
export type AnyTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodRawShape;
  handler: (args: unknown, client: WarpwebClient) => Promise<unknown>;
};

/**
 * Identity function that preserves the generic `Shape` of a tool definition
 * while returning an `AnyTool` so collections of tools can be stored in
 * homogeneous arrays without losing per-tool type safety inside the body.
 *
 * Example:
 *   const myTool = defineTool({
 *     name: 'foo',
 *     inputSchema: { id: z.string() },
 *     handler: async (args, client) => client.get(`/foo/${args.id}`),  // args.id is typed string
 *     ...
 *   });
 */
export function defineTool<Shape extends ZodRawShape>(
  def: WarpwebToolDefinition<Shape>
): AnyTool {
  return def as unknown as AnyTool;
}
