import * as main from './index.js';
import {
  AuthMethodOAuth2,
  type AuthMethod,
  type AuthMethodBot,
  type CredentialRequirement,
  type SandboxCredential,
} from './types.js';

/** models v0.8.200 / api-v1581: workspace bot installs (Slack) and per-scope authorize params. */
describe('AuthMethod bot and scope_params (api-v1581)', () => {
  const slackBot: AuthMethodBot = {
    scope_param: 'scope',
    scopes: ['chat:write', 'channels:read'],
    token: '{{token.bot.access_token}}',
    granted_scopes: 'chat:write,channels:read',
    hosts: ['slack.com', 'api.slack.com'],
  };

  const slackAuth: AuthMethod = {
    kind: AuthMethodOAuth2,
    scope_param: 'user_scope',
    scope_separator: ',',
    bot: slackBot,
    scope_params: {
      'bot:chat:write': { permissions: '0' },
    },
  };

  it('types AuthMethod.bot with Slack-style scope_param and bot_token template paths', () => {
    expect(slackAuth.bot?.scope_param).toBe('scope');
    expect(slackAuth.scope_param).toBe('user_scope');
    expect(slackAuth.bot?.token).toBe('{{token.bot.access_token}}');
    expect(slackAuth.bot?.hosts).toEqual(['slack.com', 'api.slack.com']);
  });

  it('types AuthMethod.scope_params per requested scope (Discord bot permissions)', () => {
    const discord: AuthMethod = {
      kind: AuthMethodOAuth2,
      scope_params: {
        bot: { permissions: '8' },
      },
    };

    expect(discord.scope_params?.bot?.permissions).toBe('8');
    expect(slackAuth.scope_params?.['bot:chat:write']?.permissions).toBe('0');
  });

  it('allows auth.bot on CredentialRequirement for deploy catalog seeds', () => {
    const req: CredentialRequirement = {
      slug: 'slack',
      capabilities: ['slack.channels.write'],
      auth: slackAuth,
    };

    expect(req.auth?.bot?.scopes).toEqual(['chat:write', 'channels:read']);
    expect(req.auth?.bot?.granted_scopes).toBe('chat:write,channels:read');
  });

  it('allows auth.bot on SandboxCredential alongside mode wiring', () => {
    const cred: SandboxCredential = {
      slug: 'slack',
      mode: 'auto',
      auth: { kind: AuthMethodOAuth2, bot: slackBot },
    };

    expect(cred.auth?.bot?.scope_param).toBe('scope');
  });

  it('exports AuthMethodOAuth2 from the main barrel for oauth bot profiles', () => {
    expect(AuthMethodOAuth2).toBe('oauth2');
    expect(main.AuthMethodOAuth2).toBe('oauth2');
  });
});