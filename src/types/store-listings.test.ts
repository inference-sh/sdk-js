import { readFileSync } from 'fs';
import { join } from 'path';
import type { AppDTO, StoreCategoryDTO, StoreTagDTO } from '../index';

/**
 * types regen a6db0ce: StoreCategoryDTO and StoreTagDTO for storefront
 * listings (categories with rank/icon and tags with human titles + counts).
 */
describe('Store listing DTOs (a6db0ce)', () => {
  it('keeps StoreCategoryDTO and StoreTagDTO exported from the main barrel', () => {
    const category: StoreCategoryDTO = {
      slug: 'image',
      name: 'Image',
      description: 'Image generation and editing',
      icon: 'image',
      rank: 1,
      count: 120,
    };
    const tag: StoreTagDTO = {
      slug: 'text-to-image',
      title: 'Text to Image',
      count: 42,
    };
    expect(category.slug).toBe('image');
    expect(tag.title).toBe('Text to Image');
  });

  it('does not drop Store* DTO blocks on types regen', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(source).toMatch(/export interface StoreCategoryDTO \{/);
    expect(source).toMatch(/slug: string;\s*\n\s*name: string;/);
    expect(source).toMatch(/export interface StoreTagDTO \{/);
    expect(source).toMatch(/slug: string;\s*\n\s*title: string;/);
    expect(source).toMatch(/GET \/store\/tags lists the ones in use/);
  });

  it('parses GET /store/tags style JSON into StoreTagDTO rows', () => {
    const payload = JSON.parse(
      JSON.stringify([
        { slug: 'deep-research', title: 'Deep Research', count: 7 },
        { slug: 'social-media', title: 'Social Media', count: 19 },
      ])
    ) as StoreTagDTO[];

    expect(payload.map((row) => row.slug)).toEqual(['deep-research', 'social-media']);
    expect(payload[0].count).toBe(7);
  });

  it('parses store category listings with rank and live count', () => {
    const payload: StoreCategoryDTO[] = [
      {
        slug: 'video',
        name: 'Video',
        description: 'Video generation and enhancement',
        icon: 'video',
        rank: 2,
        count: 55,
      },
      {
        slug: 'decision',
        name: 'Decision',
        description: 'Structured evaluation apps',
        icon: 'decision',
        rank: 8,
        count: 4,
      },
    ];

    expect(payload.map((c) => c.rank)).toEqual([2, 8]);
    expect(payload[1].slug).toBe('decision');
  });

  it('uses StoreTagDTO.slug as the canonical key for AppDTO.tags slugs', () => {
    const listed: StoreTagDTO = {
      slug: 'open-weights',
      title: 'Open Weights',
      count: 3,
    };
    const app: Pick<AppDTO, 'tags'> = {
      tags: ['open-weights', 'text-to-image'],
    };

    expect(app.tags).toContain(listed.slug);
    expect(listed.title).not.toBe(listed.slug);
  });
});
