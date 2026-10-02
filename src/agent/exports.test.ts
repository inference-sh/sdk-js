import { readFileSync } from 'fs';
import { join } from 'path';
import {
  MCPMethodElicitationCreate,
  buildMCPInputResult,
  elicitParams,
  isURLElicitation,
  parseMCPInputState,
} from './mcp-input';

describe('agent MCP input public surface', () => {
  it('re-exports MCP helpers from agent/index.ts for @inferencesh/sdk/agent consumers', () => {
    const barrel = readFileSync(join(__dirname, 'index.ts'), 'utf8');
    for (const symbol of [
      'MCPMethodElicitationCreate',
      'parseMCPInputState',
      'elicitParams',
      'isURLElicitation',
      'buildMCPInputResult',
    ]) {
      expect(barrel).toContain(symbol);
    }
  });

  it('exports working MCP input helpers from mcp-input.ts', () => {
    expect(MCPMethodElicitationCreate).toBe('elicitation/create');
    expect(parseMCPInputState).toEqual(expect.any(Function));
    expect(elicitParams).toEqual(expect.any(Function));
    expect(isURLElicitation).toEqual(expect.any(Function));
    expect(buildMCPInputResult).toEqual(expect.any(Function));
  });
});
