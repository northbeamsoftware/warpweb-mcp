import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { siteTools } from '../src/tools/sites.js';
import { mockClient, runTool } from './helpers.js';

function toolByName(name: string) {
  const t = siteTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} not found`);
  return t;
}

describe('create_site', () => {
  const tool = toolByName('create_site');

  it('rejects empty businessName', () => {
    const schema = z.object(tool.inputSchema);
    expect(() => schema.parse({ businessName: '', contactEmail: 'x@y.com' })).toThrow();
  });

  it('rejects missing contactEmail', () => {
    const schema = z.object(tool.inputSchema);
    expect(() => schema.parse({ businessName: 'Acme' })).toThrow();
  });

  it('rejects invalid email', () => {
    const schema = z.object(tool.inputSchema);
    expect(() => schema.parse({ businessName: 'Acme', contactEmail: 'not-an-email' })).toThrow();
  });

  it('accepts minimal valid input', () => {
    const schema = z.object(tool.inputSchema);
    expect(() => schema.parse({ businessName: 'Acme', contactEmail: 'a@b.com' })).not.toThrow();
  });

  it('rejects businessName over 200 chars', () => {
    const schema = z.object(tool.inputSchema);
    expect(() =>
      schema.parse({ businessName: 'a'.repeat(201), contactEmail: 'a@b.com' })
    ).toThrow();
  });

  it('rejects invalid facebookUrl', () => {
    const schema = z.object(tool.inputSchema);
    expect(() =>
      schema.parse({ businessName: 'Acme', contactEmail: 'a@b.com', facebookUrl: 'not-a-url' })
    ).toThrow();
  });

  it('POSTs to /sites with full body', async () => {
    const { client, calls } = mockClient({ siteId: 'uuid', status: 'generating', slug: 'acme-x' });
    const result = await runTool(
      tool,
      {
        businessName: 'Acme Plumbing',
        contactEmail: 'owner@acme.com',
        businessLocation: 'Austin, TX',
        ownerPrompt: 'Emphasize 24/7 service',
      },
      client
    );
    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.method).toBe('POST');
    expect(call.url).toBe('https://api.example.com/v1/sites');
    expect(call.body).toEqual({
      businessName: 'Acme Plumbing',
      contactEmail: 'owner@acme.com',
      businessLocation: 'Austin, TX',
      ownerPrompt: 'Emphasize 24/7 service',
    });
    expect(result).toMatchObject({ siteId: 'uuid', status: 'generating' });
  });

  it('passes uploadedPhotos array through', async () => {
    const { client, calls } = mockClient();
    await runTool(
      tool,
      {
        businessName: 'Acme',
        contactEmail: 'a@b.com',
        uploadedPhotos: ['https://cdn.example.com/1.jpg', 'https://cdn.example.com/2.jpg'],
      },
      client
    );
    expect(calls[0]!.body).toMatchObject({
      uploadedPhotos: ['https://cdn.example.com/1.jpg', 'https://cdn.example.com/2.jpg'],
    });
  });
});

describe('get_site', () => {
  const tool = toolByName('get_site');

  it('rejects empty siteId', () => {
    const schema = z.object(tool.inputSchema);
    expect(() => schema.parse({ siteId: '' })).toThrow();
  });

  it('GETs /sites/:id with the siteId path-encoded', async () => {
    const { client, calls } = mockClient({ id: 'uuid', status: 'complete' });
    await runTool(tool, { siteId: 'abc-123' }, client);
    expect(calls[0]!.method).toBe('GET');
    expect(calls[0]!.url).toBe('https://api.example.com/v1/sites/abc-123');
    expect(calls[0]!.body).toBeUndefined();
  });

  it('encodes special characters in siteId', async () => {
    const { client, calls } = mockClient();
    await runTool(tool, { siteId: 'weird/id?' }, client);
    expect(calls[0]!.url).toBe('https://api.example.com/v1/sites/weird%2Fid%3F');
  });
});

describe('list_sites', () => {
  const tool = toolByName('list_sites');

  it('accepts empty input', () => {
    const schema = z.object(tool.inputSchema);
    expect(() => schema.parse({})).not.toThrow();
  });

  it('GETs /sites', async () => {
    const { client, calls } = mockClient([]);
    await runTool(tool, {}, client);
    expect(calls[0]!.method).toBe('GET');
    expect(calls[0]!.url).toBe('https://api.example.com/v1/sites');
  });
});

describe('refresh_site', () => {
  const tool = toolByName('refresh_site');

  it('POSTs to /sites/:id/refresh', async () => {
    const { client, calls } = mockClient({ site_id: 'abc', was_paused: false });
    await runTool(tool, { siteId: 'abc' }, client);
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.url).toBe('https://api.example.com/v1/sites/abc/refresh');
    expect(calls[0]!.body).toEqual({}); // empty body per spec
  });

  it('rejects empty siteId', () => {
    const schema = z.object(tool.inputSchema);
    expect(() => schema.parse({ siteId: '' })).toThrow();
  });
});
