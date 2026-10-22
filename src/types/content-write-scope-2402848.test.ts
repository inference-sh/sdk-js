import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ScopeContentWrite,
  ScopeGroupContent,
  ScopeGroupStore,
  ScopeStorePricing,
  ScopeStoreSubmit,
  type Scope,
  type ScopeDefinition,
  type ScopeGroup,
} from '../types.js';

/**
 * types regen 2402848 (api 18adf4b88): content:write scope and content UI group
 * for platform workspace CMS (blog, docs, menus, media library).
 */
describe('Scope content:write (2402848)', () => {
  it('exports ScopeContentWrite and ScopeGroupContent from types and the main barrel', () => {
    expect(ScopeContentWrite).toBe('content:write');
    expect(ScopeGroupContent).toBe('content');
    expect(main.ScopeContentWrite).toBe('content:write');
    expect(main.ScopeGroupContent).toBe('content');
  });

  it('keeps content:write distinct from store pricing and submit scopes', () => {
    const storeAndContent: Scope[] = [
      ScopeStorePricing,
      ScopeStoreSubmit,
      ScopeContentWrite,
    ];
    expect(storeAndContent).toEqual(['store:pricing', 'store:submit', 'content:write']);
    expect(ScopeContentWrite).not.toBe(ScopeStorePricing);
    expect(ScopeContentWrite).not.toBe(ScopeStoreSubmit);
  });

  it('types ScopeDefinition rows for the content group in scope pickers', () => {
    const definition: ScopeDefinition = {
      value: ScopeContentWrite,
      label: 'Write site content',
      description: 'Blog, docs, menus, and platform media library',
      group: ScopeGroupContent,
    };
    expect(definition.value).toBe('content:write');
    expect(definition.group).toBe('content');
  });

  it('keeps ScopeGroup content separate from store grouping', () => {
    const groups: ScopeGroup[] = [ScopeGroupStore, ScopeGroupContent];
    expect(groups).toEqual(['store', 'content']);
    expect(ScopeGroupContent).not.toBe(ScopeGroupStore);
  });
});

describe('types.ts regen guards (2402848)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('adds content:write to the Scope union and exports ScopeContentWrite', () => {
    expect(typesSource).toMatch(
      /\| "store:submit"\s*\n\s*\| "content:write";/,
    );
    expect(typesSource).toMatch(
      /export const ScopeContentWrite: Scope = "content:write";/,
    );
    expect(typesSource).toMatch(/ScopeContentWrite writes the site's content/);
  });

  it('adds content to ScopeGroup and exports ScopeGroupContent', () => {
    expect(typesSource).toMatch(/\| "store"\s*\n\s*\| "content";/);
    expect(typesSource).toMatch(
      /export const ScopeGroupContent: ScopeGroup = "content";/,
    );
  });
});
