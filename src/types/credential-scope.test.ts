import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CredentialScopeOrg,
  CredentialScopePlatform,
  CredentialScopeTeam,
  CredentialScopeUser,
  type CredentialScope,
} from '../types.js';

/**
 * cbdb670: API regen drops agent as a CredentialScope; agent vault composition
 * is INF-737, not a connect scope.
 */
describe('CredentialScope (cbdb670)', () => {
  const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');
  const credentialScopeBlock = (() => {
    const start = typesSource.indexOf('export type CredentialScope');
    expect(start).toBeGreaterThanOrEqual(0);
    return typesSource.slice(start, start + 400);
  })();

  it('pins the four connect scopes and omits agent from the union', () => {
    const scopes: CredentialScope[] = [
      CredentialScopePlatform,
      CredentialScopeOrg,
      CredentialScopeTeam,
      CredentialScopeUser,
    ];
    expect(scopes).toEqual(['platform', 'org', 'team', 'user']);

    expect(credentialScopeBlock).toMatch(
      /export type CredentialScope = "platform" \| "org" \| "team" \| "user"/,
    );
    expect(credentialScopeBlock).not.toMatch(/export const CredentialScopeAgent/);
    expect(credentialScopeBlock).not.toMatch(/\| "agent"/);
  });

  it('documents user-first resolution and vault-based agent credentials', () => {
    expect(typesSource).toMatch(/live: user > team > org > platform/);
    expect(typesSource).not.toMatch(/live: agent > user > team > org > platform/);
    expect(typesSource).toMatch(/composed by vaults \(INF-737\), not by a scope/);
  });
});
