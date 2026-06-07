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
});
