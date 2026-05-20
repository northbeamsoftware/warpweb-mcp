import { siteTools } from './sites.js';
import { revisionTools } from './revisions.js';
import { domainTools } from './domains.js';
import { webhookTools } from './webhooks.js';
import { businessTools } from './businesses.js';
import type { AnyTool } from './types.js';

// Business-disambiguation tools come FIRST in the registered order so an
// LLM scanning tool descriptions sees `search_businesses` before
// `create_site` — increases the chance it'll call search first when the
// user gives only a business name, instead of going straight to create
// and landing on the wrong Google Places result.
export const allTools: AnyTool[] = [
  ...businessTools,
  ...siteTools,
  ...revisionTools,
  ...domainTools,
  ...webhookTools,
];

export { businessTools, siteTools, revisionTools, domainTools, webhookTools };
export type { AnyTool, WarpwebToolDefinition } from './types.js';
