// Main client export
export { Inference, inference, InferenceConfig, RunOptions, UploadFileOptions } from './client';

// Types - includes TaskStatus constants and all DTOs
export * from './types';

// Convenience type alias
export type { TaskDTO as Task } from './types';
