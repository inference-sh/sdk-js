import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release 6aca295 / changelog 0.33.0: documents streamed reasoning,
 * model_capabilities, waiting-run semantics, proxy cancel scope, and
 * generated types shipped across 72736e2–57a64b9 on dev.
 */
describe('release v0.33.0 (6aca295)', () => {
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const reducerSource = readFileSync(join(__dirname, 'agent/reducer.ts'), 'utf8');
  const apiSource = readFileSync(join(__dirname, 'agent/api.ts'), 'utf8');
  const utilsSource = readFileSync(join(__dirname, 'utils.ts'), 'utf8');
  const endpointsJson = readFileSync(join(__dirname, 'proxy/endpoints.json'), 'utf8');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

  it('ships version 0.33.0 with an empty Unreleased section and a dated 0.33.0 changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.33.0');
    expect(SDK_VERSION).toBe('0.33.0');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.33\.0\] - 2026-10-24/);
    expect(changelog).toMatch(/`AuthResponse\.otp_method` is gone.*`otp_methods`/);
    expect(changelog).toMatch(/streamed reasoning as it arrives/i);
    expect(changelog).toMatch(/`AgentInfo\.model_capabilities`/);
    expect(changelog).toMatch(/`isRunWaiting\(run\)`/);
    expect(changelog).toMatch(/cancelling a queued message needs `conversations:write` only/i);
    expect(changelog).toMatch(/## \[0\.32\.0\] - 2026-10-20/);
  });

  it('replaces AuthResponse.otp_method with otp_methods (SecondFactor[])', () => {
    expect(typesSource).toMatch(/otp_methods\?: SecondFactor\[\]/);
    expect(typesSource).not.toMatch(/otp_method\?:/);
    expect(typesSource).toContain('export type SecondFactor = "totp" | "passkey" | "recovery" | "email"');
    expect(typesSource).toContain('export const ErrorCodeLastAuthenticator');
  });

  it('streams reasoning in the agent reducer alongside response text', () => {
    expect(reducerSource).toContain('ChatMessageContentTypeReasoning');
    expect(reducerSource).toMatch(/field: 'reasoning'/);
    expect(reducerSource).toMatch(/function applyStreamedOutput/);
    expect(reducerSource).toMatch(/function keepStreamedBlocks/);
    expect(reducerSource).toMatch(/isRunWaiting\(run\)/);
    expect(reducerSource).toContain('ChatStatusWaiting');
  });

  it('maps model_capabilities from the agent core app version metadata', () => {
    expect(apiSource).toMatch(/version\?\.core_app\?\.app\?\.version\?\.metadata\?\.capabilities/);
    expect(apiSource).toMatch(/model_capabilities: Array\.isArray\(capabilities\) \? capabilities : undefined/);
  });

  it('treats agent wait interrupts as open turns, not human-awaiting', () => {
    expect(utilsSource).toMatch(/export function isRunWaiting/);
    expect(utilsSource).toMatch(/interrupt_reason === InterruptReasonWait/);
    expect(utilsSource).toMatch(/isRunInterrupted\(run\.state\) && !isRunWaiting\(run\)/);
  });

  it('documents message cancel on the proxy as conversations:write only', () => {
    const endpoints = JSON.parse(endpointsJson) as {
      endpoints: Array<{ method: string; path: string; scopes?: string[] }>;
    };
    const cancel = endpoints.endpoints.find(
      (e) => e.method === 'POST' && e.path === '/chats/messages/{messageId}/cancel',
    );
    expect(cancel?.scopes).toEqual(['conversations:write']);
  });

  it('exports 0.33.0 type constants from the package entry', async () => {
    const sdk = await import('./index.js');
    expect(sdk.ChatEventTypeRunEnded).toBe('run_ended');
    expect(sdk.ChatEventTypeRunFailed).toBe('run_failed');
    expect(sdk.RunEndReasonOutputLimit).toBe('output_limit');
    expect(sdk.InfraRemote).toBe('remote');
    expect(sdk.ChatStatusWaiting).toBe('waiting');
    expect(sdk.ToolInvocationStatusWaiting).toBe('waiting');
    expect(sdk.ScopeContentWrite).toBe('content:write');
    expect(sdk.SecondFactorTOTP).toBe('totp');
    expect(typeof sdk.isRunWaiting).toBe('function');
  });
});
