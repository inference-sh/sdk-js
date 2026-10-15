import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Releases c386d18 + 532f102: v0.28.0 documents INF-1079 credentials vocabulary
 * (AuthMethod*, Company*), pollUntilIdle rejecting after PollManager gives up
 * (99075b7), and workspace dependency hygiene (75be627, 54b7ce1).
 */
describe('release v0.28.0 (532f102)', () => {
  it('ships version 0.28.0 and documents the release in CHANGELOG', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.28.0');
    expect(SDK_VERSION).toBe('0.28.0');

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.28\.0\]/);
    expect(changelog).toMatch(/## \[0\.28\.0\] - 2026-10-15/);
    expect(changelog).toMatch(/INF-1079/);
    expect(changelog).toMatch(/AuthMethod/);
    expect(changelog).toMatch(/Company\*/);
    expect(changelog).toMatch(/`pollUntilIdle` rejects once/);
    expect(changelog).toMatch(/`sendMessage\(\{ stream: false \}\)` no longer hangs forever/);
    expect(changelog).toMatch(/allowBuilds/);

    expect(changelog).toMatch(/## \[0\.27\.0\] - 2026-10-13/);
  });
});

describe('source guards for v0.28.0 behavior', () => {
  it('PollManager passes the last error to onStop when maxRetries is exhausted', () => {
    const pollSource = readFileSync(join(__dirname, 'http', 'poll.ts'), 'utf8');
    expect(pollSource).toMatch(/onStop\?: \(error\?: Error\) => void/);
    expect(pollSource).toMatch(/this\.options\.onStop\?\.\(error\)/);
  });

  it('Agent.pollUntilIdle rejects from onStop when polling gives up (99075b7)', () => {
    const agentsSource = readFileSync(join(__dirname, 'api', 'agents.ts'), 'utf8');
    expect(agentsSource).toMatch(/private pollUntilIdle\(/);
    expect(agentsSource).toMatch(
      /return new Promise<void>\(\(resolve, reject\) => \{[\s\S]*onStop: \(error\) => \{[\s\S]*reject\(error\)/,
    );
    expect(agentsSource).toMatch(/this\.poller = poller;\s*\n\s*poller\.start\(\)/);
  });

  it('types.ts documents CompanySummary on CredentialConfigDTO (INF-1079)', () => {
    const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
    expect(typesSource).toMatch(/export interface CompanySummary/);
    expect(typesSource).toMatch(/company\?: CompanySummary/);
    expect(typesSource).not.toMatch(/export interface ProviderSummary/);
    expect(typesSource).not.toMatch(/export type AuthSchemeKind/);
  });
});
