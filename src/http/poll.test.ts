import { PollManager } from './poll';

describe('PollManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should invoke onData after the immediate first poll', async () => {
    const onData = jest.fn();
    const pollFunction = jest.fn().mockResolvedValue({ status: 'running' });

    const manager = new PollManager({
      pollFunction,
      intervalMs: 1000,
      onData,
    });

    manager.start();
    await Promise.resolve();

    expect(pollFunction).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith({ status: 'running' });

    manager.stop();
  });

  it('should poll repeatedly at intervalMs', async () => {
    const pollFunction = jest.fn().mockResolvedValue({ status: 'running' });

    const manager = new PollManager({
      pollFunction,
      intervalMs: 1000,
    });

    manager.start();
    await Promise.resolve();
    expect(pollFunction).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(pollFunction).toHaveBeenCalledTimes(2);

    manager.stop();
  });

  it('should call onStart when started and onStop when stopped', async () => {
    const onStart = jest.fn();
    const onStop = jest.fn();
    const pollFunction = jest.fn().mockResolvedValue({});

    const manager = new PollManager({ pollFunction, onStart, onStop });
    manager.start();
    expect(onStart).toHaveBeenCalled();

    manager.stop();
    expect(onStop).toHaveBeenCalled();
  });

  it('should stop after maxRetries consecutive poll errors', async () => {
    const onError = jest.fn();
    const onStop = jest.fn();
    const pollFunction = jest.fn().mockRejectedValue(new Error('network error'));

    const manager = new PollManager({
      pollFunction,
      intervalMs: 100,
      maxRetries: 3,
      onError,
      onStop,
    });

    manager.start();

    // Immediate first poll
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(onError).toHaveBeenCalledTimes(3);
    expect(onStop).toHaveBeenCalled();
    expect(pollFunction.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('should not invoke onData after stop', async () => {
    const onData = jest.fn();
    const pollFunction = jest.fn().mockResolvedValue({ status: 'running' });

    const manager = new PollManager({
      pollFunction,
      intervalMs: 100,
      onData,
    });

    manager.start();
    await Promise.resolve();
    manager.stop();

    const callsBefore = onData.mock.calls.length;
    jest.advanceTimersByTime(500);
    await Promise.resolve();

    expect(onData.mock.calls.length).toBe(callsBefore);
  });
});
