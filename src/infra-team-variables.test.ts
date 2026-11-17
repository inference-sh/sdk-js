import * as main from './index.js';
import {
  EngineCapabilityTaskEnv,
  InfraCloud,
  InfraPrivate,
  InfraPrivateFirst,
  RequirementTypeVariable,
  SetupActionAddVariable,
  type Infra,
  type VarRequirement,
  type VariableSetRequest,
} from './types.js';

/**
 * Types regen 5e5cf44 (v0.41.0): team variables (INF-1345), sandbox/chat/agent
 * infra routing, and task_env engine capability.
 */
describe('Infra routing (v0.41.0)', () => {
  it('exports Infra literals from the main barrel', () => {
    expect(main.InfraCloud).toBe('cloud');
    expect(main.InfraPrivate).toBe('private');
    expect(main.InfraPrivateFirst).toBe('private_first');
  });

  it('keeps Infra union stable for sandbox and chat payloads', () => {
    const choices: Infra[] = [InfraCloud, InfraPrivate, InfraPrivateFirst];
    expect(choices).toEqual(['cloud', 'private', 'private_first']);
  });
});

describe('team variables API types (v0.41.0)', () => {
  it('exports variable requirement and setup-action constants', () => {
    expect(RequirementTypeVariable).toBe('variable');
    expect(SetupActionAddVariable).toBe('add_variable');
    expect(main.RequirementTypeVariable).toBe('variable');
    expect(main.SetupActionAddVariable).toBe('add_variable');
  });

  it('models VarRequirement keys for inf.yml vars:', () => {
    const required: VarRequirement = { key: 'REGION', description: 'Deploy region' };
    const optionalWithDefault: VarRequirement = {
      key: 'LOG_LEVEL',
      optional: true,
      default: 'info',
    };
    expect(required.key).toBe('REGION');
    expect(optionalWithDefault.default).toBe('info');
  });

  it('types VariableSetRequest for PUT /variables/{key}', () => {
    const body: VariableSetRequest = { value: 'eu-west', description: 'Primary region' };
    expect(body.value).toBe('eu-west');
  });
});

describe('engine capabilities (v0.41.0)', () => {
  it('exports EngineCapabilityTaskEnv for per-task app environment on workers', () => {
    expect(EngineCapabilityTaskEnv).toBe('task_env');
    expect(main.EngineCapabilityTaskEnv).toBe('task_env');
  });
});