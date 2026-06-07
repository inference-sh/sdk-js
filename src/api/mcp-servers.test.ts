import { HttpClient } from '../http/client';
import { MCPServersAPI } from './mcp-servers';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('MCPServersAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new MCPServersAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /mcps/list for list()', async () => {
    const page = { items: [{ slug: 'filesystem' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list();

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcps/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /mcps/{slug}/tools for listTools()', async () => {
    const tools = [{ name: 'read_file' }];
    mockJsonResponse(tools);

    const result = await api().listTools('filesystem');

    expect(result).toEqual(tools);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcps/filesystem/tools');
    expect(init.method).toBe('GET');
  });

  it('should POST /mcps/{slug}/tools/{tool} for callTool()', async () => {
    const input = { path: '/tmp/test.txt' };
    const output = { content: 'hello' };
    mockJsonResponse(output);

    const result = await api().callTool('filesystem', 'read_file', input);

    expect(result).toEqual(output);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcps/filesystem/tools/read_file');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it('should POST /mcp-servers for create()', async () => {
    const payload = { name: 'My MCP', slug: 'my-mcp' };
    const server = { id: 'mcp-1', ...payload };
    mockJsonResponse(server);

    const result = await api().create(payload);

    expect(result).toEqual(server);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcp-servers');
    expect(init.method).toBe('POST');
  });

  it('should PUT /mcp-servers/{id} for update()', async () => {
    const server = { id: 'mcp-1', name: 'Updated MCP' };
    mockJsonResponse(server);

    await api().update('mcp-1', { name: 'Updated MCP' });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcp-servers/mcp-1');
    expect(init.method).toBe('PUT');
  });
});
