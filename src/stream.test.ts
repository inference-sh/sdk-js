import { StreamManager } from './http/stream';

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

  describe('addEventListener', () => {
    it('should deliver typed SSE events to registered listeners', async () => {
      const typedListeners: Record<string, Set<(e: MessageEvent) => void>> = {};
      const eventSource = {
        onmessage: null as ((e: MessageEvent) => void) | null,
        onerror: null as ((e: Event) => void) | null,
        close: jest.fn(),
        addEventListener: (eventName: string, handler: (e: MessageEvent) => void) => {
          const listeners = typedListeners[eventName] || new Set();
          listeners.add(handler);
          typedListeners[eventName] = listeners;
        },
      };

      const manager = new StreamManager({
        createEventSource: async () => eventSource as unknown as EventSource,
      });

      const onChat = jest.fn();
      manager.addEventListener('chats', onChat);
      await manager.connect();

      const payload = { id: 'chat-1', status: 'open' };
      typedListeners.chats?.forEach((handler) =>
        handler({ data: JSON.stringify(payload) } as MessageEvent)
      );

      expect(onChat).toHaveBeenCalledWith(payload);
    });

    it('should unwrap partial wrappers for typed events', async () => {
      const typedListeners: Record<string, Set<(e: MessageEvent) => void>> = {};
      const eventSource = {
        onmessage: null as ((e: MessageEvent) => void) | null,
        onerror: null as ((e: Event) => void) | null,
        close: jest.fn(),
        addEventListener: (eventName: string, handler: (e: MessageEvent) => void) => {
          const listeners = typedListeners[eventName] || new Set();
          listeners.add(handler);
          typedListeners[eventName] = listeners;
        },
      };

      const manager = new StreamManager({
        createEventSource: async () => eventSource as unknown as EventSource,
      });

      const onMessage = jest.fn();
      manager.addEventListener('chat_messages', onMessage);
      await manager.connect();

      const inner = { id: 'msg-1', order: 1 };
      typedListeners.chat_messages?.forEach((handler) =>
        handler({
          data: JSON.stringify({ data: inner, fields: ['order'] }),
        } as MessageEvent)
      );

      expect(onMessage).toHaveBeenCalledWith(inner);
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

    it('should stop reconnecting after maxReconnects initial failures', async () => {
      jest.useFakeTimers();
      const onError = jest.fn();
      const createEventSource = jest
        .fn()
        .mockResolvedValue(mockEventSource as unknown as EventSource);

      const manager = new StreamManager({
        createEventSource,
        autoReconnect: true,
        maxReconnects: 2,
        reconnectDelayMs: 100,
        onError,
      });

      await manager.connect();
      mockEventSource.onerror?.({} as Event);

      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(createEventSource).toHaveBeenCalledTimes(2);

      mockEventSource.onerror?.({} as Event);
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(createEventSource).toHaveBeenCalledTimes(3);

      mockEventSource.onerror?.({} as Event);
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(createEventSource).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it('should call onError and stop when createEventSource throws', async () => {
      jest.useFakeTimers();
      const onError = jest.fn();
      const createEventSource = jest
        .fn()
        .mockRejectedValue(new Error('connection refused'));

      const manager = new StreamManager({
        createEventSource,
        autoReconnect: false,
        onError,
      });

      await manager.connect();

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'connection refused' }));
      jest.useRealTimers();
    });
  });

  describe('stopAfter and clearStopTimeout', () => {
    it('should stop after the configured delay', async () => {
      jest.useFakeTimers();
      const onStop = jest.fn();
      const manager = new StreamManager({
        createEventSource: async () => mockEventSource as unknown as EventSource,
        onStop,
      });

      await manager.connect();
      manager.stopAfter(5000);

      jest.advanceTimersByTime(5000);
      expect(mockEventSource.close).toHaveBeenCalled();
      expect(onStop).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should cancel a pending stop when clearStopTimeout is called', async () => {
      jest.useFakeTimers();
      const manager = new StreamManager({
        createEventSource: async () => mockEventSource as unknown as EventSource,
      });

      await manager.connect();
      manager.stopAfter(5000);
      manager.clearStopTimeout();

      jest.advanceTimersByTime(5000);
      expect(mockEventSource.close).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('addEventListener lifecycle', () => {
    it('should register listeners on an existing connection when added after connect', async () => {
      const typedListeners: Record<string, Set<(e: MessageEvent) => void>> = {};
      const eventSource = {
        onmessage: null as ((e: MessageEvent) => void) | null,
        onerror: null as ((e: Event) => void) | null,
        close: jest.fn(),
        addEventListener: (eventName: string, handler: (e: MessageEvent) => void) => {
          const listeners = typedListeners[eventName] || new Set();
          listeners.add(handler);
          typedListeners[eventName] = listeners;
        },
      };

      const manager = new StreamManager({
        createEventSource: async () => eventSource as unknown as EventSource,
      });

      await manager.connect();

      const onChat = jest.fn();
      manager.addEventListener('chats', onChat);

      const payload = { id: 'chat-2' };
      typedListeners.chats?.forEach((handler) =>
        handler({ data: JSON.stringify(payload) } as MessageEvent)
      );

      expect(onChat).toHaveBeenCalledWith(payload);
    });

    it('should remove a listener when the cleanup function is called', async () => {
      const typedListeners: Record<string, Set<(e: MessageEvent) => void>> = {};
      const eventSource = {
        onmessage: null as ((e: MessageEvent) => void) | null,
        onerror: null as ((e: Event) => void) | null,
        close: jest.fn(),
        addEventListener: (eventName: string, handler: (e: MessageEvent) => void) => {
          const listeners = typedListeners[eventName] || new Set();
          listeners.add(handler);
          typedListeners[eventName] = listeners;
        },
      };

      const manager = new StreamManager({
        createEventSource: async () => eventSource as unknown as EventSource,
      });

      const onChat = jest.fn();
      const unsubscribe = manager.addEventListener('chats', onChat);
      await manager.connect();

      unsubscribe();
      typedListeners.chats?.forEach((handler) =>
        handler({ data: '{"id":"chat-3"}' } as MessageEvent)
      );

      expect(onChat).not.toHaveBeenCalled();
    });

    it('should call onError when typed event payload is invalid JSON', async () => {
      const typedListeners: Record<string, Set<(e: MessageEvent) => void>> = {};
      const eventSource = {
        onmessage: null as ((e: MessageEvent) => void) | null,
        onerror: null as ((e: Event) => void) | null,
        close: jest.fn(),
        addEventListener: (eventName: string, handler: (e: MessageEvent) => void) => {
          const listeners = typedListeners[eventName] || new Set();
          listeners.add(handler);
          typedListeners[eventName] = listeners;
        },
      };

      const onError = jest.fn();
      const manager = new StreamManager({
        createEventSource: async () => eventSource as unknown as EventSource,
        onError,
      });

      manager.addEventListener('chats', jest.fn());
      await manager.connect();

      typedListeners.chats?.forEach((handler) =>
        handler({ data: 'not-json' } as MessageEvent)
      );

      expect(onError).toHaveBeenCalled();
    });
  });
});

