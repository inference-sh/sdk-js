import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  EngineCapabilityEgressPending,
  InterruptReasonEgressLogin,
  SandboxCredentialAsk,
  SandboxCredentialAuto,
  type CreateSandboxRequest,
  type EngineCapability,
  type InternalToolsConfig,
  type InterruptReason,
  type SandboxCredential,
  type SandboxCredentialMode,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/** types regen f871098: SandboxCredential modes, egress_pending engines, egress_login interrupts (INF-1173). */
describe('SandboxCredential and egress pending types (f871098 / INF-1173)', () => {
  it('exports SandboxCredentialMode constants on types and the main barrel', () => {
    const modes: SandboxCredentialMode[] = [SandboxCredentialAuto, SandboxCredentialAsk];
    expect(modes).toEqual(['auto', 'ask']);
    expect(main.SandboxCredentialAuto).toBe('auto');
    expect(main.SandboxCredentialAsk).toBe('ask');
  });

  it('models auto vs ask credential delivery on sandbox create payloads', () => {
    const auto: SandboxCredential = { slug: 'anthropic', scopes: ['claude'] };
    const ask: SandboxCredential = {
      slug: 'github',
      scopes: ['repo'],
      mode: SandboxCredentialAsk,
    };
    expect(auto.mode).toBeUndefined();
    expect(ask.mode).toBe('ask');

    const create: CreateSandboxRequest = { credentials: [auto, ask] };
    expect(create.credentials?.[1].mode).toBe(SandboxCredentialAsk);
  });

  it('types InternalToolsConfig.sandbox_credentials as SandboxCredential[]', () => {
    expect(typesSource).toMatch(
      /sandbox_credentials\?: SandboxCredential\[\];/,
    );
    expect(typesSource).toMatch(/Each entry's mode[\s\S]*SandboxCredentialAsk/);

    const tools: InternalToolsConfig = {
      sandbox_credentials: [{ slug: 'openai', mode: SandboxCredentialAuto }],
    };
    expect(tools.sandbox_credentials?.[0].slug).toBe('openai');
  });

  it('adds EngineCapabilityEgressPending for pending bound-secret egress', () => {
    expect(typesSource).toMatch(
      /export type EngineCapability = "egress_gateway" \| "sandboxes" \| "capacity" \| "egress_pending";/,
    );
    expect(typesSource).toMatch(
      /export const EngineCapabilityEgressPending: EngineCapability = "egress_pending";/,
    );
    expect(typesSource).toMatch(/POST \/engines\/\{id\}\/egress\/resolve/);

    const caps: EngineCapability[] = [EngineCapabilityEgressPending];
    expect(caps).toEqual(['egress_pending']);
    expect(main.EngineCapabilityEgressPending).toBe('egress_pending');
  });

  it('documents ask mode as requiring an engine with egress_pending', () => {
    expect(typesSource).toMatch(/Needs an[\s\S]*EngineCapabilityEgressPending/);
  });

  it('adds InterruptReasonEgressLogin for sandbox login approval interrupts', () => {
    expect(typesSource).toMatch(
      /export const InterruptReasonEgressLogin: InterruptReason = "egress_login";/,
    );
    expect(typesSource).toMatch(/\| "egress_login"/);

    const reasons: InterruptReason[] = [InterruptReasonEgressLogin];
    expect(reasons).toEqual(['egress_login']);
    expect(main.InterruptReasonEgressLogin).toBe('egress_login');
  });
});
