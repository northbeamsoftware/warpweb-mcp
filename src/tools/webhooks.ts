import { z } from 'zod';
import { defineTool, type AnyTool } from './types.js';

/**
 * POST /v1/sites/:id/webhooks/forms
 */
const configureFormWebhook = defineTool({
  name: 'configure_form_webhook',
  title: 'Configure where a site sends form submissions',
  description: [
    "Configure the URL Warpweb POSTs to whenever a form is submitted on this site. Each delivery",
    'is signed with HMAC-SHA256 (header `X-Warpweb-Signature` over the raw request body) using a',
    'site-scoped secret.',
    '',
    'IMPORTANT: the signing secret is returned in `secret_issued` ONLY on the first configure or',
    'when `rotate_secret: true` is passed — store it immediately, it is not retrievable later.',
    'Re-configuring with the same URL is idempotent (no new secret issued).',
    '',
    "Before this is configured, form submissions deliver as plain email to the site's contact",
    "email instead. Most API customers want the webhook path for structured JSON + verification.",
    '',
    'Free to configure; free to deliver.',
  ].join(' '),
  inputSchema: {
    siteId: z.string().min(1).describe('Site UUID to configure the form webhook for.'),
    webhook_url: z
      .string()
      .url()
      .describe('Your HTTP(S) endpoint that will receive form-submission POSTs.'),
    rotate_secret: z
      .boolean()
      .optional()
      .describe(
        'When true, regenerates the signing secret (invalidates the prior one). Default false.'
      ),
  },
  handler: async (args, client) => {
    const body: Record<string, unknown> = { webhook_url: args.webhook_url };
    if (args.rotate_secret !== undefined) body.rotate_secret = args.rotate_secret;
    return client.post(`/sites/${encodeURIComponent(args.siteId)}/webhooks/forms`, body);
  },
});

export const webhookTools: AnyTool[] = [configureFormWebhook];
