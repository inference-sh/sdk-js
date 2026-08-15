import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from './index';
import { FilesAPI, resolveUpload, putToSignedUrl } from './api/files';
import { createHandler } from './proxy/remix';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as {
  exports: Record<string, { types: string; 'inference-src'?: string; default: string }>;
};

describe('package export surface', () => {
  describe('main barrel (@inferencesh/sdk)', () => {
    it('does not semver-commit resolveUpload or putToSignedUrl', () => {
      expect(main).not.toHaveProperty('resolveUpload');
      expect(main).not.toHaveProperty('putToSignedUrl');
      expect(main).not.toHaveProperty('ResolvedUpload');
    });

    it('still exports FilesAPI for the public upload API', () => {
      expect(main.FilesAPI).toBe(FilesAPI);
    });
  });

  describe('proxy remix module (@inferencesh/sdk/proxy/remix)', () => {
    it('is mapped to src/proxy/remix.ts with inference-src for dev HMR', () => {
      expect(packageJson.exports['./proxy/remix']).toEqual({
        types: './dist/proxy/remix.d.ts',
        'inference-src': './src/proxy/remix.ts',
        default: './dist/proxy/remix.js',
      });
    });

    it('exports createHandler from proxy/remix', () => {
      expect(createHandler).toEqual(expect.any(Function));
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
