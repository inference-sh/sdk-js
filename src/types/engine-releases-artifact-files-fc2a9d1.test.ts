import type {
  ArtifactFileInput,
  ArtifactVersionFileDTO,
  EngineRelease,
  EngineReleasesResponse,
  EngineUpdateRequest,
} from '../types.js';

/**
 * Engine release channels (fc2a9d1) and multi-file artifact publishes ship as
 * regenerated DTOs — guard assignability for SDK consumers.
 */
describe('Engine releases and artifact companion files (fc2a9d1)', () => {
  it('accepts channel names, pins, and companion file metadata', () => {
    const liftPin: EngineUpdateRequest = {};
    const stable: EngineUpdateRequest = { version: 'stable' };
    const canary: EngineUpdateRequest = { version: 'canary' };
    const pinned: EngineUpdateRequest = { version: 'v1.9.3' };

    const release: EngineRelease = { version: 'v1.9.2', release_date: '2026-10-01' };
    const channels: EngineReleasesResponse = {
      stable: release,
      canary: { version: 'v1.9.3-canary.0' },
    };

    const publishFile: ArtifactFileInput = {
      path: 'styles.css',
      content: 'body{}',
      content_encoding: 'base64',
    };
    const versionFile: ArtifactVersionFileDTO = {
      path: 'styles.css',
      size_bytes: 6,
      content_type: 'text/css',
    };

    expect([liftPin, stable, canary, pinned].map((b) => b.version ?? null)).toEqual([
      null,
      'stable',
      'canary',
      'v1.9.3',
    ]);
    expect(channels.canary?.version).toBe('v1.9.3-canary.0');
    expect(publishFile.content_encoding).toBe('base64');
    expect(versionFile.content_type).toBe('text/css');
  });
});
