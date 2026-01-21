// Main client export (includes Agent)
export {
  Inference,
  inference,
  InferenceConfig,
  RunOptions,
  UploadFileOptions,
  Agent,
  AgentOptions,
  SendMessageOptions,
} from './client';

// Tool Builder (fluent API)
export { tool, appTool, agentTool, webhookTool, internalTools, string, number, integer, boolean, enumOf, object, array, optional } from './tool-builder';

// Stream utilities
export { StreamManager, PartialDataWrapper } from './stream';

// Error classes (throwable)
export { InferenceError, RequirementsNotMetException } from './errors';

// Types - includes TaskStatus constants and all DTOs
export * from './types';

// Convenience type alias
export type { TaskDTO as Task } from './types';
