import {
  InferenceError,
  RequirementsNotMetException,
  SessionNotFoundError,
  isInferenceError,
  isRequirementsNotMetException,
  isSessionError,
} from './errors';

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
});
