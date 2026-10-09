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
    expect([PolicyEffectAllow, PolicyEffectAsk, PolicyEffectDeny]).toEqual([
      'allow',
      'ask',
      'deny',
    ]);
  });
});
