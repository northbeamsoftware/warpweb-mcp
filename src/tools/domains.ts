import { z } from 'zod';
import { defineTool, type AnyTool } from './types.js';

/**
 * POST /v1/domains/check — free, cheap, no side effects.
 */
const checkDomain = defineTool({
  name: 'check_domain',
  title: 'Check domain availability + price',
  description: [
    'Check whether a domain is available to register through Warpweb and what it costs. Returns',
    'availability + `price_cents` for the requested domain plus a few related suggestions (name',
    'variations, regional variants).',
    '',
    'This is step 1 of a two-call flow: use this to discover a price, then pass the EXACT',
    '`price_cents` value into `register_domain` — the price must match or the registration call',
    'will fail. Free; no credits consumed; no side effects.',
  ].join(' '),
  inputSchema: {
    domain: z
      .string()
      .min(1)
      .describe('The domain to check, including TLD (e.g. "acme-plumbing.com").'),
    city: z
      .string()
      .optional()
      .describe('City name to bias regional suggestions (e.g. "austin").'),
    industry: z
      .string()
      .optional()
      .describe('Industry to bias related suggestions (e.g. "plumbing").'),
  },
  handler: async (args, client) => {
    return client.post('/domains/check', args);
  },
});

/**
 * POST /v1/domains/register — buy + attach.
 */
const registerDomain = defineTool({
  name: 'register_domain',
  title: 'Register a new domain and attach it to a site',
  description: [
    "Purchase a domain via Cloudflare Registrar at-cost and attach it to a deployed Warpweb site",
    'in one shot. DNS + Pages custom-domain wiring happen automatically.',
    '',
    'PRECONDITION: call `check_domain` first to get a price. The `price` you pass here must EXACTLY',
    'match the `price_cents` returned by check_domain — this guards against price-drift surprises.',
    'Price cap: $50/yr ($5000 cents). The `pagesProjectName` field is the site `slug` returned by',
    '`create_site` (e.g. "acme-plumbing-a1b2c3").',
    '',
    "Cost: 50 credits + the registrar pass-through fee (in cents). Custom-domain sites also become",
    'Active Sites ($10/site/month) for always-on hosting + SSL + monitoring.',
  ].join(' '),
  inputSchema: {
    siteId: z.string().min(1).describe('Site UUID to attach the domain to.'),
    domain: z.string().min(1).describe('Domain to register (must be the same domain you checked).'),
    pagesProjectName: z
      .string()
      .min(1)
      .describe('The site slug returned by `create_site` (e.g. "acme-plumbing-a1b2c3").'),
    price: z
      .number()
      .int()
      .positive()
      .describe(
        'Price in CENTS, must match `price_cents` returned by `check_domain`. Cap: 5000 cents ($50/yr).'
      ),
  },
  handler: async (args, client) => {
    return client.post('/domains/register', args);
  },
});

/**
 * POST /v1/sites/:id/domains — attach an externally-registered domain.
 */
const attachDomain = defineTool({
  name: 'attach_domain',
  title: 'Attach an external domain the user already owns',
  description: [
    'Attach a domain the customer already registered elsewhere (e.g. GoDaddy, Namecheap) to a',
    'deployed Warpweb site. Returns the CNAME target the customer must set at their existing',
    'registrar, plus copy-paste DNS instructions for apex + www. Domain status is `dns_pending`',
    'until propagation completes (usually minutes, occasionally up to 48 hours).',
    '',
    "Use this when the customer says 'I already own the domain' — versus `register_domain` for new",
    'purchases through Cloudflare Registrar.',
    '',
    "Cost: 5 credits. Custom-domain sites become Active Sites ($10/site/month) for always-on",
    'hosting + SSL + monitoring.',
  ].join(' '),
  inputSchema: {
    siteId: z.string().min(1).describe('Site UUID to attach the domain to.'),
    domain: z
      .string()
      .min(1)
      .describe('The domain to attach (e.g. "acme-plumbing.com"). Must be owned by the customer.'),
  },
  handler: async (args, client) => {
    return client.post(`/sites/${encodeURIComponent(args.siteId)}/domains`, {
      domain: args.domain,
    });
  },
});

export const domainTools: AnyTool[] = [checkDomain, registerDomain, attachDomain];
