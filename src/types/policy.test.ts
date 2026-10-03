import * as main from '../index';
import {
  PolicyEffectAllow,
  PolicyEffectAsk,
  PolicyEffectDeny,
  PolicyKindAgent,
  PolicyKindApp,
  PolicyKindFlow,
  PolicyKindHarness,
  PolicyKindKnowledge,
  PolicyKindMcp,
  PolicyKindRemoteExec,
  PolicyKindTool,
  PolicyKindWebFetch,
  PolicyKindWorkspace,
  type PolicyKind,
  type PolicyRuleDTO,
} from '../types';

describe('policy types (v0.18)', () => {
  it('exports PolicyKind and PolicyEffect constants from the main barrel', () => {
    expect(main.PolicyKindRemoteExec).toBe('RemoteExec');
    expect(main.PolicyEffectAllow).toBe('allow');
  });

  it('keeps PolicyKind string literals stable for API rule kinds', () => {
    const kinds: PolicyKind[] = [
      PolicyKindRemoteExec,
      PolicyKindWorkspace,
      PolicyKindHarness,
      PolicyKindTool,
      PolicyKindApp,
      PolicyKindAgent,
      PolicyKindKnowledge,
      PolicyKindMcp,
      PolicyKindFlow,
      PolicyKindWebFetch,
    ];
    expect(kinds).toEqual([
      'RemoteExec',
      'Workspace',
      'Harness',
      'Tool',
      'App',
      'Agent',
      'Knowledge',
      'Mcp',
      'Flow',
      'WebFetch',
    ]);
  });

  it('keeps PolicyEffect outcomes stable for rules and decisions', () => {
    expect([PolicyEffectAllow, PolicyEffectAsk, PolicyEffectDeny]).toEqual(['allow', 'ask', 'deny']);
  });

  it('accepts a full PolicyRuleDTO with typed kind (harness and usage kinds)', () => {
    const remoteExec: PolicyRuleDTO = {
      id: 'r-exec',
      effect: PolicyEffectAsk,
      kind: PolicyKindRemoteExec,
      selector: 'remote:dev-mac',
      specifier: 'npm run build',
      label: 'npm run build on Laptop',
      created_by: 'user-1',
    };
    const usageMcp: PolicyRuleDTO = {
      id: 'r-mcp',
      effect: PolicyEffectAllow,
      kind: PolicyKindMcp,
      selector: 'mcp-server-uuid',
      specifier: '',
      label: 'Allow MCP server in this workspace',
      created_by: 'user-2',
    };
    expect(remoteExec.kind).toBe('RemoteExec');
    expect(usageMcp.kind).toBe('Mcp');
  });
});
