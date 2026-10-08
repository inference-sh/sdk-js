import * as main from '../index';
import * as types from '../types';
import {
  AppCategoryDecision,
  AppTagClassification,
  AppTagRouting,
  AppTagTitleClassification,
  AppTagTitleRouting,
  type AppDTO,
  type CreateAppRequest,
} from '../types';

/**
 * types regen da8cf99: AppDTO/CreateAppRequest tags; AppCategory "decision";
 * AppTag slugs with paired AppTagTitle display strings.
 */
describe('AppCategory decision (da8cf99)', () => {
  it('exports AppCategoryDecision on types and the main barrel', () => {
    expect(AppCategoryDecision).toBe('decision');
    expect(main.AppCategoryDecision).toBe('decision');
  });

  it('accepts decision category on AppDTO with probability-model tags', () => {
    const app: AppDTO = {
      id: 'app-decision-1',
      short_id: 'dec1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'public',
      namespace: 'acme',
      name: 'intent-router',
      title: 'Intent Router',
      description: 'Scores answers, no generation',
      agent_description: '',
      category: AppCategoryDecision,
      images: {},
      tags: [AppTagClassification, AppTagRouting],
      version_id: 'ver-1',
      status: 'active',
    };
    expect(app.category).toBe('decision');
    expect(app.tags).toEqual(['classification', 'routing']);
  });
});

describe('AppTag slugs and AppTagTitle pairs (da8cf99)', () => {
  it('pairs every AppTag constant with a matching AppTagTitle constant', () => {
    const tagEntries = Object.entries(types).filter(
      ([key, value]) =>
        key.startsWith('AppTag') &&
        !key.startsWith('AppTagTitle') &&
        typeof value === 'string'
    );

    expect(tagEntries.length).toBeGreaterThan(30);

    for (const [tagKey, slug] of tagEntries) {
      const titleKey = `AppTagTitle${tagKey.slice('AppTag'.length)}`;
      const title = types[titleKey as keyof typeof types];
      expect(typeof title).toBe('string');
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(String(title).length).toBeGreaterThan(0);
    }
  });

  it('exports representative tag/title pairs on the main barrel', () => {
    expect(main.AppTagClassification).toBe('classification');
    expect(main.AppTagTitleClassification).toBe('Classification');
    expect(main.AppTagRouting).toBe('routing');
    expect(main.AppTagTitleRouting).toBe('Routing');
  });
});

describe('App tags on create and read models (da8cf99)', () => {
  it('accepts tags on CreateAppRequest for deploy-time replacement', () => {
    const body: CreateAppRequest = {
      name: 'flux-schnell',
      tags: [AppTagClassification, 'custom-slug'],
    };
    expect(body.tags).toContain('custom-slug');
  });

  it('accepts free-form tags alongside known slugs on AppDTO', () => {
    const app: AppDTO = {
      id: 'app-1',
      short_id: 'a1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      namespace: 'acme',
      name: 'my-app',
      title: 'My App',
      description: '',
      agent_description: '',
      category: 'image',
      images: {},
      tags: ['text-to-image', 'partner-beta'],
      version_id: 'ver-1',
      status: 'active',
    };
    expect(app.tags).toEqual(['text-to-image', 'partner-beta']);
  });
});
