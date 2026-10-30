import * as main from '../index.js';
import {
  SandboxStatusPending,
  SandboxStatusStarting,
  SandboxStatusRunning,
  SandboxStatusStopping,
  SandboxStatusStopped,
  SandboxStatusFailed,
  SandboxDesiredRunning,
  SandboxDesiredStopped,
  SandboxDesiredDeleted,
  ResourceFeatureSandboxes,
  ScopeSandboxesRead,
  ScopeSandboxesWrite,
  ScopeGroupSandboxes,
  EngineCapabilitySandboxes,
  type SandboxStatus,
  type SandboxDesiredState,
} from '../types.js';

/**
 * Managed sandbox types (INF-833): sandboxes are now open to every team.
 * Constants landed in types regen f86b4d9.
 */
describe('sandbox status types (f86b4d9)', () => {
  it('exports SandboxStatus constants from the main barrel', () => {
    expect(main.SandboxStatusPending).toBe('pending');
    expect(main.SandboxStatusStarting).toBe('starting');
    expect(main.SandboxStatusRunning).toBe('running');
    expect(main.SandboxStatusStopping).toBe('stopping');
    expect(main.SandboxStatusStopped).toBe('stopped');
    expect(main.SandboxStatusFailed).toBe('failed');
  });

  it('keeps SandboxStatus literals stable for API payloads', () => {
    const statuses: SandboxStatus[] = [
      SandboxStatusPending,
      SandboxStatusStarting,
      SandboxStatusRunning,
      SandboxStatusStopping,
      SandboxStatusStopped,
      SandboxStatusFailed,
    ];
    expect(statuses).toEqual(['pending', 'starting', 'running', 'stopping', 'stopped', 'failed']);
  });
});

describe('sandbox desired-state types (f86b4d9)', () => {
  it('exports SandboxDesiredState constants from the main barrel', () => {
    expect(main.SandboxDesiredRunning).toBe('running');
    expect(main.SandboxDesiredStopped).toBe('stopped');
    expect(main.SandboxDesiredDeleted).toBe('deleted');
  });

  it('keeps SandboxDesiredState literals stable for reconciler payloads', () => {
    const states: SandboxDesiredState[] = [
      SandboxDesiredRunning,
      SandboxDesiredStopped,
      SandboxDesiredDeleted,
    ];
    expect(states).toEqual(['running', 'stopped', 'deleted']);
  });
});

describe('sandbox entitlement resource (f86b4d9)', () => {
  it('exports ResourceFeatureSandboxes as feature:sandboxes (open to every team)', () => {
    expect(ResourceFeatureSandboxes).toBe('feature:sandboxes');
    expect(main.ResourceFeatureSandboxes).toBe('feature:sandboxes');
  });
});

describe('sandbox scopes (f86b4d9)', () => {
  it('exports sandboxes scope constants from the main barrel', () => {
    expect(ScopeSandboxesRead).toBe('sandboxes:read');
    expect(ScopeSandboxesWrite).toBe('sandboxes:write');
    expect(ScopeGroupSandboxes).toBe('sandboxes');
    expect(main.ScopeSandboxesRead).toBe('sandboxes:read');
    expect(main.ScopeSandboxesWrite).toBe('sandboxes:write');
    expect(main.ScopeGroupSandboxes).toBe('sandboxes');
  });
});

describe('sandbox engine capability (f86b4d9)', () => {
  it('exports EngineCapabilitySandboxes for engine feature detection', () => {
    expect(EngineCapabilitySandboxes).toBe('sandboxes');
    expect(main.EngineCapabilitySandboxes).toBe('sandboxes');
  });
});
