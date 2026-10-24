import { readFileSync } from 'fs';
import { join } from 'path';
import { chatReducer, initialState } from './reducer.js';
import type { AgentInfo } from './types.js';

/**
 * AgentInfo.model_capabilities (2fece6e): attachment hints from the agent core
 * app version metadata for template chat UIs.
 */
describe('AgentInfo.model_capabilities (2fece6e)', () => {
  it('SET_AGENT_INFO stores model_capabilities on chat state', () => {
    const agentInfo: AgentInfo = {
      description: 'Multimodal helper',
      example_prompts: ['Upload a PDF'],
      model_capabilities: ['file', 'image'],
    };

    const next = chatReducer(initialState, { type: 'SET_AGENT_INFO', payload: agentInfo });

    expect(next.agentInfo).toEqual(agentInfo);
    expect(next.agentInfo?.model_capabilities).toEqual(['file', 'image']);
  });

  it('RESET preserves model_capabilities in agentInfo', () => {
    const agentInfo: AgentInfo = {
      model_capabilities: ['image'],
    };
    const chat = { id: 'chat-1', status: 'idle' };
    const state = chatReducer(
      chatReducer(initialState, { type: 'SET_CHAT', payload: chat as never }),
      { type: 'SET_AGENT_INFO', payload: agentInfo },
    );

    const next = chatReducer(state, { type: 'RESET' });

    expect(next.chat).toBeNull();
    expect(next.agentInfo?.model_capabilities).toEqual(['image']);
  });
});

describe('agent types/api regen guards (2fece6e)', () => {
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const apiSource = readFileSync(join(__dirname, 'api.ts'), 'utf8');

  it('documents model_capabilities on AgentInfo for chat attachment gating', () => {
    expect(typesSource).toMatch(/model_capabilities\?: string\[\]/);
    expect(typesSource).toMatch(
      /What the agent's model takes besides text \("image", "file", \.\.\.\)/,
    );
  });

  it('fetchAgentInfo reads capabilities from core_app app version metadata', () => {
    expect(apiSource).toMatch(
      /const capabilities = version\?\.core_app\?\.app\?\.version\?\.metadata\?\.capabilities;/,
    );
    expect(apiSource).toMatch(
      /model_capabilities: Array\.isArray\(capabilities\) \? capabilities : undefined/,
    );
  });
});
