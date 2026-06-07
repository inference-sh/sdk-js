/**
 * Agent Chat API
 *
 * API functions for agent chat operations.
 * Uses the client passed in from the provider.
 */

import type {
  ChatDTO,
  ChatMessageDTO,
  ApiAgentRunRequest,
  AgentTool,
} from '../types';
import type { AdHocAgentConfig, TemplateAgentConfig, AgentOptions, AgentClient, UploadedFile } from './types';
import { isAdHocConfig, extractToolSchemas } from './types';

// Local type definition for agent run response
interface ApiAgentRunResponse {
  user_message: ChatMessageDTO;
  assistant_message: ChatMessageDTO;
}

/**
 * File input that can be either a File to upload or an already-uploaded file
 */
export type FileInput = globalThis.File | UploadedFile;

/**
 * Check if input is an already-uploaded file
 */
function isUploadedFile(input: FileInput): input is UploadedFile {
  return 'uri' in input && typeof (input as UploadedFile).uri === 'string';
}

/**
 * Send a message using ad-hoc agent config
 */
export async function sendAdHocMessage(
  client: AgentClient,
  config: AdHocAgentConfig,
  chatId: string | null,
  text: string,
  imageUris?: string[],
  fileUris?: string[]
): Promise<{ chatId: string; userMessage: ChatMessageDTO; assistantMessage: ChatMessageDTO } | null> {
  // Extract just the schemas from tools (handlers are stripped out)
  const toolSchemas = config.tools ? extractToolSchemas(config.tools) : undefined;

  const request: ApiAgentRunRequest = {
    chat_id: chatId ?? undefined,
    agent_config: {
      ...config,
      system_prompt: config.system_prompt ?? '',
      tools: toolSchemas as (AgentTool | undefined)[]
    },
    input: {
      text,
      images: imageUris,
      files: fileUris,
      context_size: 0,
      system_prompt: '',
      context: [],
      role: 'user',
    },
  };

  const response = await client.http.request<ApiAgentRunResponse>('post', '/agents/run', { data: request });

  if (response) {
    const { user_message, assistant_message } = response;
    if (user_message && assistant_message) {
      return {
        chatId: assistant_message.chat_id,
        userMessage: user_message,
        assistantMessage: assistant_message,
      };
    }
  }

  return null;
}

/**
 * Send a message using template agent config
 */
export async function sendTemplateMessage(
  client: AgentClient,
  config: TemplateAgentConfig,
  chatId: string | null,
  text: string,
  imageUris?: string[],
  fileUris?: string[]
): Promise<{ chatId: string; userMessage: ChatMessageDTO; assistantMessage: ChatMessageDTO } | null> {
  const request: ApiAgentRunRequest = {
    chat_id: chatId ?? undefined,
    // Only include agent if it's not empty (for existing chats, backend uses chat's agent)
    agent: config.agent || undefined,
    input: {
      text,
      images: imageUris,
      files: fileUris,
      context_size: 0,
      system_prompt: '',
      context: [],
      role: 'user',
    },
  };

  const response = await client.http.request<ApiAgentRunResponse>('post', '/agents/run', { data: request });

  if (response) {
    const { user_message, assistant_message } = response;
    if (user_message && assistant_message) {
      return {
        chatId: assistant_message.chat_id,
        userMessage: user_message,
        assistantMessage: assistant_message,
      };
    }
  }

  return null;
}

/**
 * Send a message (unified interface)
 */
export async function sendMessage(
  client: AgentClient,
  config: AgentOptions,
  chatId: string | null,
  text: string,
  files?: FileInput[]
): Promise<{ chatId: string; userMessage: ChatMessageDTO; assistantMessage: ChatMessageDTO } | null> {
  // Process files - upload if needed, or use existing URIs
  let imageUris: string[] | undefined;
  let fileUris: string[] | undefined;

  if (files && files.length > 0) {
    const uploadedFiles: UploadedFile[] = [];

    for (const file of files) {
      // Check if already uploaded
      if (isUploadedFile(file)) {
        uploadedFiles.push(file);
        continue;
      }

      // Upload the file
      try {
        const result = await client.files.upload(file);
        if (result) {
          uploadedFiles.push(result);
        }
      } catch (error) {
        console.error('[AgentSDK] Failed to upload file:', error);
      }
    }

    // Separate images from other files
    const images = uploadedFiles.filter(f => f.content_type?.startsWith('image/'));
    const otherFiles = uploadedFiles.filter(f => !f.content_type?.startsWith('image/'));

    if (images.length > 0) {
      imageUris = images.map(f => f.uri);
    }
    if (otherFiles.length > 0) {
      fileUris = otherFiles.map(f => f.uri);
    }
  }

  if (isAdHocConfig(config)) {
    return sendAdHocMessage(client, config, chatId, text, imageUris, fileUris);
  } else {
    return sendTemplateMessage(client, config, chatId, text, imageUris, fileUris);
  }
}

/**
 * Fetch a chat by ID
 */
export async function fetchChat(client: AgentClient, chatId: string): Promise<ChatDTO | null> {
  try {
    return await client.http.request<ChatDTO>('get', `/chats/${chatId}`);
  } catch (error) {
    console.error('[AgentSDK] Failed to fetch chat:', error);
  }
  return null;
}

/**
 * Stop a chat
 */
export async function stopChat(client: AgentClient, chatId: string): Promise<void> {
  try {
    await client.http.request<void>('post', `/chats/${chatId}/stop`);
  } catch (error) {
    console.error('[AgentSDK] Failed to stop chat:', error);
  }
}

/**
 * Submit a tool result (for client tools/widgets/awaiting input)
 */
export async function submitToolResult(
  client: AgentClient,
  toolInvocationId: string,
  resultOrAction: string | { action: { type: string; payload?: Record<string, unknown> }; form_data?: Record<string, unknown> }
): Promise<void> {
  try {
    const data = typeof resultOrAction === 'string' ? { result: resultOrAction } : resultOrAction;
    await client.http.request<void>('post', `/tools/${toolInvocationId}`, { data });
  } catch (error) {
    console.error('[AgentSDK] Failed to submit tool result:', error);
    throw error;
  }
}

/**
 * Approve a tool (for HIL approval)
 */
export async function approveTool(client: AgentClient, toolInvocationId: string): Promise<void> {
  try {
    await client.http.request<void>('post', `/tools/${toolInvocationId}/invoke`);
  } catch (error) {
    console.error('[AgentSDK] Failed to approve tool:', error);
    throw error;
  }
}

/**
 * Reject a tool (for HIL approval)
 */
export async function rejectTool(client: AgentClient, toolInvocationId: string, reason?: string): Promise<void> {
  try {
    await client.http.request<void>('post', `/tools/${toolInvocationId}/reject`, { data: { reason } });
  } catch (error) {
    console.error('[AgentSDK] Failed to reject tool:', error);
    throw error;
  }
}

/**
 * Always allow a tool for this chat
 */
export async function alwaysAllowTool(
  client: AgentClient,
  chatId: string,
  toolInvocationId: string,
  toolName: string
): Promise<void> {
  try {
    await client.http.request<void>('post', `/chats/${chatId}/tools/${toolInvocationId}/always-allow`, {
      data: { tool_name: toolName }
    });
  } catch (error) {
    console.error('[AgentSDK] Failed to always-allow tool:', error);
    throw error;
  }
}

/**
 * Upload a file and return the uploaded file reference
 */
export async function uploadFile(client: AgentClient, file: globalThis.File): Promise<UploadedFile> {
  const result = await client.files.upload(file);
  return result;
}

/**
 * Create a unified stream for chat events
 */
export function createUnifiedStream(client: AgentClient, chatId: string): Promise<EventSource | null> {
  return client.http.createEventSource(`/chats/${chatId}/stream`);
}
