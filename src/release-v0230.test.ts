import { readFileSync } from 'fs';
import { join } from 'path';

const changelog = readFileSync(join(__dirname, '../CHANGELOG.md'), 'utf8');

/**
 * Release 0ae0233: changelog documents v0.23.0 (stream reconnect, types regen,
 * SendMessageOptions.channel_context removal, NodeNext dist from 0.22.1).
 */
describe('release v0.23.0 (0ae0233)', () => {
  it('documents v0.23.0 in CHANGELOG', () => {
    expect(changelog).toMatch(/## \[0\.23\.0\] - 2026-10-11/);
    expect(changelog).toMatch(/Breaking: `SendMessageOptions\.channel_context` is removed/);
    expect(changelog).toMatch(/`StreamableManager` reconnects on opt-in/);
    expect(changelog).toMatch(/`StreamReconnectOptions` is exported/);
    expect(changelog).toMatch(/`MessageInput`/);
    expect(changelog).toMatch(/`ApiAgentRunRequest` takes `agent_id`\/`agent_version_id` and no `channel_context`/);
    expect(changelog).toMatch(/The package loads in plain Node \(no bundler\)/);
  });

  it('exports StreamReconnectOptions from the public SDK entry', async () => {
    const sdk = await import('./index.js');
    expect(sdk.StreamReconnectOptions).toBeUndefined();
    expect(sdk.StreamableManager).toEqual(expect.any(Function));
    // Type-only export: runtime import has no value, but the type must be re-exported in index.d.ts.
    const indexSource = readFileSync(join(__dirname, './index.ts'), 'utf8');
    expect(indexSource).toMatch(/type StreamReconnectOptions/);
  });

  it('removes channel_context from SendMessageOptions and agent run bodies (700c6dd)', () => {
    const agentsSource = readFileSync(join(__dirname, './api/agents.ts'), 'utf8');
    expect(agentsSource).not.toMatch(/channel_context/);
    expect(agentsSource).toMatch(/const body: ApiAgentRunRequest = \{/);
    expect(agentsSource).toMatch(/reconcile: resync/);
    expect(agentsSource).toMatch(/A reconnect resyncs the same way/);
  });

  it('wires streamUntilTerminal reconnect and resync (686b38d)', () => {
    const source = readFileSync(join(__dirname, './http/stream-until-terminal.ts'), 'utf8');
    expect(source).toMatch(/reconnect = true/);
    expect(source).toMatch(/onReconnect: \(\) => resync\(\)/);
    expect(source).toMatch(/The stream reconnects after a network failure/);
  });

  it('exports stream reconnect defaults on StreamableManager (a183358)', () => {
    const source = readFileSync(join(__dirname, './http/streamable.ts'), 'utf8');
    expect(source).toMatch(/maxAttempts: 10/);
    expect(source).toMatch(/baseDelayMs: 1000/);
    expect(source).toMatch(/idleTimeoutMs: 30_000/);
    expect(source).toMatch(/function isRetryable\(error: Error\)/);
    expect(source).toMatch(/status !== 408 && status !== 429/);
  });
});
