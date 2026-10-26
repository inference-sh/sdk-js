import { readFileSync } from 'fs';
import { join } from 'path';
import { HttpClient } from '../http/client.js';
import { FilesAPI } from '../api/files.js';
import type { AgentClient, AgentInfo } from './types.js';
import { fetchAgentInfo } from './api.js';
import { chatReducer, initialState } from './reducer.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function makeClient(): AgentClient {
  const http = new HttpClient({ apiKey: 'test-key' });
  const files = new FilesAPI(http);
  return { http, files };
}

/**
 * 0783553: AgentInfo carries agent_id and version_id so clients can compare
 * the chat's pinned agent version with the agent's current version and call
 * switchAgent when they differ.
 */
describe('AgentInfo agent_id and version_id (0783553)', () => {
  it('types optional agent_id and version_id on AgentInfo', () => {
    const info: AgentInfo = {
      description: 'Editor',
      agent_id: 'agent-abc',
      version_id: 'ver-current',
    };
    expect(info.agent_id).toBe('agent-abc');
    expect(info.version_id).toBe('ver-current');
  });

  it('documents version pinning vs switchAgent in AgentInfo', () => {
    const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
    expect(typesSource).toMatch(/agent_id\?: string;/);
    expect(typesSource).toMatch(/version_id\?: string;/);
    expect(typesSource).toMatch(/switchAgent/);
    expect(typesSource).toMatch(
      /A chat stays on the version it started/,
    );
  });

  it('fetchAgentInfo maps agent id and current version_id from GET /agents', () => {
    const apiSource = readFileSync(join(__dirname, 'api.ts'), 'utf8');
    expect(apiSource).toMatch(/agent_id: resp\.data\?\.id/);
    expect(apiSource).toMatch(
      /version_id: resp\.data\?\.version_id \|\| version\?\.id/,
    );
  });
});

describe('fetchAgentInfo agent version fields (0783553)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should map agent id and version_id from the agent DTO', async () => {
    mockJsonResponse({
      id: 'agent-42',
      version_id: 'ver-published',
      version: {
        id: 'ver-published',
        description: 'Latest editor',
        example_prompts: ['Refactor this file'],
      },
    });

    const result = await fetchAgentInfo(makeClient(), 'okaris/editor');

    expect(result).toEqual({
      description: 'Latest editor',
      example_prompts: ['Refactor this file'],
      model_capabilities: undefined,
      agent_id: 'agent-42',
      version_id: 'ver-published',
    });
  });

  it('should fall back to version.id when top-level version_id is absent', async () => {
    mockJsonResponse({
      id: 'agent-99',
      version: {
        id: 'ver-from-nested',
        description: 'Nested version only',
      },
    });

    const result = await fetchAgentInfo(makeClient(), 'team/agent');

    expect(result?.agent_id).toBe('agent-99');
    expect(result?.version_id).toBe('ver-from-nested');
  });

  it('should prefer top-level version_id over version.id when both differ', async () => {
    mockJsonResponse({
      id: 'agent-1',
      version_id: 'ver-pointer',
      version: { id: 'ver-embedded', description: 'Dual ids' },
    });

    const result = await fetchAgentInfo(makeClient(), 'dual/agent');

    expect(result?.version_id).toBe('ver-pointer');
  });
});

describe('chat reducer AgentInfo version fields (0783553)', () => {
  it('SET_AGENT_INFO stores agent_id and version_id for UI comparison', () => {
    const payload: AgentInfo = {
      agent_id: 'agent-ui',
      version_id: 'ver-ui',
      description: 'UI agent',
    };

    const next = chatReducer(initialState, { type: 'SET_AGENT_INFO', payload });

    expect(next.agentInfo).toEqual(payload);
  });

  it('RESET preserves agent_id and version_id on agentInfo', () => {
    const agentInfo: AgentInfo = {
      agent_id: 'agent-persist',
      version_id: 'ver-persist',
      example_prompts: ['Hi'],
    };
    const state = chatReducer(initialState, { type: 'SET_AGENT_INFO', payload: agentInfo });

    const next = chatReducer(state, { type: 'RESET' });

    expect(next.agentInfo?.agent_id).toBe('agent-persist');
    expect(next.agentInfo?.version_id).toBe('ver-persist');
  });
});
