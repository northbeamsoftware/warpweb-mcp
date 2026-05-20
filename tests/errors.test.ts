import { describe, expect, it, vi } from 'vitest';
import { WarpwebApiError, WarpwebClient } from '../src/client.js';
import { siteTools } from '../src/tools/sites.js';
import { runTool } from './helpers.js';

describe('Error surfacing through tool handlers', () => {
  it('surfaces a 402 from create_site as a WarpwebApiError', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: 'PAYMENT_REQUIRED',
            reason: 'balance_zero_no_auto_refill',
            resolution: 'Add credits at https://warpweb.ai/app/credits',
          }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        )
    ) as unknown as typeof fetch;
    const client = new WarpwebClient({
      apiKey: 'wwk_x',
      baseUrl: 'https://api.example.com/v1',
      fetchImpl,
    });
    const createSite = siteTools.find((t) => t.name === 'create_site')!;
    await expect(
      runTool(createSite, { businessName: 'Acme', contactEmail: 'a@b.com' }, client)
    ).rejects.toBeInstanceOf(WarpwebApiError);
  });

  it('preserves the parsed body inside the error for the LLM to read', async () => {
    const body = {
      error: 'Daily site generation limit reached (3 / day)',
      quota: { used: 3, limit: 3, resetDescription: 'Resets at 00:00 UTC' },
    };
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
    ) as unknown as typeof fetch;
    const client = new WarpwebClient({
      apiKey: 'wwk_x',
      baseUrl: 'https://api.example.com/v1',
      fetchImpl,
    });
    const createSite = siteTools.find((t) => t.name === 'create_site')!;
    try {
      await runTool(createSite, { businessName: 'Acme', contactEmail: 'a@b.com' }, client);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WarpwebApiError);
      expect((err as WarpwebApiError).body).toEqual(body);
      expect((err as WarpwebApiError).status).toBe(429);
    }
  });
});
