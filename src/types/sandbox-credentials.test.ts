import * as main from '../index.js';
import {
  SandboxCredentialAuto,
  SandboxCredentialAsk,
  InterruptReasonEgressLogin,
  EngineCapabilityEgressPending,
  type SandboxCredentialMode,
} from '../types.js';

describe('sandbox credential types (f871098)', () => {
  it('exports SandboxCredentialAuto as "auto"', () => {
    expect(SandboxCredentialAuto).toBe('auto');
    expect(main.SandboxCredentialAuto).toBe('auto');
  });

  it('exports SandboxCredentialAsk as "ask"', () => {
    expect(SandboxCredentialAsk).toBe('ask');
    expect(main.SandboxCredentialAsk).toBe('ask');
  });

  it('keeps SandboxCredentialMode string literals stable', () => {
    const modes: SandboxCredentialMode[] = [SandboxCredentialAuto, SandboxCredentialAsk];
    expect(modes).toEqual(['auto', 'ask']);
  });

  it('exports InterruptReasonEgressLogin as "egress_login"', () => {
    expect(InterruptReasonEgressLogin).toBe('egress_login');
    expect(main.InterruptReasonEgressLogin).toBe('egress_login');
  });

  it('exports EngineCapabilityEgressPending as "egress_pending"', () => {
    expect(EngineCapabilityEgressPending).toBe('egress_pending');
    expect(main.EngineCapabilityEgressPending).toBe('egress_pending');
  });
});
