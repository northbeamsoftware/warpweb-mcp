import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { revisionTools } from '../src/tools/revisions.js';
import { mockClient, runTool } from './helpers.js';

const createRevision = revisionTools.find((t) => t.name === 'create_revision')!;

describe('create_revision', () => {
  it('rejects missing prompt', () => {
    const schema = z.object(createRevision.inputSchema);
    expect(() => schema.parse({ siteId: 'abc' })).toThrow();
  });

  it('rejects empty prompt', () => {
    const schema = z.object(createRevision.inputSchema);
    expect(() => schema.parse({ siteId: 'abc', prompt: '' })).toThrow();
  });

  it('rejects missing siteId', () => {
    const schema = z.object(createRevision.inputSchema);
    expect(() => schema.parse({ prompt: 'make hero darker' })).toThrow();
  });

  it('POSTs to /sites/:id/revisions with just { prompt }', async () => {
    const { client, calls } = mockClient({
      revisionId: 'rev-1',
      status: 'pending',
      queue_position: 0,
      queue_total: 1,
    });
    await runTool(
      createRevision,
      { siteId: 'site-abc', prompt: 'make the hero photo darker' },
      client
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.url).toBe('https://api.example.com/v1/sites/site-abc/revisions');
    // siteId must NOT appear in body — it's a path param
    expect(calls[0]!.body).toEqual({ prompt: 'make the hero photo darker' });
  });

  it('does NOT leak siteId or unknown fields into the body', async () => {
    const { client, calls } = mockClient();
    await runTool(createRevision, { siteId: 'abc', prompt: 'edit X' }, client);
    expect(calls[0]!.body).not.toHaveProperty('siteId');
  });
});
