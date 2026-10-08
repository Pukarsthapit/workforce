import handler from '../api/v1/session';

function responseMock() {
  const res = {
    code: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    setHeader(name: string, value: string) { this.headers[name] = value; return this; },
    status(code: number) { this.code = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return res;
}

const invoke = (authorization?: string, method = 'GET') => {
  const res = responseMock();
  return handler({ method, headers: authorization ? { authorization } : {} }, res).then(() => res);
};

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://workforce.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'public-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-only-key');
  vi.stubEnv('WORKFORCE_SUPER_ADMIN_EMAIL', 'pukarsthapit91@gmail.com');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test('rejects missing tokens without calling Supabase', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const res = await invoke();
  expect(res.code).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('requires a verified Google email before employee matching', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    id: 'user-1', email: 'worker@example.com', email_confirmed_at: null,
    app_metadata: { providers: ['google'] },
  }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const res = await invoke('Bearer user-jwt');
  expect(res.code).toBe(403);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('rejects a password identity even when its email is confirmed', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    id: 'user-3', email: 'worker@example.com', email_confirmed_at: '2026-10-08T00:00:00Z',
    app_metadata: { providers: ['email'] },
  }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const res = await invoke('Bearer user-jwt');
  expect(res.code).toBe(403);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('resolves verified Google users with the server-only Supabase service role', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({
      id: 'user-1', email: 'PUKARSTHAPIT91@gmail.com', email_confirmed_at: '2026-10-08T00:00:00Z',
      app_metadata: { providers: ['google'] },
    }), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({
      person_code: 'SYS-USER1', name: 'Super Admin', user_type: 'admin',
      capabilities: ['master_data', 'perm_cfg'], state: 'active', location_name: '',
    }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const res = await invoke('Bearer user-jwt');
  expect(res.code).toBe(200);
  expect(res.body).toMatchObject({
    account: { email: 'pukarsthapit91@gmail.com', userType: 'admin', personCode: 'SYS-USER1' },
    capabilities: ['master_data', 'perm_cfg'],
    simulated: false,
  });
  expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
    headers: expect.objectContaining({
      apikey: 'server-only-key',
      Authorization: 'Bearer server-only-key',
    }),
  });
});

test('denies a Google account without a matching employee record', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({
      id: 'user-2', email: 'not-on-roster@example.com', email_confirmed_at: '2026-10-08T00:00:00Z',
      app_metadata: { providers: ['google'] },
    }), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'employee-not-found-or-ambiguous' }), { status: 400 }));
  vi.stubGlobal('fetch', fetchMock);
  const res = await invoke('Bearer user-jwt');
  expect(res.code).toBe(403);
  expect(res.body).toMatchObject({ code: 'employee-not-found' });
});

test('rejects methods other than session reads', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const res = await invoke('Bearer user-jwt', 'POST');
  expect(res.code).toBe(405);
  expect(fetchMock).not.toHaveBeenCalled();
});
