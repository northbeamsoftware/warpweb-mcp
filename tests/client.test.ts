import { describe, expect, it, vi } from 'vitest';
import { WarpwebClient, WarpwebApiError, DEFAULT_BASE_URL } from '../src/client.js';

function mockFetchOk(body: unknown, init?: { status?: number }): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  ) as unknown as typeof fetch;
}

function mockFetchError(status: number, body: unknown): typeof fetch {
  return vi.fn(async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  ) as unknown as typeof fetch;
}

describe('WarpwebClient', () => {
  it('throws if apiKey missing', () => {
    expect(() => new WarpwebClient({ apiKey: '' })).toThrow(/apiKey is required/);
  });

  it('uses default base URL when none provided', () => {
    const fetchImpl = mockFetchOk({ ok: true });
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl });
    return client.get('/sites').then(() => {
      const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      const url = calls[0]?.[0] as string;
      expect(url).toBe(`${DEFAULT_BASE_URL}/sites`);
    });
  });

  it('strips trailing slashes from base URL', async () => {
    const fetchImpl = mockFetchOk({ ok: true });
    const client = new WarpwebClient({
      apiKey: 'wwk_x',
      baseUrl: 'https://api.example.com/v1///',
      fetchImpl,
    });
    await client.get('/sites');
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls[0]?.[0]).toBe('https://api.example.com/v1/sites');
  });

  it('rejects paths that do not start with /', async () => {
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl: mockFetchOk({}) });
    await expect(client.get('sites')).rejects.toThrow(/must start with/);
  });

  it('sends Bearer Authorization header', async () => {
    const fetchImpl = mockFetchOk({ ok: true });
    const client = new WarpwebClient({ apiKey: 'wwk_test_123', fetchImpl });
    await client.get('/sites');
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const init = calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer wwk_test_123');
  });

  it('sends Accept + User-Agent headers', async () => {
    const fetchImpl = mockFetchOk({ ok: true });
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl });
    await client.get('/sites');
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const init = calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Accept).toBe('application/json');
    expect(headers['User-Agent']).toMatch(/warpweb-mcp/);
  });

  it('serializes JSON body and sets Content-Type on POST', async () => {
    const fetchImpl = mockFetchOk({ ok: true });
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl });
    await client.post('/sites', { businessName: 'Acme', contactEmail: 'a@b.com' });
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const init = calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({
      businessName: 'Acme',
      contactEmail: 'a@b.com',
    });
  });

  it('does not set Content-Type on GET (no body)', async () => {
    const fetchImpl = mockFetchOk({ ok: true });
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl });
    await client.get('/sites');
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const init = calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('parses JSON response body', async () => {
    const fetchImpl = mockFetchOk({ id: 'abc', status: 'generating' });
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl });
    const result = await client.get<{ id: string; status: string }>('/sites/abc');
    expect(result).toEqual({ id: 'abc', status: 'generating' });
  });

  it('returns null for an empty body', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 200 })) as unknown as typeof fetch;
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl });
    const result = await client.get('/sites');
    expect(result).toBeNull();
  });

  it('throws WarpwebApiError on 401 with friendly message', async () => {
    const fetchImpl = mockFetchError(401, { error: 'invalid_api_key' });
    const client = new WarpwebClient({ apiKey: 'wwk_bad', fetchImpl });
    await expect(client.get('/sites')).rejects.toMatchObject({
      status: 401,
      message: expect.stringMatching(/WARPWEB_API_KEY/),
    });
  });

  it('throws WarpwebApiError on 402 with credits message', async () => {
    const fetchImpl = mockFetchError(402, { error: 'PAYMENT_REQUIRED' });
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl });
    await expect(client.post('/sites', {})).rejects.toMatchObject({
      status: 402,
      message: expect.stringMatching(/credits/i),
    });
  });

  it('throws WarpwebApiError on 429', async () => {
    const fetchImpl = mockFetchError(429, { error: 'Daily revision limit reached', quota: {} });
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl });
    await expect(client.post('/sites/abc/revisions', { prompt: 'x' })).rejects.toMatchObject({
      status: 429,
    });
  });

  it('throws WarpwebApiError on 500', async () => {
    const fetchImpl = mockFetchError(500, { error: 'Failed to create site record' });
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl });
    await expect(client.post('/sites', {})).rejects.toBeInstanceOf(WarpwebApiError);
  });

  it('wraps network errors as WarpwebApiError with status 0', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl });
    await expect(client.get('/sites')).rejects.toMatchObject({
      status: 0,
      message: expect.stringMatching(/Network error/),
    });
  });

  it('honors custom baseUrl from env-like config', async () => {
    const fetchImpl = mockFetchOk({ ok: true });
    const client = new WarpwebClient({
      apiKey: 'wwk_x',
      baseUrl: 'http://localhost:3001/v1',
      fetchImpl,
    });
    await client.get('/sites');
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls[0]?.[0]).toBe('http://localhost:3001/v1/sites');
  });

  it('returns parsed string when body is not JSON', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('plain text', { status: 200 })
    ) as unknown as typeof fetch;
    const client = new WarpwebClient({ apiKey: 'wwk_x', fetchImpl });
    const res = await client.get('/anything');
    expect(res).toBe('plain text');
  });
});
