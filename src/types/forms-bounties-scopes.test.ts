import * as main from '../index.js';
import {
  ScopeBounties,
  ScopeBountiesExecute,
  ScopeBountiesRead,
  ScopeForms,
  ScopeFormsExecute,
  ScopeFormsRead,
  ScopeFormsWrite,
  type Scope,
} from '../types.js';

/**
 * Fine-grained forms and bounties OAuth scopes landed in types regen 80f834c.
 */
describe('forms and bounties OAuth scopes (80f834c)', () => {
  it('exports fine-grained forms scopes from the main barrel', () => {
    expect(ScopeFormsRead).toBe('forms:read');
    expect(ScopeFormsWrite).toBe('forms:write');
    expect(ScopeFormsExecute).toBe('forms:execute');
    expect(main.ScopeFormsRead).toBe('forms:read');
    expect(main.ScopeFormsWrite).toBe('forms:write');
    expect(main.ScopeFormsExecute).toBe('forms:execute');
  });

  it('exports fine-grained bounties scopes distinct from the coarse bounties scope', () => {
    expect(ScopeBountiesRead).toBe('bounties:read');
    expect(ScopeBountiesExecute).toBe('bounties:execute');
    expect(ScopeBounties).toBe('bounties');
    expect(main.ScopeBountiesRead).toBe('bounties:read');
    expect(main.ScopeBountiesExecute).toBe('bounties:execute');
    expect(main.ScopeBounties).toBe('bounties');
  });

  it('keeps scope wire strings stable for connect and token refresh payloads', () => {
    const formsScopes: Scope[] = [ScopeForms, ScopeFormsRead, ScopeFormsWrite, ScopeFormsExecute];
    expect(formsScopes).toEqual(['forms', 'forms:read', 'forms:write', 'forms:execute']);

    const bountyScopes: Scope[] = [ScopeBounties, ScopeBountiesRead, ScopeBountiesExecute];
    expect(bountyScopes).toEqual(['bounties', 'bounties:read', 'bounties:execute']);
  });
});
