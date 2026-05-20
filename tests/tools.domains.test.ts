import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { domainTools } from '../src/tools/domains.js';
import { mockClient, runTool } from './helpers.js';

const checkDomain = domainTools.find((t) => t.name === 'check_domain')!;
const registerDomain = domainTools.find((t) => t.name === 'register_domain')!;
const attachDomain = domainTools.find((t) => t.name === 'attach_domain')!;

describe('check_domain', () => {
  it('rejects empty domain', () => {
    const schema = z.object(checkDomain.inputSchema);
    expect(() => schema.parse({ domain: '' })).toThrow();
  });

  it('POSTs to /domains/check with full body', async () => {
    const { client, calls } = mockClient({
      domain: 'acme.com',
      available: true,
      price_cents: 1099,
      suggestions: [],
    });
    await runTool(
      checkDomain,
      { domain: 'acme.com', city: 'austin', industry: 'plumbing' },
      client
    );
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.url).toBe('https://api.example.com/v1/domains/check');
    expect(calls[0]!.body).toEqual({
      domain: 'acme.com',
      city: 'austin',
      industry: 'plumbing',
    });
  });

  it('works with just the domain', async () => {
    const { client, calls } = mockClient();
    await runTool(checkDomain, { domain: 'acme.com' }, client);
    expect(calls[0]!.body).toEqual({ domain: 'acme.com' });
  });
});

describe('register_domain', () => {
  const validBody = {
    siteId: 'site-abc',
    domain: 'acme.com',
    pagesProjectName: 'acme-a1b2c3',
    price: 1099,
  };

  it('rejects missing fields', () => {
    const schema = z.object(registerDomain.inputSchema);
    expect(() => schema.parse({ ...validBody, siteId: undefined })).toThrow();
    expect(() => schema.parse({ ...validBody, domain: undefined })).toThrow();
    expect(() => schema.parse({ ...validBody, pagesProjectName: undefined })).toThrow();
    expect(() => schema.parse({ ...validBody, price: undefined })).toThrow();
  });

  it('rejects non-integer price', () => {
    const schema = z.object(registerDomain.inputSchema);
    expect(() => schema.parse({ ...validBody, price: 10.99 })).toThrow();
  });

  it('rejects zero or negative price', () => {
    const schema = z.object(registerDomain.inputSchema);
    expect(() => schema.parse({ ...validBody, price: 0 })).toThrow();
    expect(() => schema.parse({ ...validBody, price: -1 })).toThrow();
  });

  it('POSTs to /domains/register with all four fields', async () => {
    const { client, calls } = mockClient({ success: true, domain: 'acme.com', status: 'active' });
    await runTool(registerDomain, validBody, client);
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.url).toBe('https://api.example.com/v1/domains/register');
    expect(calls[0]!.body).toEqual(validBody);
  });
});

describe('attach_domain', () => {
  it('rejects missing siteId or domain', () => {
    const schema = z.object(attachDomain.inputSchema);
    expect(() => schema.parse({ siteId: 'abc' })).toThrow();
    expect(() => schema.parse({ domain: 'acme.com' })).toThrow();
  });

  it('POSTs to /sites/:id/domains with just { domain }', async () => {
    const { client, calls } = mockClient({
      success: true,
      domain: 'acme.com',
      cname_target: 'acme-a1b2c3.pages.dev',
    });
    await runTool(attachDomain, { siteId: 'site-abc', domain: 'acme.com' }, client);
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.url).toBe('https://api.example.com/v1/sites/site-abc/domains');
    // siteId is a path param, NOT in the body
    expect(calls[0]!.body).toEqual({ domain: 'acme.com' });
  });
});
