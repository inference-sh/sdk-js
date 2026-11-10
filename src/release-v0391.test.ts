import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from './index.js';
import {
  EngineCapabilitySandboxSnapshots,
  ScopeCategoryResources,
  ScopeRemotesWrite,
  type ScopesResponse,
} from './types.js';
import { SDK_VERSION } from './version.js';
import manifest from './proxy/endpoints.json' with { type: 'json' };

const root = join(__dirname, '..');

/**
 * Release 43d9a66: v0.39.1 is a types and proxy-manifest patch on 0.39.0.
 * Regenerated OpenAPI types ship sandbox limits, snapshots, ports, files,
 * plan entitlements, engine capacity policy, credential scheme hosts, idle
 * timeouts, disk retention, scope categories, and host CPU introspection
 * (5e1317b..1895abb). Proxy manifest adds remotes:write on agent routes
 * (f638f0b / api#2286).
 */
describe('release v0.39.1 (43d9a66)', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const sandboxesSource = readFileSync(join(__dirname, 'api/sandboxes.ts'), 'utf8');

  it('ships version 0.39.1 with SDK_VERSION aligned to package.json', () => {
    expect(pkg.version).toBe('0.39.1');
    expect(SDK_VERSION).toBe('0.39.1');
  });

  it('exports sandbox platform symbols from the main barrel (5e1317b types batch)', () => {
    expect(main.EngineCapabilitySandboxSnapshots).toBe(EngineCapabilitySandboxSnapshots);
    expect(main.ScopeRemotesWrite).toBe(ScopeRemotesWrite);
    expect(main.ScopeCategoryResources).toBe(ScopeCategoryResources);

    const scopes: ScopesResponse = {
      groups: [],
      account_groups: [],
      categories: [
        {
          id: ScopeCategoryResources,
          title: 'Resources',
          description: 'Models, sandboxes, and files',
        },
      ],
    };
    expect(scopes.categories[0].id).toBe('resources');
    expect(typesSource).toMatch(/GET \/sandboxes\/limits/);
    expect(typesSource).toMatch(/POST \/sandboxes\/\{id\}\/snapshots/);
    expect(typesSource).toMatch(/SandboxPortRequest opens a sandbox's port/);
  });

  it('documents AuthMethod.hosts on credential schemes for egress binding (1895abb)', () => {
    expect(typesSource).toMatch(/authmethod\.HostBinder/);
    expect(typesSource).toMatch(/hosts\?: string\[\]/);
  });

  it('regenerated proxy manifest carries remotes:write on agent chat/message routes (f638f0b)', () => {
    const withWrite = manifest.endpoints
      .filter((e) => (e as { also?: string[] }).also?.includes('remotes:write'))
      .map((e) => `${e.method} ${e.path}`)
      .sort();
    expect(withWrite).toEqual([
      'POST /agents/run',
      'POST /chats/{id}/messages',
      'POST /chats/{id}/stop',
    ]);
  });

  it('SandboxesAPI forwards create bodies but start is still id-only until client methods land', () => {
    expect(sandboxesSource).toMatch(/CreateSandboxRequest/);
    expect(sandboxesSource).toMatch(/async start\(id: string\)/);
    expect(sandboxesSource).not.toMatch(/StartSandboxRequest/);
    expect(sandboxesSource).not.toMatch(/UpdateSandboxRequest/);
  });
});
