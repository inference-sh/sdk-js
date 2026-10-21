import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ErrorCodeLastAuthenticator,
  SecondFactorEmail,
  SecondFactorPasskey,
  SecondFactorRecovery,
  SecondFactorTOTP,
  type AuthResponse,
  type SecondFactor,
  type UserDTO,
} from '../types.js';

/**
 * types regen 80f2acf (api 51b464bf7): otp_methods on AuthResponse,
 * UserDTO.two_factor_enabled, SecondFactor literals, ErrorCodeLastAuthenticator.
 */
describe('SecondFactor literals (80f2acf)', () => {
  it('exports all SecondFactor constants from types and the main barrel', () => {
    expect(SecondFactorTOTP).toBe('totp');
    expect(SecondFactorPasskey).toBe('passkey');
    expect(SecondFactorRecovery).toBe('recovery');
    expect(SecondFactorEmail).toBe('email');
    expect(main.SecondFactorTOTP).toBe('totp');
    expect(main.SecondFactorPasskey).toBe('passkey');
    expect(main.SecondFactorRecovery).toBe('recovery');
    expect(main.SecondFactorEmail).toBe('email');
  });

  it('keeps SecondFactor string literals stable for OTP verify payloads', () => {
    const methods: SecondFactor[] = [
      SecondFactorTOTP,
      SecondFactorPasskey,
      SecondFactorRecovery,
      SecondFactorEmail,
    ];
    expect(methods).toEqual(['totp', 'passkey', 'recovery', 'email']);
  });
});

describe('AuthResponse otp_methods (80f2acf)', () => {
  it('types otp_methods as SecondFactor[] on login challenges', () => {
    const challenge: AuthResponse = {
      session_id: 'sess',
      otp_required: true,
      otp_methods: [SecondFactorTOTP, SecondFactorEmail],
      challenge_token: 'challenge',
    };
    expect(challenge.otp_methods).toEqual(['totp', 'email']);
  });
});

describe('UserDTO two-step verification fields (80f2acf)', () => {
  it('requires two_factor_enabled alongside legacy totp_enabled', () => {
    const user: Pick<UserDTO, 'totp_enabled' | 'two_factor_enabled'> = {
      totp_enabled: true,
      two_factor_enabled: true,
    };
    expect(user.two_factor_enabled).toBe(user.totp_enabled);
  });
});

describe('ErrorCode last_authenticator (80f2acf)', () => {
  it('exports ErrorCodeLastAuthenticator for 409 last-method removal', () => {
    expect(ErrorCodeLastAuthenticator).toBe('last_authenticator');
    expect(main.ErrorCodeLastAuthenticator).toBe('last_authenticator');
  });
});

describe('types.ts regen guards (80f2acf)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('replaces AuthResponse otp_method with otp_methods SecondFactor[]', () => {
    expect(typesSource).toMatch(/otp_methods\?: SecondFactor\[\]/);
    expect(typesSource).not.toMatch(/otp_method\?: string/);
  });

  it('documents UserDTO.two_factor_enabled next to deprecated totp_enabled', () => {
    expect(typesSource).toMatch(/two_factor_enabled: boolean/);
    expect(typesSource).toMatch(/totp_enabled: boolean/);
  });

  it('keeps ErrorCodeLastAuthenticator in generated types', () => {
    expect(typesSource).toMatch(/\| "last_authenticator"/);
    expect(typesSource).toMatch(
      /export const ErrorCodeLastAuthenticator: ErrorCode = "last_authenticator"/
    );
  });
});
