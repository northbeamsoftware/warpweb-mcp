import { z } from 'zod';
import { defineTool, type AnyTool } from './types.js';

/**
 * POST /v1/businesses/search — disambiguation BEFORE create_site.
 *
 * Critical for LLM-agent flows: when the user gives only a business name
 * (especially a common one like "Acme Plumbing"), calling `create_site`
 * directly silently picks the first Google Places match — often the wrong
 * business. This tool returns up to 5 candidates so the agent can pick (or
 * ask the user to pick) the right one, then pass that exact `placeId` to
 * `create_site`.
 *
 * Free; no credits consumed.
 */
const searchBusinesses = defineTool({
  name: 'search_businesses',
  title: 'Find the right Google Places match for a business name',
  description: [
    "Search Google Places for a business by name. Returns up to 5 candidates. Free, no credits, no side effects.",
    '',
    "**REQUIRED before `create_site`** whenever you have only a business name (no `placeId` already in hand).",
    "Common names like \"Acme Plumbing\" or \"Pizza Place\" will silently resolve to the wrong business if you",
    "skip this step. Do NOT skip search just because you're confident about the name — the customer's local",
    "context isn't enough to guarantee Google Places ranks the right one first.",
    '',
    "Each result includes `placeId`, `name`, `address`, `phone`, `rating`, `userRatingCount`, and `businessType`.",
    "Present the top 2–3 results to the user (city + rating count) and ask which one. If exactly one result comes",
    "back, you can proceed without confirmation. If multiple come back and you have high confidence from other",
    "user context, you may pick the one with the highest `userRatingCount`, but only call that out — never silently auto-pick.",
    '',
    "Canonical flow:",
    "  1. search_businesses({ query, location? }) → user picks (or single result auto-picks)",
    "  2. create_site({ businessName, contactEmail, placeId: <picked> })",
    '',
    "**On transient failure** (timeout, 5xx, network error): retry ONCE. If the retry also fails, tell the user",
    "\"the disambiguation lookup is temporarily unavailable\" and ASK whether to proceed without a `placeId`",
    "(in which case `create_site` will auto-resolve from `businessName + businessLocation` — coin flip for common",
    "names). Do NOT silently fall through to gathering create_site fields from the user — that wastes their time",
    "and bypasses the safety of disambiguation.",
  ].join(' '),
  inputSchema: {
    query: z
      .string()
      .min(1)
      .describe(
        'Business name to search for. Free-form text Google Places will search (e.g. "Acme Plumbing", "Mike\'s BBQ").',
      ),
    location: z
      .string()
      .optional()
      .describe(
        'Optional location hint to narrow the search (e.g. "Austin, TX", "78704", "near downtown Dallas"). Strongly recommended for common names — omitting it lets Google rank by global popularity, which usually picks the wrong business.',
      ),
  },
  handler: async (args, client) => {
    return client.post('/businesses/search', args);
  },
});

export const businessTools: AnyTool[] = [searchBusinesses];
