import * as main from '../index';
import * as types from '../types';
import {
  AppCategoryDecision,
  AppTagDeepResearch,
  AppTagEvaluation,
  AppTagMediaUtilities,
  AppTagMessaging,
  AppTagProductivity,
  AppTagRendering,
  AppTagResearchPapers,
  AppTagSocialMedia,
  AppTagVideoEnhancement,
  AppTagTitleDeepResearch,
  AppTagTitleEvaluation,
  type AppDTO,
  type CreateAppRequest,
} from '../types';

/** Slugs dropped from the known AppTag list in 415fbfd (still valid on app payloads). */
const DEMOTED_TAG_SLUGS = [
  'virtual-try-on',
  'face-swap',
  'video-captions',
  'speech-to-speech',
  'video-to-audio',
  'dubbing',
  'text-to-3d',
  'image-to-3d',
  'ocr',
  'embeddings',
] as const;

const REMOVED_TAG_CONSTANTS = [
  'AppTagVirtualTryOn',
  'AppTagFaceSwap',
  'AppTagVideoCaptions',
  'AppTagSpeechToSpeech',
  'AppTagVideoToAudio',
  'AppTagDubbing',
  'AppTagTextTo3D',
  'AppTagImageTo3D',
  'AppTagOCR',
  'AppTagEmbeddings',
  'AppTagTitleVirtualTryOn',
  'AppTagTitleOCR',
  'AppTagTitleEmbeddings',
] as const;

/**
 * types regen 415fbfd: curated AppTag list (3+ public apps); paired AppTagTitle exports.
 */
describe('Known AppTag list (415fbfd)', () => {
  it('exports exactly 42 AppTag slug constants with paired AppTagTitle constants', () => {
    const tagEntries = Object.entries(types).filter(
      ([key, value]) =>
        key.startsWith('AppTag') &&
        !key.startsWith('AppTagTitle') &&
        typeof value === 'string'
    );

    expect(tagEntries).toHaveLength(42);

    for (const [tagKey, slug] of tagEntries) {
      const titleKey = `AppTagTitle${tagKey.slice('AppTag'.length)}`;
      const title = types[titleKey as keyof typeof types];
      expect(typeof title).toBe('string');
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(String(title).length).toBeGreaterThan(0);
    }
  });

  it('exports newly promoted marketplace tags on the main barrel', () => {
    expect(main.AppTagVideoEnhancement).toBe('video-enhancement');
    expect(main.AppTagTitleVideoEnhancement).toBe('Video Enhancement');
    expect(main.AppTagDeepResearch).toBe('deep-research');
    expect(main.AppTagTitleDeepResearch).toBe('Deep Research');
    expect(main.AppTagResearchPapers).toBe('research-papers');
    expect(main.AppTagSocialMedia).toBe('social-media');
    expect(main.AppTagMessaging).toBe('messaging');
    expect(main.AppTagProductivity).toBe('productivity');
    expect(main.AppTagMediaUtilities).toBe('media-utilities');
    expect(main.AppTagRendering).toBe('rendering');
    expect(main.AppTagEvaluation).toBe('evaluation');
    expect(main.AppTagTitleEvaluation).toBe('Evaluation');
  });

  it('removes demoted slugs from named AppTag exports', () => {
    for (const key of REMOVED_TAG_CONSTANTS) {
      expect(main).not.toHaveProperty(key);
      expect(types).not.toHaveProperty(key);
    }
  });

  it('still accepts demoted slugs as free-form tags on AppDTO', () => {
    const app: AppDTO = {
      id: 'app-legacy-tags',
      short_id: 'leg1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'public',
      namespace: 'acme',
      name: 'legacy-app',
      title: 'Legacy App',
      description: '',
      agent_description: '',
      category: 'image',
      images: {},
      tags: [...DEMOTED_TAG_SLUGS],
      version_id: 'ver-1',
      status: 'active',
    };
    expect(app.tags).toEqual([...DEMOTED_TAG_SLUGS]);
  });
});

describe('App category and deploy tags (415fbfd baseline)', () => {
  it('exports AppCategoryDecision on types and the main barrel', () => {
    expect(AppCategoryDecision).toBe('decision');
    expect(main.AppCategoryDecision).toBe('decision');
  });

  it('forwards known and custom tags on CreateAppRequest', () => {
    const body: CreateAppRequest = {
      name: 'research-agent',
      category: AppCategoryDecision,
      tags: [
        AppTagDeepResearch,
        AppTagEvaluation,
        AppTagProductivity,
        'partner-beta',
      ],
    };
    expect(body.category).toBe('decision');
    expect(body.tags).toEqual([
      'deep-research',
      'evaluation',
      'productivity',
      'partner-beta',
    ]);
  });
});
