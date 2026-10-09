import { HttpClient } from '../http/client';
import { ChatsAPI } from './chats';
import { FlowsAPI } from './flows';
import { TeamsAPI } from './teams';
import type {
  AgentUpdateBody,
  ChatUpdateBody,
  FlowPatchBody,
  KnowledgeUpdateBody,
  MCPServerUpdateBody,
  TeamUpdateBody,
} from './write-bodies';

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
