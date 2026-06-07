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
});
