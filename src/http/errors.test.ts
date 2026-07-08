import {
  InferenceError,
  RequirementsNotMetException,
  SessionEndedError,
  SessionExpiredError,
  SessionNotFoundError,
  WorkerLostError,
  isInferenceError,
  isRequirementsNotMetException,
  isSessionError,
} from './errors';
import {
  RequirementTypeIntegration,
  RequirementTypeScope,
  RequirementTypeSecret,
} from '../types';

describe('error type guards', () => {
  it('isRequirementsNotMetException should match instances and plain objects', () => {
    const instance = new RequirementsNotMetException([
      { type: 'secret', key: 'K', message: 'missing' },
    ]);
    expect(isRequirementsNotMetException(instance)).toBe(true);

    const plain = {
      name: 'RequirementsNotMetException',
      statusCode: 412,
      errors: [{ type: 'secret', key: 'K', message: 'missing' }],
    };
    expect(isRequirementsNotMetException(plain)).toBe(true);
    expect(isRequirementsNotMetException(new Error('other'))).toBe(false);
  });

  it('isInferenceError should match instances and plain objects', () => {
    const instance = new InferenceError(500, 'server error');
    expect(isInferenceError(instance)).toBe(true);

    expect(isInferenceError({ name: 'InferenceError', statusCode: 404 })).toBe(true);
    expect(isInferenceError({ name: 'InferenceError' })).toBe(false);
  });

  it('isSessionError should match session error subclasses and plain objects', () => {
    const instance = new SessionNotFoundError('sess-1');
    expect(isSessionError(instance)).toBe(true);

    expect(
      isSessionError({
        name: 'SessionNotFoundError',
        sessionId: 'sess-1',
        statusCode: 404,
      })
    ).toBe(true);
    expect(isSessionError({ name: 'InferenceError', statusCode: 500 })).toBe(false);
  });

  it('session error subclasses should expose sessionId', () => {
    expect(new SessionNotFoundError('sess-1').sessionId).toBe('sess-1');
    expect(new SessionExpiredError('sess-2').statusCode).toBe(410);
    expect(new SessionEndedError('sess-3').name).toBe('SessionEndedError');
    expect(new WorkerLostError('sess-4').statusCode).toBe(500);
  });
});

describe('error classes', () => {
  it('RequirementsNotMetException.fromResponse should default empty errors', () => {
    const err = RequirementsNotMetException.fromResponse({}, 412);
    expect(err.errors).toEqual([]);
    expect(err.statusCode).toBe(412);
    expect(err.message).toBe('requirements not met');
  });

  it('RequirementsNotMetException should preserve typed RequirementType values', () => {
    const errors = [
      { type: RequirementTypeSecret, key: 'API_KEY', message: 'Missing secret' },
      { type: RequirementTypeIntegration, key: 'google', message: 'Not connected' },
      { type: RequirementTypeScope, key: 'calendar.readonly', message: 'Missing scope' },
    ];
    const err = new RequirementsNotMetException(errors);

    expect(err.errors[0].type).toBe('secret');
    expect(err.errors[1].type).toBe('integration');
    expect(err.errors[2].type).toBe('scope');
    expect(isRequirementsNotMetException(err)).toBe(true);
  });

  it('session error subclasses should expose sessionId and statusCode', () => {
    expect(new SessionNotFoundError('sess-a').sessionId).toBe('sess-a');
    expect(new SessionNotFoundError('sess-a').statusCode).toBe(404);

    expect(new SessionExpiredError('sess-b').statusCode).toBe(410);
    expect(new SessionEndedError('sess-c').message).toContain('sess-c');
    expect(new WorkerLostError('sess-d').name).toBe('WorkerLostError');
  });
});
