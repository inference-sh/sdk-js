import { HttpClient } from '../http/client';
import { TeamsAPI } from './teams';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('TeamsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new TeamsAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should GET /me for me()', async () => {
    const me = { user: { id: 'user-1' }, team: { id: 'team-1' } };
    mockJsonResponse(me);

    const result = await api().me();

    expect(result.data).toEqual(me);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/me');
    expect(init.method).toBe('GET');
  });

  it('should preserve org, team_view, and diagnostics on me()', async () => {
    const me = {
      user: { id: 'user-1', email: 'dev@example.com' },
      team: {
        id: 'team-1',
        type: 'team',
        name: 'Acme',
        username: 'acme',
        role: 'owner',
        org_id: 'org-1',
      },
      org: { id: 'org-1', slug: 'acme-corp', name: 'Acme Corp', is_admin: true },
      team_view: {
        team_id: 'team-1',
        kind: 'org_member',
        governance: {
          billing: { by: 'org', team_id: 'org-ws-1' },
          policy: { by: 'self', team_id: 'team-1' },
        },
        can: ['manage_members', 'manage_billing'],
        org: {
          id: 'org-1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          avatar_url: '',
          can: ['manage_billing'],
        },
      },
      diagnostics: { level: 2 },
    };
    mockJsonResponse(me);

    const result = await api().me();

    expect(result.data).toEqual(me);
    expect(result.data.org?.is_admin).toBe(true);
    expect(result.data.team_view?.kind).toBe('org_member');
    expect(result.data.team?.role).toBe('owner');
    expect(result.data.diagnostics?.level).toBe(2);
  });

  it('should GET /teams for list()', async () => {
    const teams = [{ id: 'team-1', name: 'Acme' }];
    mockJsonResponse(teams);

    const result = await api().list();

    expect(result.data).toEqual(teams);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams');
    expect(init.method).toBe('GET');
  });

  it('should preserve TeamDTO caller-scoped fields on list()', async () => {
    const teams = [
      {
        id: 'team-1',
        type: 'team',
        name: 'Shared',
        username: 'shared',
        avatar_url: '',
        email: 'team@example.com',
        setup_completed: true,
        max_concurrency: 4,
        status: 'active',
        role: 'admin',
        org_id: '',
        usage_policy_id: 'pol-1',
      },
    ];
    mockJsonResponse(teams);

    const result = await api().list();

    expect(result.data).toEqual(teams);
    expect(result.data[0].role).toBe('admin');
    expect(result.data[0].usage_policy_id).toBe('pol-1');
  });

  it('should POST /teams for create()', async () => {
    const payload = { name: 'New Team', username: 'new-team' };
    const team = { id: 'team-new', ...payload };
    mockJsonResponse(team);

    const result = await api().create(payload as never);

    expect(result.data).toEqual(team);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should GET /teams/check-username with username param for checkUsername()', async () => {
    mockJsonResponse({ value: 'acme-corp', available: true });

    const result = await api().checkUsername('acme-corp');

    expect(result.data).toEqual({ value: 'acme-corp', available: true });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/teams/check-username');
    expect(url).toContain('username=acme-corp');
  });

  it('should surface taken reason when checkUsername finds an existing username', async () => {
    mockJsonResponse({ value: 'acme-corp', available: false, reason: 'taken' });

    const result = await api().checkUsername('Acme-Corp');

    expect(result.data).toEqual({ value: 'acme-corp', available: false, reason: 'taken' });
  });

  it('should surface reserved reason when checkUsername hits a reserved username', async () => {
    mockJsonResponse({ value: 'admin', available: false, reason: 'reserved' });

    const result = await api().checkUsername('admin');

    expect(result.data).toEqual({ value: 'admin', available: false, reason: 'reserved' });
  });

  it('should POST role for updateMemberRole()', async () => {
    const member = { user_id: 'user-2', role: 'admin' };
    mockJsonResponse(member);

    await api().updateMemberRole('team-1', 'user-2', 'admin');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1/members/user-2/role');
    expect(JSON.parse(init.body as string)).toEqual({ role: 'admin' });
  });

  it('should DELETE /teams/{id}/members/{userId} for removeMember()', async () => {
    mockJsonResponse(null);

    await api().removeMember('team-1', 'user-3');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1/members/user-3');
    expect(init.method).toBe('DELETE');
  });

  it('should POST /teams/{id}/invites for createInvite()', async () => {
    const payload = { email: 'dev@example.com', role: 'member' };
    const invite = { id: 'inv-1', ...payload };
    mockJsonResponse(invite);

    const result = await api().createInvite('team-1', payload as never);

    expect(result.data).toEqual(invite);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1/invites');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should GET /teams/{id} for get()', async () => {
    const team = { id: 'team-1', name: 'Acme' };
    mockJsonResponse(team);

    const result = await api().get('team-1');

    expect(result.data).toEqual(team);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /teams/{id} for update()', async () => {
    const team = { id: 'team-1', name: 'Acme Updated' };
    mockJsonResponse(team);

    const result = await api().update('team-1', { name: 'Acme Updated' } as never);

    expect(result.data).toEqual(team);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Acme Updated' });
  });

  it('should DELETE /teams/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('team-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1');
    expect(init.method).toBe('DELETE');
  });

  it('should GET /teams/{id}/members for getMembers()', async () => {
    const members = [{ user_id: 'user-1', role: 'owner' }];
    mockJsonResponse(members);

    const result = await api().getMembers('team-1');

    expect(result.data).toEqual(members);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1/members');
    expect(init.method).toBe('GET');
  });

  it('should deserialize assignable_roles and removable on getMembers()', async () => {
    const members = [
      {
        id: 'tm-1',
        user_id: 'user-1',
        team_id: 'team-1',
        role: 'admin',
        assignable_roles: ['admin', 'member'],
        removable: true,
      },
      {
        id: 'tm-2',
        user_id: 'user-owner',
        team_id: 'team-1',
        role: 'owner',
      },
    ];
    mockJsonResponse(members);

    const result = await api().getMembers('team-1');

    expect(result.data).toEqual(members);
    expect(result.data[0].assignable_roles).toEqual(['admin', 'member']);
    expect(result.data[0].removable).toBe(true);
    expect(result.data[1].assignable_roles).toBeUndefined();
    expect(result.data[1].removable).toBeUndefined();
  });

  it('should POST /teams/{id}/members for addMember()', async () => {
    const payload = { user_id: 'user-4', role: 'member' };
    const member = { ...payload };
    mockJsonResponse(member);

    const result = await api().addMember('team-1', payload as never);

    expect(result.data).toEqual(member);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1/members');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should GET /teams/{id}/invites for listInvites()', async () => {
    const invites = [{ id: 'inv-1', email: 'dev@example.com' }];
    mockJsonResponse(invites);

    const result = await api().listInvites('team-1');

    expect(result.data).toEqual(invites);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1/invites');
    expect(init.method).toBe('GET');
  });

  it('should DELETE /teams/{id}/invites/{inviteId} for revokeInvite()', async () => {
    mockJsonResponse(null);

    await api().revokeInvite('team-1', 'inv-9');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1/invites/inv-9');
    expect(init.method).toBe('DELETE');
  });
});
