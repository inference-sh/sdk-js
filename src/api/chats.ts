import { HttpClient } from '../http/client';
import {
  ChatDTO as Chat,
  ChatTraceDTO,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * Chats API
 */
export class ChatsAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List chats with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<Chat>> {
    return this.http.request<CursorListResponse<Chat>>('post', '/chats/list', { data: params });
  }

  /**
   * Get a chat by ID
   */
  async get(chatId: string): Promise<Chat> {
    return this.http.request<Chat>('get', `/chats/${chatId}`);
  }

  /**
   * Update a chat
   */
  async update(chatId: string, data: Partial<Chat>): Promise<Chat> {
    return this.http.request<Chat>('post', `/chats/${chatId}`, { data });
  }

  /**
   * Delete a chat
   */
  async delete(chatId: string): Promise<void> {
    return this.http.request<void>('delete', `/chats/${chatId}`);
  }

  /**
   * Get chat trace (for debugging/observability)
   */
  async getTrace(chatId: string): Promise<ChatTraceDTO> {
    return this.http.request<ChatTraceDTO>('get', `/chats/${chatId}/trace`);
  }

  /**
   * Get chat status
   */
  async getStatus(chatId: string): Promise<{ status: string }> {
    return this.http.request<{ status: string }>('get', `/chats/${chatId}/status`);
  }

  /**
   * Stop chat generation
   */
  async stop(chatId: string): Promise<void> {
    return this.http.request<void>('post', `/chats/${chatId}/stop`);
  }

  /**
   * Stream chat updates
   */
  stream(chatId: string) {
    return this.http.createEventSource(`/chats/${chatId}/stream`);
  }
}

export function createChatsAPI(http: HttpClient): ChatsAPI {
  return new ChatsAPI(http);
}
