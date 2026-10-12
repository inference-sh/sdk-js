import { HttpClient } from '../http/client.js';
import { ChatsAPI } from './chats.js';
import { FlowsAPI } from './flows.js';
import { TeamsAPI } from './teams.js';
import type {
  AgentUpdateBody,
  ChatUpdateBody,
  FlowPatchBody,
  KnowledgeUpdateBody,
  MCPServerUpdateBody,
  TeamUpdateBody,
} from './write-bodies.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

const http = () => new HttpClient({ apiKey: 'test-key' });

// The update bodies name only what each route writes, so a field the API
// would drop does not type-check (checked by tsc, which covers tests).
describe('write bodies', () => {
  it('reject the fields their route drops', () => {
    // @ts-expect-error visibility has POST /chats/{id}/settings
    const chat: ChatUpdateBody = { visibility: 'public' };
    // @ts-expect-error an agent's name is fixed at creation
    const agent: AgentUpdateBody = { name: 'renamed' };
    // @ts-expect-error a team's username is its namespace
    const team: TeamUpdateBody = { username: 'other' };
    // @ts-expect-error visibility has POST /flows/{id}/visibility
    const flow: FlowPatchBody = { visibility: 'public' };
    // @ts-expect-error a knowledge entry's name is fixed at creation
    const knowledge: KnowledgeUpdateBody = { name: 'renamed' };
    // @ts-expect-error visibility has POST /mcp-servers/{id}/visibility
    const mcp: MCPServerUpdateBody = { visibility: 'public' };
    expect([chat, agent, team, flow, knowledge, mcp]).toHaveLength(6);
  });

  it('reject MCP server OAuth fields that moved to PUT /credentials/{slug}/app (INF-1063)', () => {
    // @ts-expect-error auth_type is the server's own report, not writable here
    const authType: MCPServerUpdateBody = { auth_type: 'oauth' };
    // @ts-expect-error provider OAuth app is configured on the credential provider
    const oauthClient: MCPServerUpdateBody = { oauth_client_id: 'client' };
    // @ts-expect-error provider OAuth secret is configured on the credential provider
    const oauthSecret: MCPServerUpdateBody = { oauth_secret_key: 'secret' };
    expect([authType, oauthClient, oauthSecret]).toHaveLength(3);
  });

  it('accepts credentials on MCPServerUpdateBody', () => {
    const body: MCPServerUpdateBody = {
      credentials: [{ slug: 'notion', optional: false }],
    };
    expect(body.credentials?.[0]?.slug).toBe('notion');
  });
});

describe('ChatsAPI.updateSettings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POSTs the settings to /chats/{id}/settings', async () => {
    const settings = { chat_id: 'chat-1', name: 'n', visibility: 'public' };
    mockJsonResponse(settings);

    const result = await new ChatsAPI(http()).updateSettings('chat-1', { visibility: 'public' });

    expect(result.data).toEqual(settings);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-1/settings');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ visibility: 'public' });
  });
});

describe('FlowsAPI.patch and saveViewport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('PATCHes only the fields sent', async () => {
    mockJsonResponse({ id: 'flow-1' });

    await new FlowsAPI(http()).patch('flow-1', { name: 'renamed', card_image: '' });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/flows/flow-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'renamed', card_image: '' });
  });

  it('POSTs the viewport to /flows/{id}/viewport', async () => {
    mockJsonResponse(null);

    await new FlowsAPI(http()).saveViewport('flow-1', { x: 1, y: 2, zoom: 0.5 });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/flows/flow-1/viewport');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ x: 1, y: 2, zoom: 0.5 });
  });
});

describe('update methods still take a loaded object sent back', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts a DTO spread with the change on top', async () => {
    mockJsonResponse({ id: 'team-1' });
    const loaded = { id: 'team-1', username: 'acme', name: 'Acme' };

    await new TeamsAPI(http()).update('team-1', { ...loaded, name: 'Acme Inc' });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/teams/team-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({
      id: 'team-1',
      username: 'acme',
      name: 'Acme Inc',
    });
  });
});
