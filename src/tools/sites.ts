import { z } from 'zod';
import { defineTool, type AnyTool } from './types.js';

/**
 * POST /v1/sites — async, returns siteId immediately.
 *
 * Field names mirror the public V1 contract (camelCase request bodies).
 * See https://docs.warpweb.ai/api-reference/create-site
 */
const createSite = defineTool({
  name: 'create_site',
  title: 'Create a Warpweb site',
  description: [
    'Kick off an end-to-end website build for a real business. Warpweb researches the business',
    '(Google Places: hours, address, phone, photos, reviews, service area, category), writes copy',
    'in a voice matched to the vertical, picks photos, generates a vertical-aware design, builds',
    'a multi-page site (home / about / services / contact + vertical-specific sections), adds SEO',
    '(meta tags, sitemap, Schema.org JSON-LD), and deploys to a free `*.warpweb.app` subdomain.',
    '',
    'ASYNC: this call returns a `siteId` and `status: "generating"` IMMEDIATELY. Real builds take',
    '3–8 minutes. After calling this, EITHER poll `get_site` every 2–5 seconds until `status` is',
    '`complete` or `failed`, OR subscribe to the `site.complete` / `site.failed` lifecycle webhooks',
    'on warpweb.ai/app for push delivery (preferred).',
    '',
    'Best for service-based local businesses (trades, clinics, salons, agencies, restaurants, real',
    "estate) that have a Google Places listing — that's what Warpweb is calibrated for. SaaS or",
    'fully-remote companies still work, but the result reads more generic.',
    '',
    'Cost: ~200–500 credits, billed at end-of-build against actual AI usage. Failed builds are free.',
  ].join(' '),
  inputSchema: {
    businessName: z
      .string()
      .min(1)
      .max(200)
      .describe('The business as customers know it (e.g. "Acme Plumbing"). 1–200 chars.'),
    contactEmail: z
      .string()
      .email()
      .describe(
        "Email address. Receives form submissions if no webhook is configured, plus a deploy notice."
      ),
    businessLocation: z
      .string()
      .optional()
      .describe(
        "City + state/region (e.g. 'Austin, TX'). Strongly recommended — drives local SEO, areas-served copy, and example testimonials."
      ),
    businessDescription: z
      .string()
      .optional()
      .describe(
        'Free-text description of what the business does. Helps when Google Places coverage is thin.'
      ),
    ownerPrompt: z
      .string()
      .optional()
      .describe(
        'Voice/tone direction or anything to emphasize (e.g. "Emphasize 24/7 emergency service").'
      ),
    facebookUrl: z.string().url().optional().describe('Public Facebook page URL — used as a research signal.'),
    logoUrl: z
      .string()
      .url()
      .optional()
      .describe('URL to a business logo. Used for branding and color extraction.'),
    uploadedPhotos: z
      .array(z.string().url())
      .optional()
      .describe('Array of photo URLs to include on the site.'),
    designStyle: z
      .string()
      .optional()
      .describe('Override the auto-selected design style. Available styles surface in the dashboard.'),
  },
  handler: async (args, client) => {
    return client.post('/sites', args);
  },
});

/**
 * GET /v1/sites/:id
 */
const getSite = defineTool({
  name: 'get_site',
  title: 'Get a Warpweb site',
  description: [
    'Fetch the current record for one site by id. Use this to poll the status of a build after',
    '`create_site` (or a `create_revision`). Returns the full site row including `status`,',
    '`generation_phase`, `generation_message`, and (when complete) `deployment_url`.',
    '',
    'Polling pattern: call every 2–5 seconds; stop when `status` is `complete` or `failed`.',
    '`status` values: `generating` | `complete` | `failed` | `research_review`.',
    '',
    'Returns 404 if the site does not exist OR is not owned by your account.',
  ].join(' '),
  inputSchema: {
    siteId: z.string().min(1).describe('Site UUID returned by `create_site`.'),
  },
  handler: async (args, client) => {
    return client.get(`/sites/${encodeURIComponent(args.siteId)}`);
  },
});

/**
 * GET /v1/sites
 */
const listSites = defineTool({
  name: 'list_sites',
  title: 'List your Warpweb sites',
  description: [
    'List every site owned by the calling account. Returns an array of site rows (id, slug,',
    'business_name, status, deployment_url, created_at, updated_at, etc.). Free, not metered.',
  ].join(' '),
  inputSchema: {},
  handler: async (_args, client) => {
    return client.get('/sites');
  },
});

/**
 * POST /v1/sites/:id/refresh
 */
const refreshSite = defineTool({
  name: 'refresh_site',
  title: 'Refresh a free-subdomain Warpweb site',
  description: [
    'Free `*.warpweb.app` subdomain sites auto-pause after 7 days of inactivity. This call bumps',
    '`last_refreshed_at = now()` and, if currently paused, restores the live bundle on Cloudflare',
    "Pages. It's idempotent and free — safe to retry. Custom-domain sites stay live regardless and",
    'do not need this call (they pay $10/site/month for always-on hosting).',
  ].join(' '),
  inputSchema: {
    siteId: z.string().min(1).describe('Site UUID to refresh.'),
  },
  handler: async (args, client) => {
    return client.post(`/sites/${encodeURIComponent(args.siteId)}/refresh`);
  },
});

export const siteTools: AnyTool[] = [createSite, getSite, listSites, refreshSite];
