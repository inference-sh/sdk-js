import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index';
import * as types from '../types';
import {
  AppCategoryDecision,
  type AppDTO,
  type CreateAppRequest,
} from '../types';

/** Slugs that used to ship as AppTag constants; still valid on payloads. */
const FORMER_CURATED_TAG_SLUGS = [
  'text-to-image',
  'deep-research',
  'social-media',
  'video-enhancement',
  'evaluation',
  'ocr',
  'virtual-try-on',
] as const;

const REMOVED_TAG_CONSTANT_PREFIXES = ['AppTag', 'AppTagTitle'] as const;

/**
 * types regen 0767f7b: curated AppTag/AppTagTitle exports removed; tag titles
 * come from GET /store/tags. AppDTO.tags stays free-form string[].
 */
describe('App tags free-form contract (0767f7b)', () => {
  it('does not export AppTag or AppTagTitle slug constants from types or the barrel', () => {
    for (const [key, value] of Object.entries(types)) {
      if (REMOVED_TAG_CONSTANT_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        expect({ key, value }).toEqual({ key: '__unexpected__', value: '__unexpected__' });
      }
    }
    for (const key of Object.keys(main)) {
      if (REMOVED_TAG_CONSTANT_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        expect(key).toBe('__unexpected_export__');
      }
    }
  });

  it('does not regenerate AppTag/AppTagTitle constant blocks in types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(source).not.toMatch(/export const AppTagTextToImage/);
    expect(source).not.toMatch(/export type AppTag\s*=/);
    expect(source).not.toMatch(/export type AppTagTitle\s*=/);
    expect(source).toMatch(/GET \/store\/tags lists the ones in use/);
  });

  it('accepts former curated slugs and custom tags on AppDTO', () => {
    const app: AppDTO = {
      id: 'app-tags',
      short_id: 'tag1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'public',
      namespace: 'acme',
      name: 'tagged-app',
      title: 'Tagged App',
      description: '',
      agent_description: '',
      category: 'image',
      images: {},
      tags: [...FORMER_CURATED_TAG_SLUGS, 'partner-beta'],
      version_id: 'ver-1',
      status: 'active',
    };
    expect(app.tags).toEqual([...FORMER_CURATED_TAG_SLUGS, 'partner-beta']);
  });

  it('forwards free-form tags on CreateAppRequest with decision category', () => {
    const body: CreateAppRequest = {
      name: 'research-agent',
      category: AppCategoryDecision,
      tags: ['deep-research', 'evaluation', 'custom-slug'],
    };
    expect(body.category).toBe('decision');
    expect(body.tags).toEqual(['deep-research', 'evaluation', 'custom-slug']);
  });

  it('keeps AppCategoryDecision on types and the main barrel', () => {
    expect(AppCategoryDecision).toBe('decision');
    expect(main.AppCategoryDecision).toBe('decision');
  });
});
