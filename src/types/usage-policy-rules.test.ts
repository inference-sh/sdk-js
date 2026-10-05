import * as main from '../index';
import {
  ErrorCodeBlockedByUsagePolicy,
  PolicyEffectAllow,
  PolicyEffectDeny,
  PolicyKindApp,
  PolicyKindAgent,
  PolicyKindFlow,
  PolicyKindKnowledge,
  TeamCapabilityManagePolicy,
  TeamCapabilityViewPolicy,
  type PolicyRuleDTO,
} from '../types';

/**
 * Usage policy rules share PolicyRuleDTO with harness HIL rules (go/api b3b16cfc).
 * Specifiers name a resource id or publisher:<team id>; labels keep the written
 * pattern (e.g. bytedance/seedance, bytedance/*).
 */
describe('usage policy PolicyRuleDTO shapes', () => {
  it('exports usage-policy error and team capability constants from the barrel', () => {
    expect(main.ErrorCodeBlockedByUsagePolicy).toBe('blocked_by_usage_policy');
    expect(main.TeamCapabilityViewPolicy).toBe('view_policy');
    expect(main.TeamCapabilityManagePolicy).toBe('manage_policy');
    expect(ErrorCodeBlockedByUsagePolicy).toBe('blocked_by_usage_policy');
    expect(TeamCapabilityViewPolicy).toBe('view_policy');
    expect(TeamCapabilityManagePolicy).toBe('manage_policy');
  });

  it('accepts an App rule that names one app by resource id', () => {
    const rule: PolicyRuleDTO = {
      id: 'rule-app-1',
      effect: PolicyEffectAllow,
      kind: PolicyKindApp,
      selector: '',
      specifier: 'app-uuid-seedance',
      label: 'bytedance/seedance',
      created_by: 'admin-1',
    };
    expect(rule.specifier).toBe('app-uuid-seedance');
    expect(rule.label).toBe('bytedance/seedance');
    expect(rule.kind).toBe('App');
  });

  it('accepts an App rule that allows everything a publisher team owns', () => {
    const rule: PolicyRuleDTO = {
      id: 'rule-publisher',
      effect: PolicyEffectAllow,
      kind: PolicyKindApp,
      selector: '',
      specifier: 'publisher:team-bytd-99',
      label: 'bytedance/*',
      created_by: 'org-admin',
    };
    expect(rule.specifier).toMatch(/^publisher:/);
    expect(rule.label).toContain('*');
  });

  it('accepts usage-kind deny rules for agents, knowledge, and flows', () => {
    const agentRule: PolicyRuleDTO = {
      id: 'rule-agent',
      effect: PolicyEffectDeny,
      kind: PolicyKindAgent,
      selector: '',
      specifier: 'agent-42',
      label: 'acme/support-bot',
      created_by: 'policy-editor',
    };
    const knowledgeRule: PolicyRuleDTO = {
      id: 'rule-knowledge',
      effect: PolicyEffectDeny,
      kind: PolicyKindKnowledge,
      selector: '',
      specifier: 'publisher:team-kb',
      label: 'internal-docs/*',
      created_by: 'policy-editor',
    };
    const flowRule: PolicyRuleDTO = {
      id: 'rule-flow',
      effect: PolicyEffectAllow,
      kind: PolicyKindFlow,
      selector: '',
      specifier: 'flow-deploy-prod',
      label: 'acme/deploy-prod',
      created_by: 'policy-editor',
    };
    expect(agentRule.kind).toBe('Agent');
    expect(knowledgeRule.specifier).toBe('publisher:team-kb');
    expect(flowRule.label).toBe('acme/deploy-prod');
  });
});
