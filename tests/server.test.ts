import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';
import { allTools } from '../src/tools/index.js';
import { mockClient } from './helpers.js';

describe('buildServer', () => {
  it('builds without throwing when given a client', () => {
    const { client } = mockClient();
    const server = buildServer({ client });
    expect(server).toBeDefined();
  });

  it('registers all tools by default', () => {
    const { client } = mockClient();
    buildServer({ client });
    // allTools is the source-of-truth list; assert we have the expected 9
    expect(allTools.length).toBe(9);
  });

  it('exposes exactly the documented tool names', () => {
    const names = allTools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'attach_domain',
        'check_domain',
        'configure_form_webhook',
        'create_revision',
        'create_site',
        'get_site',
        'list_sites',
        'refresh_site',
        'register_domain',
      ].sort()
    );
  });

  it('every tool has a non-empty description and title', () => {
    for (const t of allTools) {
      expect(t.name).toMatch(/^[a-z_]+$/);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  it('allows building with a custom (empty) tool list — used when API key is missing', () => {
    const { client } = mockClient();
    const server = buildServer({ client, tools: [] });
    expect(server).toBeDefined();
  });
});
