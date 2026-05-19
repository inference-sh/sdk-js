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

describe('SDK error classes', () => {
  it('InferenceError should include statusCode and formatted message', () => {
    const err = new InferenceError(400, 'Invalid request', '{"detail":"x"}');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('HTTP 400: Invalid request');
    expect(err.responseBody).toBe('{"detail":"x"}');
    expect(err.name).toBe('InferenceError');
  });

  it('RequirementsNotMetException.fromResponse should use first error message', () => {
    const err = RequirementsNotMetException.fromResponse({
      errors: [{ type: 'secret', key: 'API_KEY', message: 'Missing secret' }],
    });
    expect(err.errors).toHaveLength(1);
    expect(err.message).toBe('Missing secret');
    expect(err.statusCode).toBe(412);
  });

  it('session error subclasses should expose sessionId', () => {
    expect(new SessionNotFoundError('sess-1').sessionId).toBe('sess-1');
    expect(new SessionExpiredError('sess-2').statusCode).toBe(410);
    expect(new SessionEndedError('sess-3').name).toBe('SessionEndedError');
    expect(new WorkerLostError('sess-4').statusCode).toBe(500);
  });
});

describe('error type guards', () => {
  it('isInferenceError should match instances and plain objects', () => {
    expect(isInferenceError(new InferenceError(500, 'fail'))).toBe(true);
    expect(isInferenceError({ name: 'InferenceError', statusCode: 502 })).toBe(true);
    expect(isInferenceError(null)).toBe(false);
    expect(isInferenceError(new Error('other'))).toBe(false);
  });

  it('isRequirementsNotMetException should match instances and 412-shaped plain objects', () => {
    const err = new RequirementsNotMetException([
      { type: 'secret', key: 'K', message: 'missing' },
    ]);
    expect(isRequirementsNotMetException(err)).toBe(true);
    expect(
      isRequirementsNotMetException({
        name: 'RequirementsNotMetException',
        statusCode: 412,
        errors: [],
      })
    ).toBe(true);
    expect(isRequirementsNotMetException({ statusCode: 412, errors: [] })).toBe(true);
    expect(isRequirementsNotMetException(new InferenceError(412, 'x'))).toBe(false);
  });

  it('isSessionError should match session error subclasses and plain objects', () => {
    expect(isSessionError(new SessionNotFoundError('s1'))).toBe(true);
    expect(
      isSessionError({
        name: 'SessionExpiredError',
        sessionId: 's2',
        statusCode: 410,
      })
    ).toBe(true);
    expect(isSessionError(new InferenceError(404, 'x'))).toBe(false);
  });
});
