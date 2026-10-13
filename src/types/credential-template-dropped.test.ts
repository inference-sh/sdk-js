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
 * types regen d3e29fe: CredentialDTO.template removed from the public schema.
 */
describe('CredentialDTO.template removal (d3e29fe)', () => {
  it('models connected credentials without a template catalogue flag', () => {
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
    };

    expect(connected).not.toHaveProperty('template');
  });
});

describe('types.ts regen guards for CredentialDTO.template removal (d3e29fe)', () => {
  it('drops template from CredentialDTO after error_message and before secrets', () => {
    const block = typesSource.match(/export interface CredentialDTO extends[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).not.toMatch(/\btemplate:\s*boolean/);
    expect(block![0]).not.toMatch(/Template: retired/);
    expect(block![0]).toMatch(/error_message\?: string/);
    expect(block![0]).toMatch(/secrets\?: CredentialSecretRef\[\]/);
  });
});
