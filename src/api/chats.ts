import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import type { ChatUpdateBody } from './write-bodies';
import {
  ChatDTO as Chat,
  ChatMessageDTO,
  ChatSettingsDTO,
  ChatSettingsRequest,
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
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<Chat>>> {
    return this.http.request<CursorListResponse<Chat>>('post', '/chats/list', { data: params });
  }

  /**
   * Get a chat by ID
   */
  async get(chatId: string): Promise<Response<Chat>> {
    return this.http.request<Chat>('get', `/chats/${chatId}`);
  }

  /**
   * Update a chat's name and description. Visibility and the other chat
   * settings: updateSettings.
   */
  async update(chatId: string, data: ChatUpdateBody): Promise<Response<Chat>> {
    return this.http.request<Chat>('post', `/chats/${chatId}`, { data });
  }

  /**
   * Change a chat's settings (name, visibility, tool approval, hooks,
   * memory). Answers with the settings as they now are.
   */
  async updateSettings(chatId: string, settings: ChatSettingsRequest): Promise<Response<ChatSettingsDTO>> {
    return this.http.request<ChatSettingsDTO>('post', `/chats/${chatId}/settings`, { data: settings });
  }

  /**
   * Delete a chat
   */
  async delete(chatId: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/chats/${chatId}`);
  }

  /**
   * Get chat trace (for debugging/observability)
   */
  async getTrace(chatId: string): Promise<Response<ChatTraceDTO>> {
    return this.http.request<ChatTraceDTO>('get', `/chats/${chatId}/trace`);
  }

  /**
   * Get chat status
   */
  async getStatus(chatId: string): Promise<Response<{ status: string }>> {
    return this.http.request<{ status: string }>('get', `/chats/${chatId}/status`);
  }

  /**
   * Stop chat generation
   */
  async stop(chatId: string): Promise<Response<void>> {
    return this.http.request<void>('post', `/chats/${chatId}/stop`);
  }

  /**
   * Cancel a queued message
   */
  async cancelMessage(messageId: string): Promise<Response<ChatMessageDTO>> {
    return this.http.request<ChatMessageDTO>('post', `/chats/messages/${messageId}/cancel`);
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
