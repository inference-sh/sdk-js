/**
 * Agent Chat API
 *
 * Two paths by user intent:
 * - New conversation:  POST /chats (create chat with agent) → POST /chats/{id}/messages
 * - Existing chat:     POST /chats/{id}/messages
 *
 * /agents/run stays for A2A/programmatic use.
 */

import type {
  AgentDTO,
  ChatDTO,
  ChatMessageDTO,
  InterruptDTO,
} from '../types';
import type { AgentOptions, AgentClient, AgentInfo, FileRef } from './types';
import { isAdHocConfig } from './types';

export interface SendResult {
  chatId: string;
  userMessage: ChatMessageDTO;
}

/**
 * File input that can be either a File to upload or an already-uploaded file
 */
export type FileInput = globalThis.File | FileRef;

function isFileRef(input: FileInput): input is FileRef {
  return 'uri' in input && typeof (input as FileRef).uri === 'string';
}

/**
 * Process file inputs — upload raw files, pass through already-uploaded FileRefs
 */
async function processFiles(client: AgentClient, files?: FileInput[]): Promise<FileRef[] | undefined> {
  if (!files || files.length === 0) return undefined;

  const results = await Promise.all(
    files.map(async (file) => {
      if (isFileRef(file)) return file;
      try {
        return await client.files.upload(file);
      } catch (error) {
        console.error('[AgentSDK] Failed to upload file:', error);
        return null;
      }
    })
  );
  const refs = results.filter((r): r is FileRef => r !== null);
  return refs.length > 0 ? refs : undefined;
}

/**
 * Create a new chat with an agent — POST /chats
 */
async function createChat(
  client: AgentClient,
  config: AgentOptions,
): Promise<ChatDTO> {
  const agentRef = isAdHocConfig(config) ? config.core_app.ref : config.agent;
  const context = !isAdHocConfig(config) ? config.context : undefined;
  const resp = await client.http.request<ChatDTO>('post', '/chats', {
    data: { agent: agentRef, context },
  });
  return resp.data;
}

/**
 * Send a message in a chat — POST /chats/{id}/messages
 */
async function sendChatMessage(
  client: AgentClient,
  chatId: string,
  text: string,
): Promise<SendResult> {
  const resp = await client.http.request<ChatMessageDTO>('post', `/chats/${chatId}/messages`, {
    data: { message: text },
  });

  return {
    chatId,
    userMessage: resp.data,
  };
}

/**
 * Send a message — creates chat if needed, then sends message
 */
export async function sendMessage(
  client: AgentClient,
  config: AgentOptions,
  chatId: string | null,
  text: string,
  files?: FileInput[]
): Promise<SendResult | null> {
  await processFiles(client, files);

  // Existing chat — just send the message
  if (chatId) {
    return sendChatMessage(client, chatId, text);
  }

  // New chat — create it, then send the first message
  const chat = await createChat(client, config);
  return sendChatMessage(client, chat.id, text);
}

// =========================================================================
// Agent info
// =========================================================================

export async function fetchAgentInfo(
  client: AgentClient,
  agentRef: string,
): Promise<AgentInfo | null> {
  try {
    const resp = await client.http.request<AgentDTO>('get', `/agents/${agentRef}`);
    const version = resp.data?.version;
    return {
      description: version?.description,
      example_prompts: version?.example_prompts,
    };
  } catch {
    return null;
  }
}

// =========================================================================
// Chat operations
// =========================================================================

export interface FetchMessagesOptions {
  limit?: number;
  cursor?: string;
}

export interface FetchMessagesResult {
  items: ChatMessageDTO[];
  next_cursor: string;
  has_next: boolean;
}

export async function fetchMessages(client: AgentClient, chatId: string, options?: FetchMessagesOptions): Promise<ChatMessageDTO[]> {
  const result = await fetchMessagesPage(client, chatId, options);
  return result.items;
}

export async function fetchMessagesPage(client: AgentClient, chatId: string, options?: FetchMessagesOptions): Promise<FetchMessagesResult> {
  try {
    const params: Record<string, string | number> = {};
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.cursor) params.cursor = options.cursor;

    const resp = await client.http.request<FetchMessagesResult>('get', `/chats/${chatId}/messages`, { params });
    return resp.data || { items: [], next_cursor: '', has_next: false };
  } catch (error) {
    console.error('[AgentSDK] Failed to fetch messages:', error);
    return { items: [], next_cursor: '', has_next: false };
  }
}

export async function fetchChat(client: AgentClient, chatId: string): Promise<ChatDTO | null> {
  try {
    const resp = await client.http.request<ChatDTO>('get', `/chats/${chatId}`);
    const chat = resp.data;
    // Chat.Get no longer preloads messages — fetch them separately and attach
    if (chat && (!chat.chat_messages || chat.chat_messages.length === 0)) {
      const page = await fetchMessagesPage(client, chatId);
      chat.chat_messages = page.items;
      // Store pagination info on the chat for the reducer to pick up
      (chat as any)._messageCursor = page.next_cursor;
      (chat as any)._hasOlderMessages = page.has_next;
    }
    return chat;
  } catch (error) {
    console.error('[AgentSDK] Failed to fetch chat:', error);
  }
  return null;
}

export async function stopChat(client: AgentClient, chatId: string): Promise<void> {
  try {
    await client.http.request<void>('post', `/chats/${chatId}/stop`);
  } catch (error) {
    console.error('[AgentSDK] Failed to stop chat:', error);
  }
}

export async function cancelMessage(client: AgentClient, messageId: string): Promise<void> {
  await client.http.request<void>('post', `/chats/messages/${messageId}/cancel`);
}

export async function setAgent(client: AgentClient, chatId: string, agentRef: string): Promise<ChatDTO> {
  const resp = await client.http.request<ChatDTO>('post', `/chats/${chatId}/agent`, {
    data: { agent: agentRef },
  });
  return resp.data;
}

// =========================================================================
// Tool operations
// =========================================================================

export async function submitToolResult(
  client: AgentClient,
  toolInvocationId: string,
  resultOrAction: string | { action: { type: string; payload?: Record<string, unknown> }; form_data?: Record<string, unknown> }
): Promise<void> {
  const data = typeof resultOrAction === 'string' ? { result: resultOrAction } : resultOrAction;
  await client.http.request<void>('post', `/tools/${toolInvocationId}`, { data });
}

export async function approveTool(client: AgentClient, toolInvocationId: string): Promise<void> {
  await client.http.request<void>('post', `/tools/${toolInvocationId}/invoke`);
}

export async function rejectTool(client: AgentClient, toolInvocationId: string, reason?: string): Promise<void> {
  await client.http.request<void>('post', `/tools/${toolInvocationId}/reject`, { data: { reason } });
}

export async function alwaysAllowTool(
  client: AgentClient,
  chatId: string,
  toolInvocationId: string,
  toolName: string
): Promise<void> {
  await client.http.request<void>('post', `/chats/${chatId}/tools/${toolInvocationId}/always-allow`, {
    data: { tool_name: toolName }
  });
}

// =========================================================================
// Interrupt operations
// =========================================================================

export async function resolveInterrupt(
  client: AgentClient,
  interruptId: string,
  decision: 'allow' | 'deny'
): Promise<InterruptDTO> {
  const resp = await client.http.request<InterruptDTO>('post', `/interrupts/${interruptId}/resolve`, {
    data: { decision }
  });
  return resp.data;
}

export async function listRunInterrupts(
  client: AgentClient,
  runId: string
): Promise<InterruptDTO[]> {
  const resp = await client.http.request<InterruptDTO[]>('get', `/agent-runs/${runId}/interrupts`);
  return resp.data;
}

// =========================================================================
// File & stream operations
// =========================================================================

export async function uploadFile(client: AgentClient, file: globalThis.File): Promise<FileRef> {
  return client.files.upload(file);
}

export function getChatStreamConfig(client: AgentClient, chatId: string): { url: string; headers: Record<string, string>; credentials: RequestCredentials } {
  return client.http.getStreamableConfig(`/chats/${chatId}/stream`);
}
