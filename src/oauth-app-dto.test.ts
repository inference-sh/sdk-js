import * as main from './index.js';
import {
  CredentialConnectRequest,
  CredentialGrantCredentials,
  CredentialScopeTeam,
  CredentialScopeUser,
  type CredentialConfigDTO,
  type OAuthAppDTO,
} from './types.js';

/**
 * models v0.8.202 / api-v1589: OAuth apps on provider configs and connect routing.
 */
describe('OAuthAppDTO and CredentialConnectRequest.app_credential_id (api-v1589)', () => {
  const baseOAuthApp = (): OAuthAppDTO => ({
    id: 'cred-slack-app',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: 'private',
    provider: 'slack',
    type: 'oauth',
    grant: CredentialGrantCredentials,
    scope: CredentialScopeTeam,
    status: 'connected',
    display_name: 'Slack workspace OAuth app',
    scopes: ['chat:write'],
    is_primary: false,
    default: true,
    usual: true,
    hook_url: 'https://hooks.example/slack-events',
  });

  it('types OAuthAppDTO with required default and usual flags plus optional hook_url', () => {
    const app = baseOAuthApp();
    expect(app.default).toBe(true);
    expect(app.usual).toBe(true);
    expect(app.hook_url).toBe('https://hooks.example/slack-events');
    expect(app.grant).toBe(CredentialGrantCredentials);

    const alternate: OAuthAppDTO = {
      ...baseOAuthApp(),
      id: 'cred-slack-alt',
      display_name: 'Slack alt app',
      default: false,
      usual: false,
      hook_url: undefined,
    };
    expect(alternate.default).toBe(false);
    expect(alternate.usual).toBe(false);
    expect(alternate.hook_url).toBeUndefined();
  });

  it('accepts app_credential_id on CredentialConnectRequest for multi-app providers', () => {
    const connectDefault: CredentialConnectRequest = {
      provider: 'slack',
      type: 'oauth',
      scopes: ['chat:write'],
      connection_scope: CredentialScopeUser,
    };
    const connectNamedApp: CredentialConnectRequest = {
      ...connectDefault,
      app_credential_id: 'cred-slack-alt',
    };

    expect(connectDefault.app_credential_id).toBeUndefined();
    expect(connectNamedApp.app_credential_id).toBe('cred-slack-alt');
  });

  it('accepts CredentialConfigDTO.apps as OAuth apps the caller may connect through', () => {
    const usual = baseOAuthApp();
    const extra: OAuthAppDTO = {
      ...baseOAuthApp(),
      id: 'cred-slack-platform',
      display_name: 'Platform Slack app',
      default: false,
      usual: false,
    };
    const config: CredentialConfigDTO = {
      slug: 'slack',
      provider: 'slack',
      type: 'oauth',
      name: 'Slack',
      short_name: 'Slack',
      description: 'Slack workspace',
      allows_byok: false,
      available: true,
      has_managed: true,
      apps: [usual, extra, undefined],
    };

    expect(config.apps).toHaveLength(3);
    expect(config.apps?.[0]?.default).toBe(true);
    expect(config.apps?.[1]?.usual).toBe(false);
    expect(config.apps?.[2]).toBeUndefined();
  });

  it('exports OAuthAppDTO from the main barrel (types re-export)', () => {
    // Compile-time export; runtime check that the barrel still re-exports types.
    const typed: main.OAuthAppDTO = baseOAuthApp();
    expect(typed.id).toBe('cred-slack-app');
  });
});