// jest only transforms .ts here, so stub the React provider (provider.tsx) to load the barrel.
jest.mock('./provider', () => ({ AgentChatProvider: () => null }), { virtual: true });

import * as agentBarrel from './index';
import {
  MCPMethodElicitationCreate,
  buildMCPInputResult,
  elicitParams,
  isURLElicitation,
  parseMCPInputState,
} from './mcp-input';

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
});
