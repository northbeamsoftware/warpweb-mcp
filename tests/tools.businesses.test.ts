import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { businessTools } from '../src/tools/businesses.js';
import { mockClient, runTool } from './helpers.js';

const searchBusinesses = businessTools.find((t) => t.name === 'search_businesses')!;

describe('search_businesses', () => {
  it('exists in businessTools', () => {
    expect(searchBusinesses).toBeDefined();
    expect(searchBusinesses.name).toBe('search_businesses');
  });

  it('rejects empty query', () => {
    const schema = z.object(searchBusinesses.inputSchema);
    expect(() => schema.parse({ query: '' })).toThrow();
  });

  it('rejects missing query', () => {
    const schema = z.object(searchBusinesses.inputSchema);
    // @ts-expect-error — testing missing required field
    expect(() => schema.parse({})).toThrow();
  });

  it('accepts query without location', () => {
    const schema = z.object(searchBusinesses.inputSchema);
    expect(() => schema.parse({ query: 'Acme Plumbing' })).not.toThrow();
  });

  it('accepts query with location', () => {
    const schema = z.object(searchBusinesses.inputSchema);
    expect(() =>
      schema.parse({ query: 'Acme Plumbing', location: 'Austin, TX' })
    ).not.toThrow();
  });

  it('POSTs to /businesses/search with full body', async () => {
    const { client, calls } = mockClient({
      results: [
        {
          placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
          name: 'Acme Plumbing & Drain',
          address: '123 Main St, Austin, TX',
          phone: '+15125550123',
          rating: 4.7,
          userRatingCount: 184,
          businessType: 'plumber',
        },
      ],
    });
    await runTool(
      searchBusinesses,
      { query: 'Acme Plumbing', location: 'Austin, TX' },
      client
    );
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.url).toBe('https://api.example.com/v1/businesses/search');
    expect(calls[0]!.body).toEqual({
      query: 'Acme Plumbing',
      location: 'Austin, TX',
    });
  });

  it('omits location from body when not provided', async () => {
    const { client, calls } = mockClient({ results: [] });
    await runTool(searchBusinesses, { query: 'Brookside Plumbing' }, client);
    expect(calls[0]!.body).toEqual({ query: 'Brookside Plumbing' });
  });

  it('surfaces API errors through the tool result', async () => {
    // Non-2xx response — the client throws WarpwebApiError which the tool
    // handler bubbles up to the MCP server (server wraps it as a tool
    // error). Same convention as the domain tools tests.
    const { client } = mockClient({ error: 'Upstream Places error' }, 500);
    await expect(
      runTool(searchBusinesses, { query: 'Anything' }, client)
    ).rejects.toThrow();
  });
});
