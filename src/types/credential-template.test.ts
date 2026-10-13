import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CredentialGrantToken,
  CredentialScopeTeam,
  CredentialTypeAPIKey,
  type CredentialDTO,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/**
 * types regen 7e61d96: CredentialDTO.template marks catalogue api_key provider
 * rows (empty platform template), not a team's connected key.
 */
describe('CredentialDTO.template (7e61d96)', () => {
  it('distinguishes catalogue template rows from real connected credentials', () => {
    const catalogueRow: CredentialDTO = {
      id: 'cred-template',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'team',
      provider: 'acme',
      type: CredentialTypeAPIKey,
      grant: CredentialGrantToken,
      scope: CredentialScopeTeam,
      status: 'connected',
      display_name: 'Acme API key (template)',
      scopes: [],
      is_primary: false,
      template: true,
    };

    const connectedKey: CredentialDTO = {
      ...catalogueRow,
      id: 'cred-byok',
      display_name: 'Acme production key',
      is_primary: true,
      template: false,
    };

    expect(catalogueRow.template).toBe(true);
    expect(connectedKey.template).toBe(false);
  });
});

describe('types.ts regen guards for CredentialDTO.template (7e61d96)', () => {
  it('requires template on CredentialDTO with catalogue-row documentation', () => {
    const block = typesSource.match(/export interface CredentialDTO extends[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/template: boolean/);
    expect(block![0]).toMatch(/catalogue template of an api_key provider/);
    expect(block![0]).toMatch(/never a real key/);
  });
});
