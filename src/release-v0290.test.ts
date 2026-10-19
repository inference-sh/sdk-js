import { readFileSync } from 'fs';
import { join } from 'path';
import { Inference } from './index.js';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release 5e6c8af / changelog: v0.29.0 bundles INF-1079 step 3b
 * (auth_provider_id, provider_info removed), engine release targets and
 * capabilities, compaction_meta types, partial stream merge + streamed-text
 * fix, and read retries (cc7d393, 25cc540, a1ada3e, fc2a9d1, af4fc95).
 */
describe('release v0.29.0 (5e6c8af)', () => {
  it('ships version 0.29.0 and documents the release in CHANGELOG', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.29.0');
    expect(SDK_VERSION).toBe('0.29.0');

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.29\.0\]/);
    expect(changelog).toMatch(/## \[0\.29\.0\] - 2026-10-17/);
    expect(changelog).toMatch(/`CredentialConfigDTO\.provider_info` is gone/);
    expect(changelog).toMatch(/`auth_provider_id`/);
    expect(changelog).toMatch(/`EngineDTO\.capabilities`/);
    expect(changelog).toMatch(/Partial chat and run stream updates merge instead of replacing/);
    expect(changelog).toMatch(/streamed text never blinks back to an older copy/);
    expect(changelog).toMatch(/A read that got no response is sent again, twice/);

    expect(changelog).toMatch(/## \[0\.28\.0\] - 2026-10-15/);
  });

  it('exposes engine release channel helpers on Inference.engines', () => {
    const client = new Inference({ apiKey: 'release-key' });
    expect(typeof client.engines.updateBinary).toBe('function');
    expect(typeof client.engines.releases).toBe('function');
    expect(client.engines.updateBinary.length).toBeGreaterThanOrEqual(1);
  });
});

describe('source guards for v0.29.0 behavior', () => {
  it('CredentialConfigDTO uses auth_provider_id and no longer carries provider_info (INF-1079 step 3b)', () => {
    const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
    expect(typesSource).toMatch(/auth_provider_id\?: string/);
    expect(typesSource).not.toMatch(/auth_scheme_id/);
    expect(typesSource).not.toMatch(/provider_info/);
  });

  it('partial chat stream updates merge via applyChatUpdate instead of replacing', () => {
    const reducerSource = readFileSync(join(__dirname, 'agent', 'reducer.ts'), 'utf8');
    expect(reducerSource).toMatch(/export function applyChatUpdate\(/);
    expect(reducerSource).toMatch(/function mergeFields</);
    expect(reducerSource).toMatch(/if \(!fields\) return update/);

    const actionsSource = readFileSync(join(__dirname, 'agent', 'actions.ts'), 'utf8');
    expect(actionsSource).toMatch(/applyChatUpdate\(getState\(\)\.chat, chatData, fields\)/);
    expect(actionsSource).toMatch(/addEventListener<AgentRunDTO>\('agent_runs'[\s\S]*if \(fields\) return/);
  });

  it('streamed assistant text keeps the longer in-flight copy (a1ada3e)', () => {
    const reducerSource = readFileSync(join(__dirname, 'agent', 'reducer.ts'), 'utf8');
    expect(reducerSource).toMatch(/function keepStreamedText\(/);
    expect(reducerSource).toMatch(/!shown\.startsWith\(incoming\.text\)/);
    expect(reducerSource).toMatch(/isMessageTerminal\(updated\.status\)/);
  });

  it('GET and HEAD reads retry twice after network TypeErrors (cc7d393)', () => {
    const httpSource = readFileSync(join(__dirname, 'http', 'client.ts'), 'utf8');
    expect(httpSource).toMatch(/NETWORK_RETRY_DELAYS_MS = \[300, 1000\]/);
    expect(httpSource).toMatch(/function fetchRetryingReads\(/);
    expect(httpSource).toMatch(/return fetchRetryingReads\(input, init, attempt \+ 1\)/);
  });

  it('engines client posts optional release targets and lists channel heads (fc2a9d1)', () => {
    const enginesSource = readFileSync(join(__dirname, 'api', 'engines.ts'), 'utf8');
    expect(enginesSource).toMatch(/async updateBinary\(engineId: string, version\?: string\)/);
    expect(enginesSource).toMatch(/`\/engines\/\$\{engineId\}\/update`/);
    expect(enginesSource).toMatch(/async releases\(\)/);
    expect(enginesSource).toMatch(/'get', '\/engines\/releases'/);
  });

  it('generated types export EngineCapability and CompactionMeta (af4fc95, a1cbcb4)', () => {
    const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
    expect(typesSource).toMatch(/export type EngineCapability/);
    expect(typesSource).toMatch(/capabilities\?: EngineCapabilities/);
    expect(typesSource).toMatch(/export interface CompactionMeta/);
    expect(typesSource).toMatch(/compaction_meta\?: CompactionMeta/);
  });

  it('pollUntilIdle still rejects when PollManager gives up (carried from 0.28.0)', () => {
    const pollSource = readFileSync(join(__dirname, 'http', 'poll.ts'), 'utf8');
    expect(pollSource).toMatch(/onStop\?: \(error\?: Error\) => void/);
    expect(pollSource).toMatch(/this\.options\.onStop\?\.\(error\)/);

    const agentsSource = readFileSync(join(__dirname, 'api', 'agents.ts'), 'utf8');
    expect(agentsSource).toMatch(/onStop: \(error\) => \{[\s\S]*reject\(error\)/);
  });
});
