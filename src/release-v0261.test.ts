import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from './index.js';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release 9be5c40 / changelog 8e93e50: v0.26.1 ships models v0.8.97 AuthSchemeSpec
 * OAuth/MCP fields and public-client client_auth "none".
 */
describe('release v0.26.1 (9be5c40)', () => {
  it('ships version 0.26.1 and documents AuthSchemeSpec / client_auth none in the changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.26.1');
    expect(SDK_VERSION).toBe('0.26.1');

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[0\.26\.1\]/);
    expect(changelog).toMatch(/AuthSchemeSpec/);
    expect(changelog).toMatch(/resource/);
    expect(changelog).toMatch(/issuer/);
    expect(changelog).toMatch(/authorization_response_iss_parameter_supported/);
    expect(changelog).toMatch(/callback/);
    expect(changelog).toMatch(/profile/);
    expect(changelog).toMatch(/AuthSchemeClientAuth/);
    expect(changelog).toMatch(/"none"/);
  });

  it('exports AuthSchemeClientAuthNone from the main barrel (d29cdce / v0.8.97)', () => {
    expect(main.AuthSchemeClientAuthNone).toBe('none');
  });

  it('keeps d29cdce generated AuthSchemeClientAuth and AuthSchemeSpec fields in types.ts', () => {
    const source = readFileSync(join(__dirname, 'types.ts'), 'utf8');
    expect(source).toMatch(
      /export type AuthSchemeClientAuth = "basic" \| "body" \| "none"/
    );
    expect(source).toMatch(
      /export const AuthSchemeClientAuthNone: AuthSchemeClientAuth = "none"/
    );

    const block = source.match(/export interface AuthSchemeSpec \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/resource\?: string/);
    expect(block![0]).toMatch(/issuer\?: string/);
    expect(block![0]).toMatch(/authorization_response_iss_parameter_supported\?: boolean/);
    expect(block![0]).toMatch(/callback\?: string/);
    expect(block![0]).toMatch(/profile\?: string/);
    expect(block![0]).toMatch(/client_auth\?: AuthSchemeClientAuth/);
  });
});
