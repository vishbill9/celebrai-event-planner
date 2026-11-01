import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signOut = vi.fn();
vi.mock('./supabase', () => ({
  getSupabase: () =>
    Promise.resolve({
      auth: {
        getSession: () => Promise.resolve({ data: { session: { access_token: 'tok-123' } } }),
        signOut,
      },
    }),
}));

import { api, ApiError } from './api';

function reply(status: number, body: unknown) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
}

describe('api client', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    signOut.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends the access token and unwraps the response', async () => {
    fetchMock.mockReturnValue(reply(200, { events: [{ id: 'e1' }] }));
    const events = await api.listEvents();
    expect(events).toEqual([{ id: 'e1' }]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/events');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
  });

  it('posts JSON bodies', async () => {
    fetchMock.mockReturnValue(reply(201, { guest: { id: 'g1' } }));
    await api.addGuest('e1', { name: 'Asha' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/events/e1/guests');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'Asha' });
  });

  it('turns an API error into an ApiError with the server message', async () => {
    fetchMock.mockReturnValue(reply(400, { error: { code: 'location_needed', message: 'Add a location first.' } }));
    await expect(api.findVenues('e1')).rejects.toMatchObject({ status: 400, code: 'location_needed', message: 'Add a location first.' });
  });

  it('signs the user out on 401', async () => {
    fetchMock.mockReturnValue(reply(401, { error: { code: 'unauthorized', message: 'Please sign in.' } }));
    await expect(api.listEvents()).rejects.toBeInstanceOf(ApiError);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('reports a friendly message when the network is down', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.listEvents()).rejects.toMatchObject({ status: 0, code: 'network' });
  });
});
