import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CredentialScopeTeam,
  type CredentialConfigDTO,
  type ProviderSummary,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/**
 * types regen d4e6257: ProviderSummary gains terms_url and privacy_url for
 * provider legal links surfaced in credential catalog UIs.
 */
describe('ProviderSummary legal links (d4e6257)', () => {
  it('accepts optional terms and privacy URLs alongside website and docs', () => {
    const provider: ProviderSummary = {
      slug: 'acme',
      name: 'Acme CRM',
      website: 'https://acme.example',
      docs_url: 'https://docs.acme.example',
      terms_url: 'https://acme.example/terms',
      privacy_url: 'https://acme.example/privacy',
    };

    expect(provider.terms_url).toBe('https://acme.example/terms');
    expect(provider.privacy_url).toBe('https://acme.example/privacy');
  });

  it('nests provider_info on CredentialConfigDTO for grouped catalog display', () => {
    const config: CredentialConfigDTO = {
      slug: 'acme-api',
      provider: 'acme-api',
      provider_info: {
        slug: 'acme',
        name: 'Acme CRM',
        terms_url: 'https://acme.example/terms',
        privacy_url: 'https://acme.example/privacy',
      },
      type: 'api_key',
      name: 'Acme API key',
      short_name: 'Acme',
      description: 'Bring your own Acme key',
      allows_byok: true,
      available: true,
      has_managed: false,
      connection_scope: CredentialScopeTeam,
    };

    expect(config.provider_info?.terms_url).toContain('/terms');
    expect(config.provider_info?.privacy_url).toContain('/privacy');
  });
});

describe('types.ts regen guards for ProviderSummary (d4e6257)', () => {
  it('declares terms_url and privacy_url on ProviderSummary after docs_url', () => {
    const block = typesSource.match(/export interface ProviderSummary \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    const body = block![0];
    expect(body).toMatch(/website\?: string;/);
    expect(body).toMatch(/docs_url\?: string;/);
    expect(body).toMatch(/terms_url\?: string;/);
    expect(body).toMatch(/privacy_url\?: string;/);
    const docsIdx = body.indexOf('docs_url');
    const termsIdx = body.indexOf('terms_url');
    const privacyIdx = body.indexOf('privacy_url');
    expect(termsIdx).toBeGreaterThan(docsIdx);
    expect(privacyIdx).toBeGreaterThan(termsIdx);
  });
});
