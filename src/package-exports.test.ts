import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from './index';
import { FilesAPI, resolveUpload, putToSignedUrl } from './api/files';
import { SDK_VERSION } from './version';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as {
  version: string;
  engines?: { node?: string };
  exports: Record<string, { types: string; 'inference-src'?: string; default: string }>;
};

describe('package export surface', () => {
  it('keeps SDK_VERSION (X-Client-Source header) in sync with package.json', () => {
    expect(SDK_VERSION).toBe(packageJson.version);
  });

  it('requires Node >=22.12 for eventsource 5 (ESM-only dependency)', () => {
    expect(packageJson.engines?.node).toBe('>=22.12.0');
  });

  describe('inference-src export conditions', () => {
    // Resolution takes the first matching key. The app typechecks with
    // customConditions ["inference-src"]; listed after "types" it never
    // matched, and the typecheck read a dist left behind by older builds.
    it('lists inference-src before types so a typecheck that asks for source gets it', () => {
      for (const [path, conditions] of Object.entries(packageJson.exports)) {
        const keys = Object.keys(conditions);
        if (!keys.includes('inference-src')) continue;
        expect([path, keys.indexOf('inference-src') < keys.indexOf('types')]).toEqual([path, true]);
      }
    });

    it('uses inference-src, types, default key order on monorepo typecheck entrypoints', () => {
      for (const path of ['.', './agent', './proxy/remix', './internal/upload']) {
        expect(Object.keys(packageJson.exports[path])).toEqual([
          'inference-src',
          'types',
          'default',
        ]);
      }
    });

    it('keeps types-first maps on npm subpaths that do not define inference-src', () => {
      for (const path of [
        './proxy',
        './proxy/nextjs',
        './proxy/express',
        './proxy/hono',
        './proxy/svelte',
      ]) {
        const keys = Object.keys(packageJson.exports[path]);
        expect(keys).toEqual(['types', 'default']);
        expect(keys).not.toContain('inference-src');
      }
    });

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

    it('exports HttpClient.fetch for StreamRequest wiring (v0.21 http)', () => {
      expect(main.HttpClient).toBeDefined();
      expect(main.createHttpClient).toEqual(expect.any(Function));
      expect(new main.HttpClient({ apiKey: 'k' }).fetch).toEqual(expect.any(Function));
    });

    it('does not export integration-named aliases removed in v0.8.0', () => {
      expect(main).not.toHaveProperty('IntegrationsAPI');
      expect(main).not.toHaveProperty('IntegrationDTO');
      expect(main).toHaveProperty('CredentialsAPI');
    });
  });

  describe('internal upload module (@inferencesh/sdk/internal/upload)', () => {
    it('is mapped to api/files in package.json exports', () => {
      expect(packageJson.exports['./internal/upload']).toEqual({
        'inference-src': './src/api/files.ts',
        types: './dist/api/files.d.ts',
        default: './dist/api/files.js',
      });
    });

    it('exports resolveUpload and putToSignedUrl from api/files', () => {
      expect(resolveUpload).toEqual(expect.any(Function));
      expect(putToSignedUrl).toEqual(expect.any(Function));
    });
  });
});
