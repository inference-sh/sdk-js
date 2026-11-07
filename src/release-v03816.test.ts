import { readFileSync } from 'fs';
import { join } from 'path';
import { Inference, PublicationsAPI, SandboxesAPI } from './index.js';
import type { ApiAppRunRequest, CredentialConnectResponse } from './types.js';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release d6bc004: v0.38.16 ships sandboxes + mcp listTools refresh (1ed8a2b),
 * publications API + skills text endpoints (2a94e9b), connect_url on credential
 * connect (58a34ef83), and run bodies without task metadata (95648ae / dcbb5f36b).
 */
describe('release v0.38.16 (d6bc004)', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const indexSource = readFileSync(join(__dirname, 'index.ts'), 'utf8');
  const mcpSource = readFileSync(join(__dirname, 'api/mcp-servers.ts'), 'utf8');
  const knowledgeSource = readFileSync(join(__dirname, 'api/knowledge.ts'), 'utf8');
  const writeBodiesSource = readFileSync(join(__dirname, 'api/write-bodies.ts'), 'utf8');

  it('ships version 0.38.16 with SDK_VERSION aligned to package.json', () => {
    expect(pkg.version).toBe('0.38.16');
    expect(SDK_VERSION).toBe('0.38.16');
  });

  it('exports SandboxesAPI and PublicationsAPI and wires them on Inference (1ed8a2b / 2a94e9b)', () => {
    expect(indexSource).toMatch(/readonly sandboxes: SandboxesAPI/);
    expect(indexSource).toMatch(/readonly publications: PublicationsAPI/);
    expect(indexSource).toMatch(/export \{ SandboxesAPI \}/);
    expect(indexSource).toMatch(/export \{ PublicationsAPI \}/);

    const client = new Inference({ apiKey: 'release-key' });
    expect(client.sandboxes).toBeInstanceOf(SandboxesAPI);
    expect(client.publications).toBeInstanceOf(PublicationsAPI);
    expect(typeof client.sandboxes.create).toBe('function');
    expect(typeof client.publications.create).toBe('function');
  });

  it('types CredentialConnectResponse.connect_url for CLI/agent OAuth handoff (58a34ef83)', () => {
    expect(typesSource).toMatch(/connect_url\?: string;/);
    expect(typesSource).toMatch(/ConnectURL is a short link/);

    const resp: CredentialConnectResponse = {
      auth_url: 'https://slack.com/oauth',
      connect_url: 'https://app.example.com/credentials/connect/abc123',
      instructions: 'Open the link in a browser to finish connecting.',
    };
    expect(resp.connect_url).toContain('/credentials/connect/');
  });

  it('skills text endpoints return raw file bodies via http.fetch (2a94e9b)', () => {
    expect(knowledgeSource).toMatch(/Get a skill's SKILL\.md/);
    expect(knowledgeSource).toMatch(/await response\.text\(\)/);
    expect(knowledgeSource).toMatch(/encodeURIComponent/);
    expect(knowledgeSource).toMatch(/\/files\/\$\{filePath\}/);
  });

  it('mcpServers.listTools sends refresh=1 only when refresh is true (1ed8a2b)', () => {
    expect(mcpSource).toMatch(/options\?\.refresh \? \{ params: \{ refresh: 1 \} \}/);
    expect(mcpSource).toMatch(/refresh asks the server again/);
  });

  it('ApiAppRunRequest no longer accepts task metadata; TaskMetadata removed (95648ae)', () => {
    expect(typesSource).not.toMatch(/metadata\?: TaskMetadata/);
    expect(typesSource).not.toMatch(/export interface TaskMetadata/);
    expect(typesSource).not.toMatch(/export interface TaskAction/);

    const ok: ApiAppRunRequest = { app: 'infsh/demo', input: { prompt: 'hi' } };
    expect(ok.app).toBe('infsh/demo');
  });

  it('publication write bodies narrow POST/PUT payloads (2a94e9b)', () => {
    expect(writeBodiesSource).toMatch(/export type PublicationCreateBody/);
    expect(writeBodiesSource).toMatch(/export type PublicationUpdateBody/);
    expect(indexSource).toMatch(/PublicationCreateBody/);
    expect(indexSource).toMatch(/PublicationUpdateBody/);
  });
});
