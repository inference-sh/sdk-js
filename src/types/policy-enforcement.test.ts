import * as main from '../index';
import {
  PolicyEffectAllow,
  PolicyEffectAsk,
  PolicyEnforcementDefault,
  PolicyEnforcementDisabled,
  PolicyEnforcementEnforced,
  PolicyEnforcementEvaluate,
  PolicyKindRemoteExec,
  PolicyKindTool,
  type PolicyEnforcement,
  type PolicyRuleDTO,
} from '../types';

/**
 * PolicyRuleDTO.enforcement (go/api 210b49c1) controls whether a rule decides,
 * is final admin governance, runs in evaluate-only mode, or is kept disabled.
 * Selectors narrow RemoteExec rules to a remote id or tag:<name>.
 */
describe('PolicyRuleDTO enforcement (INF-906)', () => {
  it('exports PolicyEnforcement constants from the main barrel', () => {
    expect(main.PolicyEnforcementDefault).toBe('default');
    expect(main.PolicyEnforcementEnforced).toBe('enforced');
    expect(main.PolicyEnforcementEvaluate).toBe('evaluate');
    expect(main.PolicyEnforcementDisabled).toBe('disabled');
    expect(PolicyEnforcementDefault).toBe('default');
  });

  it('keeps PolicyEnforcement string literals stable for API payloads', () => {
    const modes: PolicyEnforcement[] = [
      PolicyEnforcementDefault,
      PolicyEnforcementEnforced,
      PolicyEnforcementEvaluate,
      PolicyEnforcementDisabled,
    ];
    expect(modes).toEqual(['default', 'enforced', 'evaluate', 'disabled']);
  });

  it('accepts RemoteExec rules scoped by remote id or tag selector', () => {
    const byRemote: PolicyRuleDTO = {
      id: 'exec-remote',
      effect: PolicyEffectAsk,
      enforcement: PolicyEnforcementDefault,
      kind: PolicyKindRemoteExec,
      selector: 'remote:laptop-7',
      specifier: 'npm test',
      label: 'npm test on Laptop',
      created_by: 'user-1',
    };
    const byTag: PolicyRuleDTO = {
      id: 'exec-tag',
      effect: PolicyEffectAllow,
      enforcement: PolicyEnforcementDefault,
      kind: PolicyKindRemoteExec,
      selector: 'tag:ci-runners',
      specifier: 'git push:*',
      label: 'git push on CI runners',
      created_by: 'admin-1',
    };
    expect(byRemote.selector).toMatch(/^remote:/);
    expect(byTag.selector).toMatch(/^tag:/);
  });

  it('accepts enforced and evaluate enforcement for governance and shadow rules', () => {
    const enforced: PolicyRuleDTO = {
      id: 'gov-deny-rm',
      effect: PolicyEffectAsk,
      enforcement: PolicyEnforcementEnforced,
      kind: PolicyKindTool,
      selector: '',
      specifier: 'Bash(rm -rf:*)',
      label: 'destructive shell',
      created_by: 'org-admin',
    };
    const evaluate: PolicyRuleDTO = {
      id: 'trial-allow-read',
      effect: PolicyEffectAllow,
      enforcement: PolicyEnforcementEvaluate,
      kind: PolicyKindRemoteExec,
      selector: '',
      specifier: 'cat ~/.ssh/*',
      label: 'read ssh configs (evaluate only)',
      created_by: 'security',
    };
    const disabled: PolicyRuleDTO = {
      id: 'legacy',
      effect: PolicyEffectAllow,
      enforcement: PolicyEnforcementDisabled,
      kind: PolicyKindRemoteExec,
      selector: '',
      specifier: 'make',
      label: 'old make rule',
      created_by: 'user-2',
    };
    expect(enforced.enforcement).toBe('enforced');
    expect(evaluate.enforcement).toBe('evaluate');
    expect(disabled.enforcement).toBe('disabled');
  });
});
