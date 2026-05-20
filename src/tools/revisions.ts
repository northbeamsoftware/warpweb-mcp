import { z } from 'zod';
import { defineTool, type AnyTool } from './types.js';

/**
 * POST /v1/sites/:id/revisions — async, returns revisionId.
 */
const createRevision = defineTool({
  name: 'create_revision',
  title: 'Edit a Warpweb site with a natural-language prompt',
  description: [
    'Conversational edit of a deployed site. Send a plain-English prompt and Warpweb re-deploys.',
    'Works for small surgical edits ("make the hero photo darker", "change the headline to ...",',
    '"swap the phone number") and for structural changes ("add an FAQ section about emergency',
    'repairs", "move the service area below testimonials", "restructure the homepage around 3',
    'service categories"). The right size of edit is chosen automatically based on scope — you',
    'just describe what you want.',
    '',
    'ASYNC: returns a `revisionId` and `queue_position` immediately. Real revisions take 30s–4min.',
    "Poll `get_site` until `updated_at` changes, OR subscribe to `site.revision_complete` /",
    "`site.revision_failed` / `site.revision_clarification_needed` lifecycle webhooks for push",
    "delivery. If the agent needs clarification, the clarification webhook fires with a `question`",
    'field; reply by calling `create_revision` again with the answer in the prompt.',
    '',
    'Revisions inside the same site queue serially (depth cap 3 — 1 running + 2 waiting). If you',
    'hit `queue_full: true`, wait for the current edit to land before queuing more.',
    '',
    'Cost: ~20–100 credits per revision, billed against actual AI usage at the end.',
  ].join(' '),
  inputSchema: {
    siteId: z.string().min(1).describe('Site UUID to edit.'),
    prompt: z
      .string()
      .min(1)
      .describe(
        'Natural-language description of the change. Be specific about what to change and what to leave alone.'
      ),
  },
  handler: async (args, client) => {
    return client.post(`/sites/${encodeURIComponent(args.siteId)}/revisions`, {
      prompt: args.prompt,
    });
  },
});

export const revisionTools: AnyTool[] = [createRevision];
