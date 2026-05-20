import { siteTools } from './sites.js';
import { revisionTools } from './revisions.js';
import { domainTools } from './domains.js';
import { webhookTools } from './webhooks.js';
import type { AnyTool } from './types.js';

export const allTools: AnyTool[] = [
  ...siteTools,
  ...revisionTools,
  ...domainTools,
  ...webhookTools,
];

export { siteTools, revisionTools, domainTools, webhookTools };
export type { AnyTool, WarpwebToolDefinition } from './types.js';
