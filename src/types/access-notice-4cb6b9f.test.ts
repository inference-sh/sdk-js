import { readFileSync } from 'fs';
import { join } from 'path';
import type { AccessNoticeDTO, MeResponse } from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/** types regen 4cb6b9f: structured AccessNoticeDTO on MeResponse and access_restricted meta.notice */
describe('AccessNoticeDTO redlist structured notice (4cb6b9f)', () => {
  it('documents AccessNoticeDTO and MeResponse.access_notice in types.ts', () => {
    expect(typesSource).toMatch(/export interface AccessNoticeDTO \{/);
    expect(typesSource).toMatch(/access_notice\?: AccessNoticeDTO;/);
    expect(typesSource).toMatch(/refusal's meta\.notice and \/me's access_notice/);
    expect(typesSource).toMatch(/Stage: lure \(install the CLI/);
    expect(typesSource).toMatch(/install_url\?: string;/);
    expect(typesSource).toMatch(/install_command\?: string;/);
    expect(typesSource).toMatch(/case\?: string;/);
    expect(typesSource).toMatch(/AccessNotice is the same notice in structured form/);
  });

  it('models lure-stage notice with CLI install hints', () => {
    const lure: AccessNoticeDTO = {
      stage: 'lure',
      text: 'Install the belt CLI to continue.',
      reference: 'REF-LURE',
      contact: 'support@example.com',
      install_url: 'https://example.com/install',
      install_command: 'curl -fsSL https://example.com/install.sh | sh',
    };
    expect(lure.stage).toBe('lure');
    expect(lure.install_command).toContain('curl');
    expect(lure.case).toBeUndefined();
  });

  it('models legal-stage notice with optional case reference', () => {
    const legal: AccessNoticeDTO = {
      stage: 'legal',
      text: 'Your access is restricted.',
      reference: 'CASE-991',
      contact: 'legal@example.com',
      case: 'LE-2026-042',
    };
    expect(legal.stage).toBe('legal');
    expect(legal.case).toBe('LE-2026-042');
    expect(legal.install_url).toBeUndefined();
    expect(legal.install_command).toBeUndefined();
  });

  it('extends MeResponse with structured access_notice alongside flat notice fields', () => {
    const me: MeResponse = {
      needs_username: false,
      notice: 'Access limited',
      notice_reference: 'REF-42',
      notice_contact: 'support@example.com',
      access_notice: {
        stage: 'lure',
        text: 'Access limited',
        reference: 'REF-42',
        contact: 'support@example.com',
        install_url: 'https://example.com/cli',
        install_command: 'belt login',
      },
    };
    expect(me.access_notice?.reference).toBe(me.notice_reference);
    expect(me.access_notice?.contact).toBe(me.notice_contact);
    expect(me.access_notice?.text).toBe(me.notice);
  });
});
