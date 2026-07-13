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

    expect(result).toEqual(me);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/me');
    expect(init.method).toBe('GET');
  });

  it('should GET /teams for list()', async () => {
    const teams = [{ id: 'team-1', name: 'Acme' }];
    mockJsonResponse(teams);

    const result = await api().list();

    expect(result).toEqual(teams);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams');
    expect(init.method).toBe('GET');
  });

  it('should POST /teams for create()', async () => {
    const payload = { name: 'New Team', username: 'new-team' };
    const team = { id: 'team-new', ...payload };
    mockJsonResponse(team);

    const result = await api().create(payload as never);

    expect(result).toEqual(team);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should GET /teams/check-username with username param for checkUsername()', async () => {
    mockJsonResponse({ available: true });

    const result = await api().checkUsername('acme-corp');

    expect(result).toEqual({ available: true });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/teams/check-username');
    expect(url).toContain('username=acme-corp');
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

    expect(result).toEqual(invite);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1/invites');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should GET /teams/{id} for get()', async () => {
    const team = { id: 'team-1', name: 'Acme' };
    mockJsonResponse(team);

    const result = await api().get('team-1');

    expect(result).toEqual(team);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /teams/{id} for update()', async () => {
    const team = { id: 'team-1', name: 'Acme Updated' };
    mockJsonResponse(team);

    const result = await api().update('team-1', { name: 'Acme Updated' } as never);

    expect(result).toEqual(team);
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

    expect(result).toEqual(members);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1/members');
    expect(init.method).toBe('GET');
  });

  it('should POST /teams/{id}/members for addMember()', async () => {
    const payload = { user_id: 'user-4', role: 'member' };
    const member = { ...payload };
    mockJsonResponse(member);

    const result = await api().addMember('team-1', payload as never);

    expect(result).toEqual(member);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1/members');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should GET /teams/{id}/invites for listInvites()', async () => {
    const invites = [{ id: 'inv-1', email: 'dev@example.com' }];
    mockJsonResponse(invites);

    const result = await api().listInvites('team-1');

    expect(result).toEqual(invites);
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
