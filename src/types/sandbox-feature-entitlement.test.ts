import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import { ResourceFeatureSandboxes } from '../types.js';

/**
 * f86b4d9: sandboxes entitlement semantics (INF-833) — open to every team;
 * a disabled entitlement row opts one team out. Sandbox API constants remain
 * on the main barrel for every SDK consumer (5097a18 / api#2001).
 */
describe('ResourceFeatureSandboxes entitlement (f86b4d9 / INF-833)', () => {
  it('exports feature:sandboxes from the main barrel', () => {
    expect(ResourceFeatureSandboxes).toBe('feature:sandboxes');
    expect(main.ResourceFeatureSandboxes).toBe('feature:sandboxes');
  });

  it('documents open-by-default sandboxes with per-team opt-out in types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    const marker = 'export const ResourceFeatureSandboxes';
    const idx = source.indexOf(marker);
    expect(idx).toBeGreaterThanOrEqual(0);
    const docStart = source.lastIndexOf('/**', idx);
    expect(docStart).toBeGreaterThanOrEqual(0);
    const doc = source.slice(docStart, idx);

    expect(doc).toMatch(/Managed sandboxes \(INF-833\): open to every team/);
    expect(doc).toMatch(/enabled[\s\S]*false shuts one team out/);
    expect(doc).not.toMatch(/invitation/i);
  });
});

describe('sandbox types on package entry (f86b4d9)', () => {
  it('re-exports sandbox scopes and lifecycle constants from index.js', () => {
    expect(main.ScopeSandboxesRead).toBe('sandboxes:read');
    expect(main.ScopeSandboxesWrite).toBe('sandboxes:write');
    expect(main.SandboxStatusPending).toBe('pending');
    expect(main.EngineCapabilitySandboxes).toBe('sandboxes');
  });
});
