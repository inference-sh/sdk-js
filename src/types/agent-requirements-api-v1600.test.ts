import * as main from '../index.js';
import {
  AgentRequirementConnected,
  AgentRequirementFromAgent,
  AgentRequirementFromApp,
  AgentRequirementFromHTTP,
  AgentRequirementFromMCP,
  AgentRequirementMissing,
  AgentRequirementMissingScopes,
  AgentRequirementNotGiven,
  AgentRequirementUnknown,
  SandboxCredentialAsk,
  SandboxCredentialAuto,
  type AgentConfigInput,
  type AgentRequirement,
  type AgentRequirementSource,
  type AgentRequirementSourceKind,
  type AgentRequirementStatus,
  type AgentRequirementsResponse,
  type CredentialRequirement,
  type SandboxCredential,
} from '../types.js';

/**
 * api-v1600 / v0.42.0: agent credentials on AgentConfigInput, CredentialRequirement.mode,
 * SandboxCredential aliased to CredentialRequirement, and GET /agents/{id}/requirements types.
 */
describe('AgentRequirementSourceKind (api-v1600)', () => {
  it('exports source kind constants from the main barrel', () => {
    expect(main.AgentRequirementFromAgent).toBe('agent');
    expect(main.AgentRequirementFromApp).toBe('app');
    expect(main.AgentRequirementFromMCP).toBe('mcp');
    expect(main.AgentRequirementFromHTTP).toBe('http');
  });

  it('keeps AgentRequirementSourceKind literals stable', () => {
    const kinds: AgentRequirementSourceKind[] = [
      AgentRequirementFromAgent,
      AgentRequirementFromApp,
      AgentRequirementFromMCP,
      AgentRequirementFromHTTP,
    ];
    expect(kinds).toEqual(['agent', 'app', 'mcp', 'http']);
  });
});

describe('AgentRequirementStatus (api-v1600)', () => {
  it('exports status constants from the main barrel', () => {
    expect(main.AgentRequirementConnected).toBe('connected');
    expect(main.AgentRequirementMissing).toBe('missing');
    expect(main.AgentRequirementMissingScopes).toBe('missing_scopes');
    expect(main.AgentRequirementUnknown).toBe('unknown');
    expect(main.AgentRequirementNotGiven).toBe('not_given');
  });

  it('keeps AgentRequirementStatus literals stable for requirements UI', () => {
    const statuses: AgentRequirementStatus[] = [
      AgentRequirementConnected,
      AgentRequirementMissing,
      AgentRequirementMissingScopes,
      AgentRequirementUnknown,
      AgentRequirementNotGiven,
    ];
    expect(statuses).toEqual([
      'connected',
      'missing',
      'missing_scopes',
      'unknown',
      'not_given',
    ]);
  });
});

describe('AgentRequirementsResponse (api-v1600)', () => {
  it('accepts merged requirements with sources and setup errors', () => {
    const fromMcp: AgentRequirementSource = {
      kind: AgentRequirementFromMCP,
      name: 'acme/tools',
      id: 'mcp-1',
      tool: 'search_docs',
    };
    const row: AgentRequirement = {
      requirement: { slug: 'slack', scopes: ['chat:write'], mode: SandboxCredentialAsk },
      from: [fromMcp],
      status: AgentRequirementMissingScopes,
      errors: [
        {
          type: 'scope',
          message: 'Missing chat:write',
          action: { type: 'add_scopes', provider: 'slack', scopes: ['chat:write'] },
        },
      ],
    };
    const response: AgentRequirementsResponse = {
      agent_id: 'agt-1',
      version_id: 'ver-1',
      satisfied: false,
      requirements: [row],
    };

    expect(response.satisfied).toBe(false);
    expect(response.requirements[0]?.from[0]?.kind).toBe('mcp');
    expect(response.requirements[0]?.requirement.mode).toBe('ask');
  });
});

describe('CredentialRequirement.mode and SandboxCredential alias (api-v1600)', () => {
  it('exports SandboxCredential mode constants from the main barrel', () => {
    expect(SandboxCredentialAuto).toBe('auto');
    expect(SandboxCredentialAsk).toBe('ask');
    expect(main.SandboxCredentialAuto).toBe('auto');
    expect(main.SandboxCredentialAsk).toBe('ask');
  });

  it('types SandboxCredential as CredentialRequirement with optional mode', () => {
    const auto: SandboxCredential = { slug: 'github', scopes: ['repo'] };
    const ask: CredentialRequirement = {
      slug: 'linear',
      mode: SandboxCredentialAsk,
    };

    const config: AgentConfigInput = {
      credentials: [auto, ask],
    };

    expect(config.credentials?.[0]?.slug).toBe('github');
    expect(config.credentials?.[1]?.mode).toBe('ask');
  });
});