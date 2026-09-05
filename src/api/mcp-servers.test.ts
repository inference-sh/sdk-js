import { HttpClient } from '../http/client';
import {
  MCPServerAuthOAuth,
  ResultTypeComplete,
  ResultTypeInputRequired,
  RoleUser,
  TeamTypeTeam,
  ToolCallResponse,
  ToolContentTypeText,
  VisibilityPrivate,
} from '../types';
import type { MCPServerDTO } from '../types';
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

/** v0.8.6 MCPServerDTO with flat ownership fields (replaces nested PermissionModelDTO). */
function v086OwnedServer(overrides: Partial<MCPServerDTO> = {}): MCPServerDTO {
  return {
    id: 'mcp-1',
    user_id: 'user-1',
    user: {
      id: 'user-1',
      created_at: '2026-07-25T00:00:00Z',
      updated_at: '2026-07-25T00:00:00Z',
      role: RoleUser,
      avatar_url: 'https://example.com/avatar.png',
    },
    team_id: 'team-1',
    team: {
      id: 'team-1',
      created_at: '2026-07-25T00:00:00Z',
      updated_at: '2026-07-25T00:00:00Z',
      type: TeamTypeTeam,
      username: 'acme',
      avatar_url: 'https://example.com/team.png',
      setup_completed: true,
    },
    visibility: VisibilityPrivate,
    slug: 'my-mcp',
    name: 'My MCP',
    description: 'Custom MCP server',
    icon_url: 'https://example.com/icon.png',
    server_url: 'https://mcp.example.com/my-mcp',
    auth_type: MCPServerAuthOAuth,
    default_scopes: ['read'],
    documentation_url: 'https://docs.example.com/mcp',
    ...overrides,
  };
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

  it('should deserialize v0.8.6 flat ownership from create()', async () => {
    const server = v086OwnedServer();
    mockJsonResponse(server);

    const result = await api().create({ name: server.name, slug: server.slug });

    expect(result.data?.user_id).toBe('user-1');
    expect(result.data?.team.username).toBe('acme');
    expect(result.data?.visibility).toBe('private');
    expect(result.data?.auth_type).toBe('oauth');
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

  it('should POST /mcp-servers/list for listOwned()', async () => {
    const page = { items: [{ id: 'mcp-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().listOwned({ limit: 5 });

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcp-servers/list');
    expect(init.method).toBe('POST');
  });

  it('should deserialize v0.8.6 flat ownership from listOwned()', async () => {
    const server = v086OwnedServer({ id: 'mcp-2', slug: 'deploy-mcp', name: 'Deploy MCP' });
    const page = { items: [server], next_cursor: 'cursor-2' };
    mockJsonResponse(page);

    const result = await api().listOwned({ limit: 10 });

    expect(result.data?.items).toHaveLength(1);
    expect(result.data?.items[0].user_id).toBe('user-1');
    expect(result.data?.items[0].team_id).toBe('team-1');
    expect(result.data?.items[0].visibility).toBe('private');
    expect(result.data?.next_cursor).toBe('cursor-2');
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

  it('should deserialize v0.8.6 flat ownership from getOwned()', async () => {
    const server = v086OwnedServer({ connection_status: 'connected' });
    mockJsonResponse(server);

    const result = await api().getOwned('mcp-1');

    expect(result.data).toEqual(server);
    expect(result.data?.user.id).toBe('user-1');
    expect(result.data?.team.username).toBe('acme');
    expect(result.data?.connection_status).toBe('connected');
  });

  it('should DELETE /mcp-servers/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('mcp-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/mcp-servers/mcp-1');
    expect(init.method).toBe('DELETE');
  });
});
