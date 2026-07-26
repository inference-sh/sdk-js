import { readFileSync } from 'fs';
import path from 'path';

import {
  AgentsAPI,
  createAgentsAPI,
  createFilesAPI,
  createTasksAPI,
  FilesAPI,
  TasksAPI,
} from './api/index';
import {
  createHttpClient,
  HttpClient,
  InferenceError,
  RequirementsNotMetException,
  streamable,
  StreamableManager,
  StreamManager,
} from './http/index';
import { Inference, createClient } from './index';

const repoRoot = process.cwd();

describe('package.json export map', () => {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
    exports: Record<string, string | { types?: string; default?: string; 'inference-src'?: string }>;
    files: string[];
  };

  it('exposes inference-src condition for workspace consumers on the main entry', () => {
    const mainExport = pkg.exports['.'];
    expect(mainExport).toMatchObject({
      types: './dist/index.d.ts',
      'inference-src': './src/index.ts',
      default: './dist/index.js',
    });
  });

  it('exposes inference-src condition for workspace consumers on the agent entry', () => {
    const agentExport = pkg.exports['./agent'];
    expect(agentExport).toMatchObject({
      types: './dist/agent/index.d.ts',
      'inference-src': './src/agent/index.ts',
      default: './dist/agent/index.js',
    });
  });

  it('excludes compiled test artifacts from the published npm tarball', () => {
    expect(pkg.files).toContain('!dist/**/*.test.*');
  });
});

describe('tsconfig isolatedModules', () => {
  it('requires type-only re-exports so per-file transpilers do not emit erased interfaces', () => {
    const tsconfig = JSON.parse(
      readFileSync(path.join(repoRoot, 'tsconfig.json'), 'utf8').replace(/\/\/.*$/gm, '')
    ) as { compilerOptions: { isolatedModules?: boolean } };

    expect(tsconfig.compilerOptions.isolatedModules).toBe(true);
  });
});

describe('barrel module runtime exports', () => {
  it('resolves http/index runtime values without type-only binding errors', () => {
    expect(typeof HttpClient).toBe('function');
    expect(typeof createHttpClient).toBe('function');
    expect(typeof StreamManager).toBe('function');
    expect(typeof StreamableManager).toBe('function');
    expect(typeof streamable).toBe('function');
    expect(typeof InferenceError).toBe('function');
    expect(typeof RequirementsNotMetException).toBe('function');

    const client = createHttpClient({ apiKey: 'test-key' });
    expect(client).toBeInstanceOf(HttpClient);
  });

  it('resolves api/index runtime values without type-only binding errors', () => {
    expect(typeof TasksAPI).toBe('function');
    expect(typeof createTasksAPI).toBe('function');
    expect(typeof FilesAPI).toBe('function');
    expect(typeof createFilesAPI).toBe('function');
    expect(typeof AgentsAPI).toBe('function');
    expect(typeof createAgentsAPI).toBe('function');

    const http = createHttpClient({ apiKey: 'test-key' });
    expect(createTasksAPI(http)).toBeInstanceOf(TasksAPI);
    expect(createFilesAPI(http)).toBeInstanceOf(FilesAPI);
    expect(createAgentsAPI(http, createFilesAPI(http))).toBeInstanceOf(AgentsAPI);
  });

  it('resolves main index runtime values that previously shared barrels with type-only exports', () => {
    expect(typeof Inference).toBe('function');
    expect(typeof createClient).toBe('function');
    expect(createClient({ apiKey: 'test-key' })).toBeInstanceOf(Inference);
  });
});
