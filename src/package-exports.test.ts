import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from './index';
import { FilesAPI, resolveUpload, putToSignedUrl } from './api/files';

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

    it('exports Response type for V3 API envelope access', () => {
      // Type-only export — verify it is part of the public barrel without
      // pulling in runtime values.
      type ExportedResponse = import('./index').Response<{ id: string }>;
      const sample: ExportedResponse = { data: { id: 'x' }, messages: [] };
      expect(sample.data.id).toBe('x');
      expect(sample.messages).toEqual([]);
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
