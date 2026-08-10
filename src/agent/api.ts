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
  ChatDTO,
  ChatMessageDTO,
} from '../types';
import type { AgentOptions, AgentClient, FileRef } from './types';
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

  const refs: FileRef[] = [];
  for (const file of files) {
    if (isFileRef(file)) {
      refs.push(file);
    } else {
      try {
        const result = await client.files.upload(file);
        if (result) refs.push(result);
      } catch (error) {
        console.error('[AgentSDK] Failed to upload file:', error);
      }
    }
  }
  return refs.length > 0 ? refs : undefined;
}

/**
 * Create a new chat with an agent — POST /chats
 */
async function createChat(
  client: AgentClient,
  config: AgentOptions,
): Promise<ChatDTO> {
  const agentRef = isAdHocConfig(config) ? undefined : config.agent;
  const resp = await client.http.request<ChatDTO>('post', '/chats', {
    data: { agent: agentRef || '' },
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
// Chat operations
// =========================================================================

export async function fetchChat(client: AgentClient, chatId: string): Promise<ChatDTO | null> {
  try {
    const resp = await client.http.request<ChatDTO>('get', `/chats/${chatId}`);
    return resp.data;
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
// File & stream operations
// =========================================================================

export async function uploadFile(client: AgentClient, file: globalThis.File): Promise<FileRef> {
  return client.files.upload(file);
}

export function getChatStreamConfig(client: AgentClient, chatId: string): { url: string; headers: Record<string, string>; credentials: RequestCredentials } {
  return client.http.getStreamableConfig(`/chats/${chatId}/stream`);
}
