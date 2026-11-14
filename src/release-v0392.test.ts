import { readFileSync } from 'fs';
import { join } from 'path';
import { Inference, SandboxesAPI } from './index.js';
import type { SandboxLimits, SandboxExecResult } from './api/sandboxes.js';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release dae72bd: v0.39.2 ships the SandboxesAPI client (exec with remote
 * cache and held-wait problem bodies, file list/import/export, limits DTO),
 * HttpClient problem+json under HTTP 200 for held requests, and FilesAPI.upload
 * dropping the record when storage PUT fails (cdb8732..0b3c34a on top of
 * 0.39.1 types batches).
 */
describe('release v0.39.2 (dae72bd)', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
  const sandboxesSource = readFileSync(join(__dirname, 'api/sandboxes.ts'), 'utf8');
  const filesSource = readFileSync(join(__dirname, 'api/files.ts'), 'utf8');
  const clientSource = readFileSync(join(__dirname, 'http/client.ts'), 'utf8');
  const indexSource = readFileSync(join(__dirname, 'index.ts'), 'utf8');

  it('ships version 0.39.2 with SDK_VERSION aligned to package.json', () => {
    expect(pkg.version).toBe('0.39.2');
    expect(SDK_VERSION).toBe('0.39.2');
  });

  it('exports sandbox exec, file, and limits types from the main barrel', () => {
    const limits: SandboxLimits = {
      limits: [
        {
          resource: 'sandboxes',
          label: 'Sandboxes',
          type: 'limit',
          usage: 1,
          limit: 5,
          unlimited: false,
          enabled: true,
          mode: 'block',
        },
      ],
      vcpus_per_sandbox: { default: 2, max: 8 },
      memory_mib: { default: 2048, max: 16384 },
      disk_mib: { default: 10240, max: 102400 },
      idle_timeout_default: 900,
      idle_timeout_min: 60,
      idle_timeout_max: 86400,
      disk_kept_for: 604800,
    };
    expect(limits.limits[0].resource).toBe('sandboxes');
    expect(typeof SandboxesAPI).toBe('function');

    const done: SandboxExecResult = {
      run: { id: 'ex1', status: 'exited', exit_code: 0 },
      done: true,
      stdout: '',
      stderr: '',
    };
    expect(done.done).toBe(true);
  });

  it('wires Inference.sandboxes with the shared FilesAPI (read/write need storage cleanup)', () => {
    expect(indexSource).toMatch(/this\.sandboxes = new SandboxesAPI\(this\.http, this\.files\)/);
    const client = new Inference({ apiKey: 'release-key' });
    expect(client.sandboxes).toBeInstanceOf(SandboxesAPI);
  });

  it('SandboxesAPI implements exec remote cache, file transfer, and entitlement limits()', () => {
    expect(sandboxesSource).toMatch(/async exec\(/);
    expect(sandboxesSource).toMatch(/remoteIds/);
    expect(sandboxesSource).toMatch(/EXEC_RUN_FINISHED/);
    expect(sandboxesSource).toMatch(/async limits\(\)/);
    expect(sandboxesSource).toMatch(/limits: SandboxResourceUsage\[\]/);
    expect(sandboxesSource).toMatch(/async importFile\(/);
    expect(sandboxesSource).toMatch(/async exportFile\(/);
    expect(sandboxesSource).toMatch(/readFile needs the files API/);
    expect(sandboxesSource).not.toMatch(/\brunning:\s*number/);
    expect(sandboxesSource).not.toMatch(/\bvcpus:\s*number/);
  });

  it('FilesAPI.upload drops the server record when the storage PUT fails (cdb8732)', () => {
    expect(filesSource).toMatch(/await this\.delete\(file\.id\)\.catch/);
    expect(filesSource).toMatch(/putToSignedUrl/);
  });

  it('HttpClient treats RFC 9457 problem bodies under HTTP 200 as errors (0ca1096)', () => {
    expect(clientSource).toMatch(/held request \(exec wait, file import\/export\)/);
    expect(clientSource).toMatch(/problemStatus\(data\)/);
  });
});
