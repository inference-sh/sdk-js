import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  DeviceAuthStatusSlowDown,
  ErrorCodeCodeConfirmationRequired,
  ErrorCodeInvalidScope,
  type DeviceAuthPollResponse,
  type DeviceAuthStatus,
  type LLMUsage,
  type MetaItem,
} from '../types.js';

/**
 * types regen c33dec9 (models v0.8.95): RFC 8628 slow_down polling, device
 * sign-in scope/confirmation errors, and prompt-cache token fields on usage DTOs.
 */
describe('device auth slow_down and poll interval (c33dec9 / v0.8.95)', () => {
  it('exports DeviceAuthStatusSlowDown from types and the main barrel', () => {
    expect(DeviceAuthStatusSlowDown).toBe('slow_down');
    expect(main.DeviceAuthStatusSlowDown).toBe('slow_down');
  });

  it('accepts slow_down status with an updated poll interval on DeviceAuthPollResponse', () => {
    const slow: DeviceAuthPollResponse = { status: DeviceAuthStatusSlowDown, interval: 10 };
    expect(slow.status).toBe('slow_down');
    expect(slow.interval).toBe(10);

    const statuses: DeviceAuthStatus[] = [
      main.DeviceAuthStatusPending,
      main.DeviceAuthStatusApproved,
      DeviceAuthStatusSlowDown,
    ];
    expect(statuses).toContain('slow_down');
  });

  it('keeps interval on DeviceAuthPollResponse and slow_down status in types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    const block = source.match(/export interface DeviceAuthPollResponse \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/interval\?: number/);
    expect(block![0]).toMatch(/slow_down/);

    expect(source).toMatch(/export const DeviceAuthStatusSlowDown: DeviceAuthStatus = "slow_down"/);
  });
});

describe('device auth and OAuth scope error codes (c33dec9 / v0.8.95)', () => {
  it('exports invalid_scope and code_confirmation_required ErrorCode constants', () => {
    expect(ErrorCodeInvalidScope).toBe('invalid_scope');
    expect(ErrorCodeCodeConfirmationRequired).toBe('code_confirmation_required');
    expect(main.ErrorCodeInvalidScope).toBe('invalid_scope');
    expect(main.ErrorCodeCodeConfirmationRequired).toBe('code_confirmation_required');
  });

  it('keeps new error codes in the ErrorCode union in types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(source).toMatch(/\| "invalid_scope"/);
    expect(source).toMatch(/\| "code_confirmation_required"/);
    expect(source).toMatch(
      /export const ErrorCodeInvalidScope: ErrorCode = "invalid_scope"/
    );
    expect(source).toMatch(
      /export const ErrorCodeCodeConfirmationRequired: ErrorCode = "code_confirmation_required"/
    );
  });
});

describe('prompt cache token fields on usage DTOs (c33dec9 / v0.8.95)', () => {
  it('accepts cached_tokens and cache_write_tokens on MetaItem and LLMUsage', () => {
    const meta: MetaItem = {
      type: main.MetaItemTypeText,
      tokens: 100,
      cached_tokens: 40,
      cache_write_tokens: 5,
    };
    expect(meta.cached_tokens).toBe(40);
    expect(meta.cache_write_tokens).toBe(5);

    const usage: LLMUsage = {
      stop_reason: 'end_turn',
      time_to_first_token: 0.1,
      tokens_per_second: 50,
      prompt_tokens: 100,
      cached_tokens: 40,
      cache_write_tokens: 5,
      completion_tokens: 20,
      total_tokens: 120,
      reasoning_tokens: 0,
      reasoning_time: 0,
    };
    expect(usage.prompt_tokens).toBe(100);
    expect(usage.cached_tokens).toBe(40);
    expect(usage.cache_write_tokens).toBe(5);
  });

  it('keeps cache token fields on MetaItem and LLMUsage in types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    const meta = source.match(/export interface MetaItem \{[\s\S]*?\n\}/);
    expect(meta).not.toBeNull();
    expect(meta![0]).toMatch(/cached_tokens\?: number/);
    expect(meta![0]).toMatch(/cache_write_tokens\?: number/);

    const llm = source.match(/export interface LLMUsage \{[\s\S]*?\n\}/);
    expect(llm).not.toBeNull();
    expect(llm![0]).toMatch(/cached_tokens: number/);
    expect(llm![0]).toMatch(/cache_write_tokens: number/);
    expect(llm![0]).toMatch(/cached ones included/);
  });
});
