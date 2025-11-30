import { StreamManager } from './stream';

describe('StreamManager', () => {
  let mockEventSource: {
    onmessage: ((e: MessageEvent) => void) | null;
    onerror: ((e: Event) => void) | null;
    close: jest.Mock;
  };

  beforeEach(() => {
    mockEventSource = {
      onmessage: null,
      onerror: null,
      close: jest.fn(),
    };
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const manager = new StreamManager({
        createEventSource: async () => mockEventSource as unknown as EventSource,
      });
      expect(manager).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should call createEventSource', async () => {
      const createEventSource = jest
        .fn()
        .mockResolvedValue(mockEventSource as unknown as EventSource);

      const manager = new StreamManager({ createEventSource });
      await manager.connect();

      expect(createEventSource).toHaveBeenCalled();
    });

    it('should call onStart when connected', async () => {
      const onStart = jest.fn();
      const manager = new StreamManager({
        createEventSource: async () => mockEventSource as unknown as EventSource,
        onStart,
      });

      await manager.connect();
      expect(onStart).toHaveBeenCalled();
    });

    it('should parse JSON messages and call onData', async () => {
      const onData = jest.fn();
      const manager = new StreamManager({
        createEventSource: async () => mockEventSource as unknown as EventSource,
        onData,
      });

      await manager.connect();

      // Simulate receiving a message
      const testData = { status: 'running', id: 'task-123' };
      mockEventSource.onmessage?.({ data: JSON.stringify(testData) } as MessageEvent);

      expect(onData).toHaveBeenCalledWith(testData);
    });

    it('should call onError for invalid JSON', async () => {
      const onError = jest.fn();
      const manager = new StreamManager({
        createEventSource: async () => mockEventSource as unknown as EventSource,
        onError,
      });

      await manager.connect();
      mockEventSource.onmessage?.({ data: 'invalid json' } as MessageEvent);

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should close the event source', async () => {
      const onStop = jest.fn();
      const manager = new StreamManager({
        createEventSource: async () => mockEventSource as unknown as EventSource,
        onStop,
      });

      await manager.connect();
      manager.stop();

      expect(mockEventSource.close).toHaveBeenCalled();
      expect(onStop).toHaveBeenCalled();
    });

    it('should not process messages after stop', async () => {
      const onData = jest.fn();
      const manager = new StreamManager({
        createEventSource: async () => mockEventSource as unknown as EventSource,
        onData,
      });

      await manager.connect();
      manager.stop();

      mockEventSource.onmessage?.({ data: '{"status":"running"}' } as MessageEvent);
      expect(onData).not.toHaveBeenCalled();
    });
  });

  describe('reconnection', () => {
    it('should attempt reconnection on error when autoReconnect is true', async () => {
      jest.useFakeTimers();
      const createEventSource = jest
        .fn()
        .mockResolvedValue(mockEventSource as unknown as EventSource);

      const manager = new StreamManager({
        createEventSource,
        autoReconnect: true,
        reconnectDelayMs: 100,
      });

      await manager.connect();
      expect(createEventSource).toHaveBeenCalledTimes(1);

      // Simulate error
      mockEventSource.onerror?.({} as Event);

      // Fast-forward past reconnect delay
      jest.advanceTimersByTime(100);
      await Promise.resolve(); // Flush promises

      expect(createEventSource).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('should not reconnect when autoReconnect is false', async () => {
      const createEventSource = jest
        .fn()
        .mockResolvedValue(mockEventSource as unknown as EventSource);

      const manager = new StreamManager({
        createEventSource,
        autoReconnect: false,
      });

      await manager.connect();
      mockEventSource.onerror?.({} as Event);

      // Wait a bit
      await new Promise((r) => setTimeout(r, 50));

      expect(createEventSource).toHaveBeenCalledTimes(1);
    });
  });
});

