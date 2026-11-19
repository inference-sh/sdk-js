import { HttpClient } from '../http/client.js';
import { AgentsAPI } from './agents.js';
import { ChatsAPI } from './chats.js';
import { FilesAPI } from './files.js';
import { MCPServersAPI } from './mcp-servers.js';
import { ProjectsAPI } from './projects.js';
import { FlowsAPI } from './flows.js';
import { TeamsAPI } from './teams.js';
import type {
  AgentUpdateBody,
  ChatUpdateBody,
  FlowPatchBody,
  KnowledgeUpdateBody,
  MCPServerCreateBody,
  MCPServerUpdateBody,
  ProjectUpdateBody,
  PublicationCreateBody,
  PublicationUpdateBody,
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
    // @ts-expect-error visibility has POST /agents/{id}/visibility
    const agentVisibility: AgentUpdateBody = { visibility: 'public' };
    // @ts-expect-error a project's visibility is set on create only
    const project: ProjectUpdateBody = { visibility: 'public' };
    // @ts-expect-error the owner comes from the caller
    const mcpCreate: MCPServerCreateBody = { team_id: 'other' };
    // @ts-expect-error server fields (id, namespace) come from the resource on create
    const publicationCreate: PublicationCreateBody = {
      resource_type: 'agent',
      resource_id: 'agent-1',
      id: 'pub-1',
    };
    // @ts-expect-error visibility has its own route on publications
    const publicationUpdate: PublicationUpdateBody = { visibility: 'public' };
    expect([
      chat,
      agent,
      team,
      flow,
      knowledge,
      mcp,
      agentVisibility,
      project,
      mcpCreate,
      publicationCreate,
      publicationUpdate,
    ]).toHaveLength(11);
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

// The API refuses a write body's unknown keys, relations and changed
// read-only fields (enforce mode), so each method sends only what it is given.
describe('write methods send only the fields given', () => {
  beforeEach(() => jest.clearAllMocks());

  const sent = () => {
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    return { url, method: init.method, body: JSON.parse(init.body as string) };
  };

  it('TeamsAPI.update PATCHes the changed profile field', async () => {
    mockJsonResponse({ id: 'team-1' });
    await new TeamsAPI(http()).update('team-1', { name: 'Acme Inc' });
    expect(sent()).toEqual({ url: expect.stringContaining('/teams/team-1'), method: 'PATCH', body: { name: 'Acme Inc' } });
  });

  it('AgentsAPI.update POSTs images and version, visibility through updateVisibility', async () => {
    const h = http();
    const agents = new AgentsAPI(h, new FilesAPI(h));
    mockJsonResponse({ id: 'agent-1' });
    await agents.update('agent-1', { images: { card: 'c', thumbnail: '', banner: '' } });
    expect(sent()).toEqual({
      url: expect.stringContaining('/agents/agent-1'),
      method: 'POST',
      body: { images: { card: 'c', thumbnail: '', banner: '' } },
    });

    jest.clearAllMocks();
    mockJsonResponse({ id: 'agent-1' });
    await agents.updateVisibility('agent-1', 'public');
    expect(sent()).toEqual({
      url: expect.stringContaining('/agents/agent-1/visibility'),
      method: 'POST',
      body: { visibility: 'public' },
    });
  });

  it('ProjectsAPI.update PATCHes without visibility', async () => {
    mockJsonResponse({ id: 'proj-1' });
    await new ProjectsAPI(http()).update('proj-1', { name: 'Renamed', color: '#fff' });
    expect(sent()).toEqual({
      url: expect.stringContaining('/projects/proj-1'),
      method: 'PATCH',
      body: { name: 'Renamed', color: '#fff' },
    });
  });

  it('ProjectsAPI.create takes visibility', async () => {
    mockJsonResponse({ id: 'proj-1' });
    await new ProjectsAPI(http()).create({ name: 'New', type: 'agent', visibility: 'team' });
    expect(sent()).toEqual({
      url: expect.stringMatching(/\/projects$/),
      method: 'POST',
      body: { name: 'New', type: 'agent', visibility: 'team' },
    });
  });

  it('MCPServersAPI.create POSTs the create fields only', async () => {
    mockJsonResponse({ id: 'mcp-1' });
    const body: MCPServerCreateBody = {
      name: 'gh',
      server_url: 'https://mcp.example/sse',
      auth_type: 'oauth',
      visibility: 'private',
    };
    await new MCPServersAPI(http()).create(body);
    expect(sent()).toEqual({ url: expect.stringMatching(/\/mcp-servers$/), method: 'POST', body });
  });
});
