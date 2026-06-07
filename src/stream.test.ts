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

    it('should extract data from partial data wrapper and call onData', async () => {
      const onData = jest.fn();
      const manager = new StreamManager({
        createEventSource: async () => mockEventSource as unknown as EventSource,
        onData,
      });

      await manager.connect();

      // Simulate receiving a partial data wrapper from server
      const innerData = { status: 7, id: 'task-123', logs: ['log1'] };
      const partialWrapper = { data: innerData, fields: ['status', 'logs'] };
      mockEventSource.onmessage?.({ data: JSON.stringify(partialWrapper) } as MessageEvent);

      // onData should receive the extracted inner data, not the wrapper
      expect(onData).toHaveBeenCalledWith(innerData);
    });

    it('should call onPartialData with data and fields for partial updates', async () => {
      const onData = jest.fn();
      const onPartialData = jest.fn();
      const manager = new StreamManager({
        createEventSource: async () => mockEventSource as unknown as EventSource,
        onData,
        onPartialData,
      });

      await manager.connect();

      // Simulate receiving a partial data wrapper
      const innerData = { status: 7, id: 'task-123' };
      const fields = ['status'];
      const partialWrapper = { data: innerData, fields };
      mockEventSource.onmessage?.({ data: JSON.stringify(partialWrapper) } as MessageEvent);

      // When onPartialData is provided, only it is called (not onData)
      expect(onPartialData).toHaveBeenCalledWith(innerData, fields);
      expect(onData).not.toHaveBeenCalled();
    });

    it('should not call onPartialData for non-partial data', async () => {
      const onData = jest.fn();
      const onPartialData = jest.fn();
      const manager = new StreamManager({
        createEventSource: async () => mockEventSource as unknown as EventSource,
        onData,
        onPartialData,
      });

      await manager.connect();

      // Regular data without partial wrapper
      const regularData = { status: 9, id: 'task-123' };
      mockEventSource.onmessage?.({ data: JSON.stringify(regularData) } as MessageEvent);

      expect(onPartialData).not.toHaveBeenCalled();
      expect(onData).toHaveBeenCalledWith(regularData);
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

