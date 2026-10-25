import { readFileSync } from 'fs';
import { join } from 'path';
import {
  AuthMethodFlowAuthorizationCode,
  AuthMethodOAuth2,
  type AuthMethod,
  type AuthMethodCapability,
} from '../types.js';

/**
 * types regen 730b597: OAuth scopes on AuthMethod are documented as the
 * provider's wire names (what credentials store); scope_aliases are input-only
 * shorthand.
 */
describe('AuthMethod OAuth scope naming (730b597)', () => {
  const gmailWire = 'https://www.googleapis.com/auth/gmail.send';
  const gmailAlias = 'gmail.send';

  it('types capabilities with wire-scope lists stored on credentials', () => {
    const capability: AuthMethodCapability = {
      key: 'google.gmail.send',
      display_name: 'Send Gmail',
      scopes: [gmailWire],
    };
    expect(capability.scopes).toEqual([gmailWire]);
    expect(capability.scopes).not.toContain(gmailAlias);
  });

  it('types scope_aliases as shorthand accepted on input, mapping to wire names', () => {
    const auth: AuthMethod = {
      kind: AuthMethodOAuth2,
      flow: AuthMethodFlowAuthorizationCode,
      scopes: [gmailWire],
      scope_aliases: { [gmailAlias]: gmailWire },
      required_scopes: [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
    };

    expect(auth.scope_aliases?.[gmailAlias]).toBe(gmailWire);
    expect(auth.scopes).toEqual([gmailWire]);
    expect(auth.required_scopes).toEqual([
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ]);
  });

  it('allows a scope with no alias to be the provider wire name as-is', () => {
    const slackUserScope = 'users:read';
    const auth: AuthMethod = {
      kind: AuthMethodOAuth2,
      scopes: [slackUserScope],
      scope_aliases: {},
    };
    expect(auth.scopes).toEqual([slackUserScope]);
    expect(auth.scope_aliases?.[slackUserScope]).toBeUndefined();
  });
});

describe('types.ts regen guards (730b597)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('documents capability scopes as provider wire names credentials store', () => {
    expect(typesSource).toMatch(
      /AuthMethodCapability is something an app can ask for from this provider,[\s\S]*Scopes are the provider's[\s\S]*own names \(Wire form\), the ones a credential stores/,
    );
  });

  it('documents scope_aliases as input-only shorthand with wire-form storage and comparison', () => {
    expect(typesSource).toMatch(
      /ScopeAliases are shorthand a caller may write for a provider scope[\s\S]*accepted on input only: credentials, capabilities and allowed[\s\S]*lists hold the provider's own name \(Wire\), and every comparison is[\s\S]*in that form/,
    );
    expect(typesSource).toMatch(
      /A scope with no alias is the provider's name as is/,
    );
  });

  it("documents required_scopes in the provider's own names, not scheme-friendly aliases", () => {
    expect(typesSource).toMatch(
      /RequiredScopes are always requested[\s\S]*In the[\s\S]*provider's own names, like Scopes/,
    );
    expect(typesSource).not.toMatch(
      /Scopes are in the scheme's own \(friendly\) names/,
    );
    expect(typesSource).not.toMatch(
      /Credentials store the alias; the wire form is used only/,
    );
  });
});
