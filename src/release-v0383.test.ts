import { readFileSync } from 'fs';
import { join } from 'path';
import manifest from './proxy/endpoints.json' with { type: 'json' };
import {
  CredentialProviderGitHubApp,
  EngineCapabilityCapacity,
  type CredentialConfigDTO,
  type EngineDTO,
} from './types.js';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release d2ea7eb: v0.38.3 adds models v0.8.156 (CredentialConfigDTO.hook_url)
 * on top of v0.38.2 (143c9cf): engine capacity, github-app provider, app_noun,
 * security overrides, and retained 0.38.1 contracts.
 */
describe('release v0.38.3 (d2ea7eb)', () => {
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const agentApiSource = readFileSync(join(__dirname, 'agent/api.ts'), 'utf8');
  const agentsApiSource = readFileSync(join(__dirname, 'api/agents.ts'), 'utf8');
  const workspaceYaml = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');

  it('ships version 0.38.3 with SDK_VERSION aligned to package.json', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.38.3');
    expect(SDK_VERSION).toBe('0.38.3');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.38\.0\] - 2026-10-29/);
    expect(changelog).toMatch(/POST \/chats\/\{id\}\/messages\/list/);
  });

  it('adds CredentialConfigDTO.hook_url for webhook paste copy (5e54d38 / v0.8.156)', () => {
    expect(typesSource).toMatch(/hook_url\?: string;/);
    expect(typesSource).toMatch(
      /HookURL is where App delivers its events \(the GitHub App's webhook/,
    );

    const config: CredentialConfigDTO = {
      slug: 'github-app',
      provider: CredentialProviderGitHubApp,
      type: 'oauth',
      name: 'GitHub App',
      short_name: 'GitHub App',
      description: 'Install a GitHub App',
      allows_byok: false,
      available: true,
      has_managed: true,
      connection_scope: 'team',
      app_noun: 'GitHub App',
      hook_url: 'https://hooks.inference.sh/w/gh-app/team-abc',
    };
    expect(config.hook_url).toBe('https://hooks.inference.sh/w/gh-app/team-abc');
  });

  it('adds CredentialConfigDTO.app_noun for non-OAuth install apps (00724ff / v0.8.155)', () => {
    expect(typesSource).toMatch(/app_noun\?: string;/);
    expect(typesSource).toMatch(/AppNoun is what that app is called \("GitHub App"\)/);

    const config: CredentialConfigDTO = {
      slug: 'github-app',
      provider: CredentialProviderGitHubApp,
      type: 'oauth',
      name: 'GitHub App',
      short_name: 'GitHub App',
      description: 'Install a GitHub App',
      allows_byok: false,
      available: true,
      has_managed: true,
      connection_scope: 'team',
      app_noun: 'GitHub App',
    };
    expect(config.app_noun).toBe('GitHub App');
  });

  it('adds github-app as a distinct credential provider slug (7fb28ac / v0.8.154)', () => {
    expect(typesSource).toMatch(/\| "github-app"/);
    expect(typesSource).toMatch(
      /export const CredentialProviderGitHubApp: CredentialProvider = "github-app";/,
    );
    expect(CredentialProviderGitHubApp).toBe('github-app');
  });

  it('adds engine capacity telemetry types (1aaf44d / INF-1156)', () => {
    expect(typesSource).toMatch(
      /export type EngineCapability = "egress_gateway" \| "sandboxes" \| "capacity";/,
    );
    expect(typesSource).toMatch(
      /export const EngineCapabilityCapacity: EngineCapability = "capacity";/,
    );
    expect(typesSource).toMatch(/capacity\?: EngineCapacity;/);
    expect(EngineCapabilityCapacity).toBe('capacity');

    const engine = {
      id: 'eng-1',
      name: 'worker-pool',
      workers: [],
      capacity: {
        cpus: 8,
        cores: 4,
        memory_bytes: 16_000_000_000,
        disk_bytes: 500_000_000_000,
        disk_free_bytes: 200_000_000_000,
        reserve: { cpus: 0.5, memory_bytes: 1_000_000_000 },
        allocatable: { cpus: 7, memory_bytes: 14_000_000_000 },
        committed: { cpus: 2, memory_bytes: 4_000_000_000 },
        used: { cpus: 1.5, memory_bytes: 3_000_000_000 },
      },
    } satisfies Pick<EngineDTO, 'id' | 'name' | 'workers' | 'capacity'>;
    expect(engine.capacity?.allocatable.cpus).toBe(7);
  });

  it('keeps security dev-dependency overrides from 29fc57c', () => {
    expect(workspaceYaml).toMatch(/'vite@>=8\.2\.0 <8\.2\.4': \^8\.2\.4/);
    expect(workspaceYaml).toMatch(/'body-parser@>=2\.0\.0 <2\.4\.0': \^2\.4\.0/);
  });

  it('retains 0.38.1 Infra and RunEndReason contracts (343be12, 25db234)', () => {
    expect(typesSource).toMatch(
      /export type Infra = "private" \| "cloud" \| "private_first";/,
    );
    expect(typesSource).not.toMatch(/export const InfraRemote/);
    expect(typesSource).toMatch(
      /export type RunEndReason = "output_limit" \| "no_reply" \| "refusal";/,
    );
    expect(typesSource).toMatch(/export const RunEndReasonRefusal: RunEndReason = "refusal";/);
  });

  it('still reads chat messages via POST /chats/{id}/messages/list in clients and proxy', () => {
    const postList = manifest.endpoints.find(
      (e) => e.method === 'POST' && e.path === '/chats/{id}/messages/list',
    );
    expect(postList?.scopes).toEqual(['conversations:read']);

    expect(agentApiSource).toMatch(
      /client\.http\.request<FetchMessagesResult>\('post', `\/chats\/\$\{chatId\}\/messages\/list`/,
    );
    expect(agentsApiSource).toMatch(
      /this\.http\.request<CursorListResponse<ChatMessageDTO>>\('post', `\/chats\/\$\{chatId\}\/messages\/list`/,
    );
  });
});
