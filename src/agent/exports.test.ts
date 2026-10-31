// jest only transforms .ts here, so stub the React provider (provider.tsx) to load the barrel.
jest.mock('./provider', () => ({ AgentChatProvider: () => null }), { virtual: true });

import * as agentBarrel from './index.js';
import type { ElicitChoice } from './index.js';
import {
  MCPMethodElicitationCreate,
  buildMCPInputResult,
  elicitParams,
  isURLElicitation,
  parseMCPInputState,
} from './mcp-input.js';

describe('agent MCP input public surface', () => {
  it('re-exports MCP helpers from agent/index.ts for @inferencesh/sdk/agent consumers', () => {
    expect(agentBarrel.MCPMethodElicitationCreate).toBe(MCPMethodElicitationCreate);
    expect(agentBarrel.parseMCPInputState).toBe(parseMCPInputState);
    expect(agentBarrel.elicitParams).toBe(elicitParams);
    expect(agentBarrel.isURLElicitation).toBe(isURLElicitation);
    expect(agentBarrel.buildMCPInputResult).toBe(buildMCPInputResult);
  });

  it('exports working MCP input helpers from mcp-input.ts', () => {
    expect(MCPMethodElicitationCreate).toBe('elicitation/create');
    expect(parseMCPInputState).toEqual(expect.any(Function));
    expect(elicitParams).toEqual(expect.any(Function));
    expect(isURLElicitation).toEqual(expect.any(Function));
    expect(buildMCPInputResult).toEqual(expect.any(Function));
  });

  it('exports ElicitChoice for multi-select elicitation UIs (691cc60)', () => {
    const choice: ElicitChoice = { const: 'opt-a', title: 'Option A', description: 'hint' };
    expect(choice.const).toBe('opt-a');
  });
});
