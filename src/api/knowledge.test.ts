import { HttpClient } from '../http/client';
import { KnowledgeAPI, SkillsAPI } from './knowledge';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('KnowledgeAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new KnowledgeAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /knowledge/list for list()', async () => {
    const page = { items: [{ id: 'know-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list();

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/knowledge/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /knowledge/{namespace}/{name} for getByName()', async () => {
    const entry = { id: 'know-1', namespace: 'acme', name: 'docs' };
    mockJsonResponse(entry);

    const result = await api().getByName('acme', 'docs');

    expect(result).toEqual(entry);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/knowledge/acme/docs');
    expect(init.method).toBe('GET');
  });

  it('should POST /knowledge for create()', async () => {
    const payload = { namespace: 'acme', name: 'docs', content: 'hello' };
    const entry = { id: 'know-new', ...payload };
    mockJsonResponse(entry);

    const result = await api().create(payload as never);

    expect(result).toEqual(entry);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/knowledge');
    expect(init.method).toBe('POST');
  });

  it('should POST team_id for transferOwnership()', async () => {
    const entry = { id: 'know-1' };
    mockJsonResponse(entry);

    await api().transferOwnership('know-1', 'team-5');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/knowledge/know-1/transfer');
    expect(JSON.parse(init.body as string)).toEqual({ team_id: 'team-5' });
  });

  it('should GET /knowledge/{id} for get()', async () => {
    const entry = { id: 'know-1', name: 'docs' };
    mockJsonResponse(entry);

    const result = await api().get('know-1');

    expect(result).toEqual(entry);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/knowledge/know-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /knowledge/{id} for update()', async () => {
    const entry = { id: 'know-1', name: 'updated' };
    mockJsonResponse(entry);

    const result = await api().update('know-1', { name: 'updated' } as never);

    expect(result).toEqual(entry);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: 'updated' });
  });

  it('should DELETE /knowledge/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('know-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/knowledge/know-1');
    expect(init.method).toBe('DELETE');
  });

  it('should POST /knowledge/{id}/versions/list for listVersions()', async () => {
    const page = { items: [{ id: 'ver-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().listVersions('know-1', { limit: 10 });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/knowledge/know-1/versions/list');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 10 });
  });

  it('should GET /knowledge/{id}/versions/{versionId} for getVersion()', async () => {
    const version = { id: 'ver-1', knowledge_id: 'know-1' };
    mockJsonResponse(version);

    const result = await api().getVersion('know-1', 'ver-1');

    expect(result).toEqual(version);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/knowledge/know-1/versions/ver-1');
    expect(init.method).toBe('GET');
  });

  it('should POST visibility for updateVisibility()', async () => {
    const entry = { id: 'know-1', visibility: 'team' };
    mockJsonResponse(entry);

    await api().updateVisibility('know-1', 'team');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ visibility: 'team' });
  });
});

describe('SkillsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new SkillsAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should GET /skills/resolve with ref param for resolve()', async () => {
    const resolved = { ref: 'acme/skill@v1', content: '{}' };
    mockJsonResponse(resolved);

    const result = await api().resolve('acme/skill@v1', 'main');

    expect(result).toEqual(resolved);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/skills/resolve');
    expect(url).toContain('ref=acme');
    expect(url).toContain('skill=main');
  });

  it('should GET /skills/{namespace}/{name} for getByName()', async () => {
    const skill = { id: 'skill-1', namespace: 'acme', name: 'research' };
    mockJsonResponse(skill);

    const result = await api().getByName('acme', 'research');

    expect(result).toEqual(skill);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/skills/acme/research');
    expect(init.method).toBe('GET');
  });

  it('should GET /skills/{namespace}/{name}/download for download()', async () => {
    mockJsonResponse({ url: 'https://cdn.example.com/skill.zip' });

    await api().download('acme', 'research');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/skills/acme/research/download');
    expect(init.method).toBe('GET');
  });

  it('should POST /store/skills/list for listStore()', async () => {
    const page = { items: [{ namespace: 'public', name: 'starter' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().listStore();

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/store/skills/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /skills/resolve with ref only when skill is omitted', async () => {
    mockJsonResponse({ ref: 'acme/skill@v1' });

    await api().resolve('acme/skill@v1');

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/skills/resolve');
    expect(url).toContain('ref=acme');
    expect(url).not.toContain('skill=');
  });

  it('should GET /skills/{namespace}/{name}/content for getContent()', async () => {
    mockJsonResponse({ body: '# Skill instructions' });

    const result = await api().getContent('acme', 'research');

    expect(result).toEqual({ body: '# Skill instructions' });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/skills/acme/research/content');
    expect(init.method).toBe('GET');
  });

  it('should POST team_id for transferOwnership()', async () => {
    const skill = { id: 'skill-1' };
    mockJsonResponse(skill);

    await api().transferOwnership('skill-1', 'team-8');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/skills/skill-1/transfer');
    expect(JSON.parse(init.body as string)).toEqual({ team_id: 'team-8' });
  });

  it('should POST /skills/list for list()', async () => {
    const page = { items: [{ id: 'skill-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list({ limit: 10 });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/skills/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /skills/{id} for get()', async () => {
    const skill = { id: 'skill-1', name: 'research' };
    mockJsonResponse(skill);

    const result = await api().get('skill-1');

    expect(result).toEqual(skill);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/skills/skill-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /skills for create()', async () => {
    const payload = { namespace: 'acme', name: 'research' };
    const skill = { id: 'skill-new', ...payload };
    mockJsonResponse(skill);

    const result = await api().create(payload);

    expect(result).toEqual(skill);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/skills');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should POST /skills/{id} for update()', async () => {
    const skill = { id: 'skill-1', name: 'updated' };
    mockJsonResponse(skill);

    const result = await api().update('skill-1', { name: 'updated' });

    expect(result).toEqual(skill);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: 'updated' });
  });

  it('should DELETE /skills/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('skill-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/skills/skill-1');
    expect(init.method).toBe('DELETE');
  });

  it('should POST /skills/{id}/versions/list for listVersions()', async () => {
    const page = { items: [{ id: 'ver-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().listVersions('skill-1', { limit: 5 });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/skills/skill-1/versions/list');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 5 });
  });

  it('should GET /skills/{id}/versions/{versionId} for getVersion()', async () => {
    const version = { id: 'ver-1', skill_id: 'skill-1' };
    mockJsonResponse(version);

    const result = await api().getVersion('skill-1', 'ver-1');

    expect(result).toEqual(version);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/skills/skill-1/versions/ver-1');
    expect(init.method).toBe('GET');
  });

  it('should POST visibility for updateVisibility()', async () => {
    const skill = { id: 'skill-1', visibility: 'team' };
    mockJsonResponse(skill);

    await api().updateVisibility('skill-1', 'team');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ visibility: 'team' });
  });
});
