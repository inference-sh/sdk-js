import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from './index';
import { FilesAPI, resolveUpload, putToSignedUrl } from './api/files';
import { DeltaAccumulator } from './delta';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as {
  exports: Record<string, { types: string; 'inference-src'?: string; default: string }>;
};

describe('package export surface', () => {
  describe('inference-src export conditions', () => {
    it('maps main barrel, agent, remix proxy, and internal upload to source files', () => {
      expect(packageJson.exports['.']).toEqual(
        expect.objectContaining({
          types: './dist/index.d.ts',
          'inference-src': './src/index.ts',
          default: './dist/index.js',
        })
      );
      expect(packageJson.exports['./agent']).toEqual(
        expect.objectContaining({
          types: './dist/agent/index.d.ts',
          'inference-src': './src/agent/index.ts',
          default: './dist/agent/index.js',
        })
      );
      expect(packageJson.exports['./proxy/remix']).toEqual(
        expect.objectContaining({
          types: './dist/proxy/remix.d.ts',
          'inference-src': './src/proxy/remix.ts',
          default: './dist/proxy/remix.js',
        })
      );
      expect(packageJson.exports['./internal/upload']).toEqual(
        expect.objectContaining({
          types: './dist/api/files.d.ts',
          'inference-src': './src/api/files.ts',
          default: './dist/api/files.js',
        })
      );
    });
  });

  describe('main barrel (@inferencesh/sdk)', () => {
    it('does not semver-commit resolveUpload or putToSignedUrl', () => {
      expect(main).not.toHaveProperty('resolveUpload');
      expect(main).not.toHaveProperty('putToSignedUrl');
      expect(main).not.toHaveProperty('ResolvedUpload');
    });

    it('still exports FilesAPI for the public upload API', () => {
      expect(main.FilesAPI).toBe(FilesAPI);
    });

    it('exports DeltaAccumulator for streaming LLM output assembly', () => {
      expect(main.DeltaAccumulator).toBe(DeltaAccumulator);
    });
  });

  describe('internal upload module (@inferencesh/sdk/internal/upload)', () => {
    it('is mapped to api/files in package.json exports', () => {
      expect(packageJson.exports['./internal/upload']).toEqual({
        types: './dist/api/files.d.ts',
        'inference-src': './src/api/files.ts',
        default: './dist/api/files.js',
      });
    });

    it('exports resolveUpload and putToSignedUrl from api/files', () => {
      expect(resolveUpload).toEqual(expect.any(Function));
      expect(putToSignedUrl).toEqual(expect.any(Function));
    });
  });
});
