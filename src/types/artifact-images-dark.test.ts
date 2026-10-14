import { readFileSync } from 'fs';
import { join } from 'path';
import { type ArtifactDTO, type ResourceImages } from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

const lightCover: ResourceImages = {
  card: 'https://cdn.test/art/card-light.png',
  thumbnail: 'https://cdn.test/art/thumb-light.png',
  banner: 'https://cdn.test/art/banner-light.png',
};

const darkCover: ResourceImages = {
  card: 'https://cdn.test/art/card-dark.png',
  thumbnail: 'https://cdn.test/art/thumb-dark.png',
  banner: 'https://cdn.test/art/banner-dark.png',
};

/**
 * types regen 8b03998: ArtifactDTO gains optional images_dark for theme-specific
 * covers when a dark capture differs from the light cover.
 */
describe('ArtifactDTO images_dark (8b03998)', () => {
  it('accepts artifacts with only light images when dark matches light', () => {
    const dto: ArtifactDTO = {
      id: 'art-light-only',
      namespace: 'acme',
      name: 'status',
      title: 'Status board',
      type: 'html',
      images: lightCover,
      version_id: 'ver-1',
      views: 12,
    };

    expect(dto.images).toEqual(lightCover);
    expect(dto).not.toHaveProperty('images_dark');
  });

  it('accepts images_dark separate from images for dark-theme covers', () => {
    const dto: ArtifactDTO = {
      id: 'art-themed',
      namespace: 'acme',
      name: 'dashboard',
      title: 'Dashboard',
      type: 'html',
      images: lightCover,
      images_dark: darkCover,
      version_id: 'ver-2',
      views: 4,
    };

    expect(dto.images).toEqual(lightCover);
    expect(dto.images_dark).toEqual(darkCover);
    expect(dto.images_dark?.card).not.toBe(dto.images.card);
  });
});

describe('types.ts regen guards for ArtifactDTO.images_dark (8b03998)', () => {
  it('declares images_dark after images on ArtifactDTO', () => {
    const block = typesSource.match(/export interface ArtifactDTO extends[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/images:\s*ResourceImages;/);
    expect(block![0]).toMatch(/images_dark\?:\s*ResourceImages;/);
    expect(block![0]).toMatch(/ImagesDark is the cover for a dark theme/);
    expect(block![0]).toMatch(/Empty means Images serve both/);
  });
});
