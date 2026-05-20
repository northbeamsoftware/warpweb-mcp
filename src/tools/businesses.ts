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
    "Search Google Places for a business by name and return up to 5 candidates. STRONGLY",
    "RECOMMENDED to call this BEFORE `create_site` whenever you have only a business name —",
    "common names like \"Acme Plumbing\" or \"Pizza Place\" will silently resolve to the wrong",
    "business otherwise.",
    '',
    "Each result includes `placeId` (pass to `create_site` for exact match), `name`, `address`,",
    "`phone`, `rating`, `userRatingCount`, and `businessType`. Present the top 2-3 results to",
    "the user with city + rating count for confirmation, OR pick the one with the highest",
    "`userRatingCount` if you have high confidence from the user's other context.",
    '',
    "Two-step flow:",
    "  1. search_businesses({ query, location? }) → pick a result",
    "  2. create_site({ businessName, contactEmail, placeId: <picked> }) → exact match",
    '',
    "Free. No credits consumed. No side effects.",
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
