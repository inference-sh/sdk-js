import { readFileSync } from 'fs';
import { join } from 'path';

const changelog = readFileSync(join(__dirname, '../CHANGELOG.md'), 'utf8');

/**
 * Release 0ae0233 + ffc7682: v0.23.0 stream reconnect, types regen, and
 * SendMessageOptions.channel_context deprecated (accepted, not sent on runs).
 */
describe('release v0.23.0 (0ae0233, ffc7682)', () => {
  it('documents v0.23.0 in CHANGELOG', () => {
    expect(changelog).toMatch(/## \[0\.23\.0\] - 2026-10-11/);
    expect(changelog).toMatch(/SendMessageOptions\.channel_context/);
    expect(changelog).toMatch(/still accepted and is not sent/);
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
    const indexSource = readFileSync(join(__dirname, './index.ts'), 'utf8');
    expect(indexSource).toMatch(/type StreamReconnectOptions/);
  });

  it('keeps deprecated channel_context off agent run bodies (700c6dd, ffc7682)', () => {
    const agentsSource = readFileSync(join(__dirname, './api/agents.ts'), 'utf8');
    expect(agentsSource).toMatch(/channel_context\?: ChannelContext/);
    expect(agentsSource).toMatch(/@deprecated The API no longer reads a channel context from an agent run/);
    expect(agentsSource).not.toMatch(/channel_context:\s*options\.channel_context/);
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
