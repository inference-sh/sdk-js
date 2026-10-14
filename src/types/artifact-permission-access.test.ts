import * as main from '../index.js';
import {
  PermInteract,
  PermRead,
  PermUse,
  PermWrite,
  type ArtifactDTO,
  type Permission,
} from '../types.js';

/**
 * types regen ba41d0a: Permission gains interact; ArtifactDTO gains access
 * (single-read viewer level) and cover_version_id (captured cover pin).
 */
describe('Permission interact (ba41d0a)', () => {
  it('exports PermInteract from the main barrel', () => {
    expect(main.PermInteract).toBe('interact');
    expect(PermInteract).toBe('interact');
  });

  it('keeps Permission literals stable including interact between read and write', () => {
    const levels: Permission[] = [PermRead, PermInteract, PermWrite, PermUse];
    expect(levels).toEqual(['read', 'interact', 'write', 'use']);
  });

  it('documents existing read/write/use constants unchanged for regen drift', () => {
    expect([PermRead, PermWrite, PermUse]).toEqual(['read', 'write', 'use']);
    expect(main.PermRead).toBe('read');
    expect(main.PermWrite).toBe('write');
    expect(main.PermUse).toBe('use');
  });
});

describe('ArtifactDTO access and cover_version_id (ba41d0a)', () => {
  it('accepts access on single-read artifact payloads', () => {
    const dto: ArtifactDTO = {
      id: 'art-1',
      namespace: 'acme',
      name: 'dashboard',
      title: 'Dashboard',
      type: 'html',
      images: { thumbnail: '', banner: '' },
      version_id: 'ver-1',
      views: 0,
      access: PermInteract,
    };
    expect(dto.access).toBe('interact');
  });

  it('accepts cover_version_id separate from shared_version_id', () => {
    const dto: ArtifactDTO = {
      id: 'art-2',
      namespace: 'acme',
      name: 'report',
      title: 'Report',
      type: 'html',
      images: { thumbnail: '', banner: '' },
      version_id: 'ver-latest',
      shared_version_id: 'ver-published',
      cover_version_id: 'ver-cover-capture',
      views: 3,
      access: PermRead,
    };
    expect(dto.shared_version_id).toBe('ver-published');
    expect(dto.cover_version_id).toBe('ver-cover-capture');
    expect(dto.access).toBe('read');
  });
});
