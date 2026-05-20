import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { webhookTools } from '../src/tools/webhooks.js';
import { mockClient, runTool } from './helpers.js';

const configureFormWebhook = webhookTools.find((t) => t.name === 'configure_form_webhook')!;

describe('configure_form_webhook', () => {
  it('rejects missing webhook_url', () => {
    const schema = z.object(configureFormWebhook.inputSchema);
    expect(() => schema.parse({ siteId: 'abc' })).toThrow();
  });

  it('rejects non-URL webhook_url', () => {
    const schema = z.object(configureFormWebhook.inputSchema);
    expect(() => schema.parse({ siteId: 'abc', webhook_url: 'not-a-url' })).toThrow();
  });

  it('accepts a valid http(s) URL', () => {
    const schema = z.object(configureFormWebhook.inputSchema);
    expect(() =>
      schema.parse({ siteId: 'abc', webhook_url: 'https://example.com/hook' })
    ).not.toThrow();
  });

  it('POSTs to /sites/:id/webhooks/forms with the body', async () => {
    const { client, calls } = mockClient({
      ok: true,
      site_id: 'site-abc',
      webhook_url: 'https://example.com/hook',
      secret_issued: 'wwsec_abc',
    });
    await runTool(
      configureFormWebhook,
      { siteId: 'site-abc', webhook_url: 'https://example.com/hook' },
      client
    );
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.url).toBe('https://api.example.com/v1/sites/site-abc/webhooks/forms');
    expect(calls[0]!.body).toEqual({ webhook_url: 'https://example.com/hook' });
  });

  it('passes rotate_secret through when provided', async () => {
    const { client, calls } = mockClient();
    await runTool(
      configureFormWebhook,
      {
        siteId: 'site-abc',
        webhook_url: 'https://example.com/hook',
        rotate_secret: true,
      },
      client
    );
    expect(calls[0]!.body).toEqual({
      webhook_url: 'https://example.com/hook',
      rotate_secret: true,
    });
  });

  it('omits rotate_secret from body when not provided', async () => {
    const { client, calls } = mockClient();
    await runTool(
      configureFormWebhook,
      { siteId: 'site-abc', webhook_url: 'https://example.com/hook' },
      client
    );
    expect(calls[0]!.body).not.toHaveProperty('rotate_secret');
  });
});
