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
 * types regen 3222fa9: CredentialDTO.template is retired — the API keeps the
 * field for compatibility but documents it as always false until removal.
 */
describe('CredentialDTO.template retirement (3222fa9)', () => {
  it('models connected credentials with template false per API contract', () => {
    const connected: CredentialDTO = {
      id: 'cred-byok',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'team',
      provider: 'acme',
      type: CredentialTypeAPIKey,
      grant: CredentialGrantToken,
      scope: CredentialScopeTeam,
      status: 'connected',
      display_name: 'Acme production key',
      scopes: [],
      is_primary: true,
      template: false,
    };

    expect(connected.template).toBe(false);
  });
});

describe('types.ts regen guards for CredentialDTO.template (3222fa9)', () => {
  it('documents template as retired, always false, and scheduled for removal', () => {
    const block = typesSource.match(/export interface CredentialDTO extends[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/template: boolean/);
    expect(block![0]).toMatch(/Template: retired/);
    expect(block![0]).toMatch(/platform api_key auth scheme carries that now/);
    expect(block![0]).toMatch(/Always false/);
    expect(block![0]).toMatch(/dropped in a later release/);
    expect(block![0]).not.toMatch(/never a real key/);
  });
});
