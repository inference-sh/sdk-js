import { createActions } from './actions';
import type { ActionsContext } from './types';
jest.mock('./api', () => ({
  stopChat: jest.fn(),
  fetchChat: jest.fn(),
  getChatStreamConfig: jest.fn(),
  sendMessage: jest.fn(),
  uploadFile: jest.fn(),
  submitToolResult: jest.fn(),
  approveTool: jest.fn(),
  rejectTool: jest.fn(),
  alwaysAllowTool: jest.fn(),
}));

import * as api from './api';

function createTestContext(overrides: Partial<ActionsContext> = {}): ActionsContext {
  const dispatch = jest.fn();
  const streamManager = { stop: jest.fn(), start: jest.fn() };

  return {
    client: {
      http: {
        request: jest.fn(),
        getStreamableConfig: jest.fn(),
        getStreamDefault: jest.fn(() => true),
        getPollIntervalMs: jest.fn(() => 2000),
      },
      files: { upload: jest.fn() },
    },
    dispatch,
    getConfig: () => null,
    getChatId: () => 'chat-1',
    getClientToolHandlers: () => new Map(),
    getStreamManager: () => streamManager as never,
    setStreamManager: jest.fn(),
    getStreamEnabled: () => true,
    getPollIntervalMs: () => 2000,
    callbacks: {},
    ...overrides,
  };
}

describe('createActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('stopGeneration', () => {
    it('should call stopChat without tearing down the active stream', () => {
      const streamManager = { stop: jest.fn(), start: jest.fn() };
      const setStreamManager = jest.fn();
      const dispatch = jest.fn();
      const ctx = createTestContext({
        dispatch,
        getStreamManager: () => streamManager as never,
        setStreamManager,
      });

      const { publicActions } = createActions(ctx);
      publicActions.stopGeneration();

      expect(api.stopChat).toHaveBeenCalledWith(ctx.client, 'chat-1');
      expect(streamManager.stop).not.toHaveBeenCalled();
      expect(setStreamManager).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'idle',
      });
    });

    it('should no-op when there is no chat id', () => {
      const ctx = createTestContext({ getChatId: () => null });
      const { publicActions } = createActions(ctx);

      publicActions.stopGeneration();

      expect(api.stopChat).not.toHaveBeenCalled();
    });
  });

});
