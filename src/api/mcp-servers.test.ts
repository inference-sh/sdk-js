import { HttpClient } from '../http/client.js';
import {
  CredentialScopeTeam,
  ResultTypeComplete,
  ResultTypeInputRequired,
  ToolCallResponse,
  ToolContentTypeText,
  type MCPServerDTO,
} from '../types.js';
import { MCPServersAPI } from './mcp-servers.js';

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

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcps/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /mcps/{slug}/tools for listTools()', async () => {
    const tools = [{ name: 'read_file' }];
    mockJsonResponse(tools);

    const result = await api().listTools('filesystem');

    expect(result.data).toEqual(tools);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcps/filesystem/tools');
    expect(init.method).toBe('GET');
  });

  it('should POST /mcps/{slug}/tools/{tool} for callTool()', async () => {
    const input = { path: '/tmp/test.txt' };
    const output = { content: 'hello' };
    mockJsonResponse(output);

    const result = await api().callTool('filesystem', 'read_file', input);

    expect(result.data).toEqual(output);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcps/filesystem/tools/read_file');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it('should deserialize complete ToolCallResponse from callTool()', async () => {
    const response: ToolCallResponse = {
      resultType: ResultTypeComplete,
      content: [{ type: ToolContentTypeText, text: 'file contents' }],
      structuredContent: { path: '/tmp/test.txt' },
      isError: false,
      _meta: {
        'io.modelcontextprotocol/serverInfo': {
          name: 'filesystem',
          title: 'Filesystem MCP',
          version: '1.0.0',
        },
      },
    };
    mockJsonResponse(response);

    const resp = await api().callTool('filesystem', 'read_file', {
      path: '/tmp/test.txt',
    });
    const result = resp.data as ToolCallResponse;

    expect(result.resultType).toBe('complete');
    expect(result.content[0].text).toBe('file contents');
    expect(result.structuredContent).toEqual({ path: '/tmp/test.txt' });
    expect(result._meta?.['io.modelcontextprotocol/serverInfo']?.name).toBe('filesystem');
  });

  it('should deserialize input_required MRTR ToolCallResponse from callTool()', async () => {
    const response: ToolCallResponse = {
      resultType: ResultTypeInputRequired,
      content: [],
      isError: false,
      inputRequests: {
        approval: {
          method: 'elicitation/create',
          params: { message: 'Approve file write?' },
        },
      },
      requestState: 'mrtr-1',
    };
    mockJsonResponse(response);

    const resp = await api().callTool('filesystem', 'write_file', {
      path: '/tmp/out.txt',
      content: 'hello',
    });
    const result = resp.data as ToolCallResponse;

    expect(result.resultType).toBe('input_required');
    expect(result.inputRequests?.approval.method).toBe('elicitation/create');
    expect(result.requestState).toBe('mrtr-1');
  });

  it('should POST /mcp-servers for create()', async () => {
    const payload = { name: 'My MCP', slug: 'my-mcp' };
    const server = { id: 'mcp-1', ...payload };
    mockJsonResponse(server);

    const result = await api().create(payload);

    expect(result.data).toEqual(server);
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

  it('should GET /mcps/{slug} for get()', async () => {
    const server = { slug: 'filesystem', name: 'Filesystem MCP' };
    mockJsonResponse(server);

    const result = await api().get('filesystem');

    expect(result.data).toEqual(server);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcps/filesystem');
    expect(init.method).toBe('GET');
  });

  it('should deserialize nested connection facts on get() (d28ee34)', async () => {
    const server: MCPServerDTO = {
      id: 'srv-1',
      user_id: 'u-1',
      team_id: 't-1',
      visibility: 'team',
      slug: 'notion',
      name: 'Notion',
      title: 'Notion',
      description: '',
      icon_url: '',
      server_url: 'https://mcp.example/notion',
      auth_type: 'oauth',
      default_scopes: [],
      documentation_url: '',
      connection_scope: CredentialScopeTeam,
      connection: {
        connection_id: 'conn-1',
        status: 'connected',
        scope: CredentialScopeTeam,
        tool_count: 3,
        tools_listed_at: '2026-10-13T08:00:00Z',
        last_called_at: '2026-10-13T08:01:00Z',
      },
    };
    mockJsonResponse(server);

    const result = await api().get('notion');
    const data = result.data as MCPServerDTO;

    expect(data.connection?.connection_id).toBe('conn-1');
    expect(data.connection?.tool_count).toBe(3);
    expect(data.connection?.scope).toBe(CredentialScopeTeam);
    expect(data.connection_status).toBeUndefined();
  });

  it('should deserialize nested connection on getOwned() (648d3ff)', async () => {
    const server: MCPServerDTO = {
      id: 'mcp-owned-1',
      user_id: 'u-1',
      team_id: 't-1',
      visibility: 'private',
      slug: 'internal-tools',
      name: 'Internal',
      title: 'Internal',
      description: '',
      icon_url: '',
      server_url: 'https://mcp.example/internal',
      auth_type: 'api_key',
      default_scopes: [],
      documentation_url: '',
      connection_status: 'connected',
      connection: {
        connection_id: 'conn-owned',
        status: 'connected',
        scope: CredentialScopeTeam,
        last_error: '',
      },
    };
    mockJsonResponse(server);

    const result = await api().getOwned('mcp-owned-1');
    const data = result.data as MCPServerDTO;

    expect(data.connection?.connection_id).toBe('conn-owned');
    expect(data.connection_status).toBe('connected');
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcp-servers/mcp-owned-1');
  });

  it('should POST /mcp-servers/list for listOwned()', async () => {
    const page = { items: [{ id: 'mcp-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().listOwned({ limit: 5 });

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcp-servers/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /mcp-servers/{id} for getOwned()', async () => {
    const server = { id: 'mcp-1', name: 'My MCP' };
    mockJsonResponse(server);

    const result = await api().getOwned('mcp-1');

    expect(result.data).toEqual(server);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcp-servers/mcp-1');
    expect(init.method).toBe('GET');
  });

  it('should DELETE /mcp-servers/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('mcp-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcp-servers/mcp-1');
    expect(init.method).toBe('DELETE');
  });
});
