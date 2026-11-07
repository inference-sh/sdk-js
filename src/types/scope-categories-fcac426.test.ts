import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ScopeCategoryAccount,
  ScopeCategoryPlatform,
  ScopeCategoryResources,
  ScopeCategoryWorkspace,
  ScopeGroupAgents,
  type ScopeCategory,
  type ScopeCategoryDefinition,
  type ScopeGroup,
  type ScopeGroupDefinition,
  type ScopesResponse,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen fcac426: ScopeCategory sections for GET /scopes UI grouping
 * (ScopeCategoryDefinition, ScopesResponse.categories, ScopeGroupDefinition.category).
 */
describe('scope category types (fcac426)', () => {
  it('exports ScopeCategory constants from types and the main barrel', () => {
    expect(ScopeCategoryResources).toBe('resources');
    expect(ScopeCategoryWorkspace).toBe('workspace');
    expect(ScopeCategoryAccount).toBe('account');
    expect(ScopeCategoryPlatform).toBe('platform');
    expect(main.ScopeCategoryResources).toBe('resources');
    expect(main.ScopeCategoryWorkspace).toBe('workspace');
    expect(main.ScopeCategoryAccount).toBe('account');
    expect(main.ScopeCategoryPlatform).toBe('platform');
  });

  it('keeps ScopeCategory literals stable and distinct from ScopeGroup ids', () => {
    const categories: ScopeCategory[] = [
      ScopeCategoryResources,
      ScopeCategoryWorkspace,
      ScopeCategoryAccount,
      ScopeCategoryPlatform,
    ];
    expect(categories).toEqual(['resources', 'workspace', 'account', 'platform']);

    const groupId: ScopeGroup = ScopeGroupAgents;
    expect(groupId).toBe('agents');
    expect(categories).not.toContain(groupId);
  });

  it('types ScopeCategoryDefinition and required group.category for scope pickers', () => {
    const section: ScopeCategoryDefinition = {
      id: ScopeCategoryResources,
      label: 'Resources',
      description: 'Apps, agents, and data you build and run.',
    };
    expect(section.id).toBe('resources');

    const group: ScopeGroupDefinition = {
      id: ScopeGroupAgents,
      label: 'Agents',
      description: 'Agent runs and configuration.',
      category: ScopeCategoryResources,
    };
    expect(group.category).toBe(ScopeCategoryResources);
  });

  it('types ScopesResponse.categories alongside groups and account_groups', () => {
    const response: ScopesResponse = {
      scopes: [],
      groups: [],
      presets: [],
      categories: [
        {
          id: ScopeCategoryWorkspace,
          label: 'Workspace',
          description: 'Teams, billing, and workspace settings.',
        },
      ],
      account_scopes: [],
      account_groups: [],
      login_preset: {
        id: 'standard',
        label: 'Standard',
        description: 'Typical CLI access.',
        scopes: [],
      },
    };
    expect(response.categories).toHaveLength(1);
    expect(response.categories[0]?.id).toBe('workspace');
  });

  it('documents scope categories on GET /scopes in types.ts', () => {
    expect(typesSource).toMatch(
      /export type ScopeCategory = "resources" \| "workspace" \| "account" \| "platform";/,
    );
    expect(typesSource).toMatch(
      /export const ScopeCategoryResources: ScopeCategory = "resources";/,
    );
    expect(typesSource).toMatch(/export interface ScopeCategoryDefinition \{/);
    expect(typesSource).toMatch(/category: ScopeCategory;/);
    expect(typesSource).toMatch(/categories: ScopeCategoryDefinition\[\];/);
    expect(typesSource).toMatch(
      /Categories are the sections Groups and AccountGroups fall in/,
    );
  });
});
