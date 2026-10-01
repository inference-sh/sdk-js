import { HttpClient } from '../http/client';
import { ApiKeyScopeUser, ApiKeyScopeWorkspace } from '../types';
import { ApiKeysAPI } from './api-keys';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('ApiKeysAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new ApiKeysAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /apikeys/list for list()', async () => {
    const page = { items: [{ id: 'key-1', name: 'CI' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list();

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apikeys/list');
    expect(init.method).toBe('POST');
  });

  it('should POST /apikeys for create()', async () => {
    const payload = { name: 'deploy-bot', scopes: ['tasks:read'] };
    const key = { id: 'key-new', ...payload, key: 'inf_sk_abc' };
    mockJsonResponse(key);

    const result = await api().create(payload);

    expect(result.data).toEqual(key);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apikeys');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should forward workspace scope on create() for service-account keys', async () => {
    const payload = {
      name: 'ci-deploy',
      scopes: ['apikeys:read'],
      scope: ApiKeyScopeWorkspace,
    };
    const key = {
      id: 'key-ws',
      ...payload,
      scope: ApiKeyScopeWorkspace,
      created_by: 'user-admin',
      scopes: [],
      key: 'inf_sk_workspace',
    };
    mockJsonResponse(key);

    const result = await api().create(payload);

    expect(result.data?.scope).toBe(ApiKeyScopeWorkspace);
    expect(result.data?.created_by).toBe('user-admin');
    expect(JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)).toEqual(
      payload
    );
  });

  it('should deserialize personal vs workspace keys on list()', async () => {
    const page = {
      items: [
        {
          id: 'key-personal',
          name: 'laptop',
          scope: ApiKeyScopeUser,
          created_by: 'user-1',
          scopes: ['tasks:read'],
        },
        {
          id: 'key-workspace',
          name: 'automation',
          scope: ApiKeyScopeWorkspace,
          created_by: 'user-admin',
          creator: { id: 'user-admin', name: 'Admin', email: 'admin@example.com' },
          scopes: ['apikeys:read'],
        },
      ],
      next_cursor: null,
    };
    mockJsonResponse(page);

    const result = await api().list();

    expect(result.data?.items[0].scope).toBe(ApiKeyScopeUser);
    expect(result.data?.items[1].scope).toBe(ApiKeyScopeWorkspace);
    expect(result.data?.items[1].creator?.email).toBe('admin@example.com');
  });

  it('should DELETE /apikeys/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('key-9');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apikeys/key-9');
    expect(init.method).toBe('DELETE');
  });
});
