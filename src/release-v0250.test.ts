import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release 96dca9f / changelog 5e4d90e: v0.25.0 ships models v0.8.95 types
 * (device auth slow_down, scope/confirmation errors, prompt-cache token fields).
 */
describe('release v0.25.0 (96dca9f)', () => {
  it('ships version 0.25.0 and documents 0.25.0 API type changes in the changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.25.0');
    expect(SDK_VERSION).toBe('0.25.0');

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[0\.25\.0\]/);
    expect(changelog).toMatch(/DeviceAuthStatusSlowDown/);
    expect(changelog).toMatch(/invalid_scope/);
    expect(changelog).toMatch(/code_confirmation_required/);
    expect(changelog).toMatch(/cached_tokens/);
    expect(changelog).toMatch(/cache_write_tokens/);
  });

  it('keeps c33dec9 generated types for device auth polling and cache usage in types.ts', () => {
    const source = readFileSync(join(__dirname, 'types.ts'), 'utf8');
    expect(source).toMatch(/export const DeviceAuthStatusSlowDown: DeviceAuthStatus = "slow_down"/);
    expect(source).toMatch(/interval\?: number/);
    expect(source).toMatch(/export const ErrorCodeInvalidScope: ErrorCode = "invalid_scope"/);
    expect(source).toMatch(
      /export const ErrorCodeCodeConfirmationRequired: ErrorCode = "code_confirmation_required"/
    );

    const meta = source.match(/export interface MetaItem \{[\s\S]*?\n\}/);
    expect(meta).not.toBeNull();
    expect(meta![0]).toMatch(/cached_tokens\?: number/);
    expect(meta![0]).toMatch(/cache_write_tokens\?: number/);

    const llm = source.match(/export interface LLMUsage \{[\s\S]*?\n\}/);
    expect(llm).not.toBeNull();
    expect(llm![0]).toMatch(/cached_tokens: number/);
    expect(llm![0]).toMatch(/cache_write_tokens: number/);
  });
});
