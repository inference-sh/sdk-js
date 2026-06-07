#!/usr/bin/env node
/**
 * Build ESM wrapper modules from CommonJS dist output.
 *
 * This script renames .js to .cjs and creates .mjs wrappers.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

// Rename main .js to .cjs and create .mjs wrapper
function createMainWrapper() {
  const jsPath = path.join(distDir, 'index.js');
  const cjsPath = path.join(distDir, 'index.cjs');

  // Rename .js to .cjs for explicit CommonJS
  if (fs.existsSync(jsPath)) {
    fs.renameSync(jsPath, cjsPath);
    console.log('Renamed dist/index.js -> dist/index.cjs');
  }

  // Create ESM wrapper with explicit named exports
  // (export * from CJS doesn't work reliably across all bundlers)
  const wrapper = `// ESM wrapper - explicit re-exports from CommonJS
import * as cjs from './index.cjs';

// HTTP utilities
export const HttpClient = cjs.HttpClient;
export const createHttpClient = cjs.createHttpClient;
export const StreamManager = cjs.StreamManager;
export const InferenceError = cjs.InferenceError;
export const RequirementsNotMetException = cjs.RequirementsNotMetException;

// API modules
export const TasksAPI = cjs.TasksAPI;
export const FilesAPI = cjs.FilesAPI;
export const AgentsAPI = cjs.AgentsAPI;
export const Agent = cjs.Agent;
export const AppsAPI = cjs.AppsAPI;
export const ChatsAPI = cjs.ChatsAPI;
export const FlowsAPI = cjs.FlowsAPI;
export const FlowRunsAPI = cjs.FlowRunsAPI;
export const EnginesAPI = cjs.EnginesAPI;

// Tool builder
export const tool = cjs.tool;
export const appTool = cjs.appTool;
export const agentTool = cjs.agentTool;
export const webhookTool = cjs.webhookTool;
export const internalTools = cjs.internalTools;
export const string = cjs.string;
export const number = cjs.number;
export const integer = cjs.integer;
export const boolean = cjs.boolean;
export const enumOf = cjs.enumOf;
export const object = cjs.object;
export const array = cjs.array;
export const optional = cjs.optional;

// Main class and factory functions
export const Inference = cjs.Inference;
export const inference = cjs.inference;
export const createClient = cjs.createClient;

// Type constants from types.ts
// Task status
export const TaskStatusUnknown = cjs.TaskStatusUnknown;
export const TaskStatusReceived = cjs.TaskStatusReceived;
export const TaskStatusQueued = cjs.TaskStatusQueued;
export const TaskStatusScheduled = cjs.TaskStatusScheduled;
export const TaskStatusPreparing = cjs.TaskStatusPreparing;
export const TaskStatusServing = cjs.TaskStatusServing;
export const TaskStatusSettingUp = cjs.TaskStatusSettingUp;
export const TaskStatusRunning = cjs.TaskStatusRunning;
export const TaskStatusCancelling = cjs.TaskStatusCancelling;
export const TaskStatusUploading = cjs.TaskStatusUploading;
export const TaskStatusCompleted = cjs.TaskStatusCompleted;
export const TaskStatusFailed = cjs.TaskStatusFailed;
export const TaskStatusCancelled = cjs.TaskStatusCancelled;
// Legacy aliases for backward compatibility
export const TaskStatusPending = cjs.TaskStatusQueued;
export const TaskStatusProcessing = cjs.TaskStatusRunning;

// Tool types
export const ToolTypeApp = cjs.ToolTypeApp;
export const ToolTypeAgent = cjs.ToolTypeAgent;
export const ToolTypeHook = cjs.ToolTypeHook;
export const ToolTypeClient = cjs.ToolTypeClient;
export const ToolTypeInternal = cjs.ToolTypeInternal;

// Tool invocation status
export const ToolInvocationStatusPending = cjs.ToolInvocationStatusPending;
export const ToolInvocationStatusInProgress = cjs.ToolInvocationStatusInProgress;
export const ToolInvocationStatusAwaitingInput = cjs.ToolInvocationStatusAwaitingInput;
export const ToolInvocationStatusAwaitingApproval = cjs.ToolInvocationStatusAwaitingApproval;
export const ToolInvocationStatusCompleted = cjs.ToolInvocationStatusCompleted;
export const ToolInvocationStatusFailed = cjs.ToolInvocationStatusFailed;
export const ToolInvocationStatusCancelled = cjs.ToolInvocationStatusCancelled;

// Chat message types
export const ChatStatusBusy = cjs.ChatStatusBusy;
export const ChatStatusIdle = cjs.ChatStatusIdle;
export const ChatStatusAwaitingInput = cjs.ChatStatusAwaitingInput;
export const ChatStatusCompleted = cjs.ChatStatusCompleted;
export const ChatMessageRoleSystem = cjs.ChatMessageRoleSystem;
export const ChatMessageRoleUser = cjs.ChatMessageRoleUser;
export const ChatMessageRoleAssistant = cjs.ChatMessageRoleAssistant;
export const ChatMessageRoleTool = cjs.ChatMessageRoleTool;
export const ChatMessageStatusPending = cjs.ChatMessageStatusPending;
export const ChatMessageStatusReady = cjs.ChatMessageStatusReady;
export const ChatMessageStatusFailed = cjs.ChatMessageStatusFailed;
export const ChatMessageStatusCancelled = cjs.ChatMessageStatusCancelled;
export const ChatMessageContentTypeText = cjs.ChatMessageContentTypeText;
export const ChatMessageContentTypeReasoning = cjs.ChatMessageContentTypeReasoning;
export const ChatMessageContentTypeImage = cjs.ChatMessageContentTypeImage;
export const ChatMessageContentTypeFile = cjs.ChatMessageContentTypeFile;
export const ChatMessageContentTypeTool = cjs.ChatMessageContentTypeTool;

// Visibility
export const VisibilityPrivate = cjs.VisibilityPrivate;
export const VisibilityPublic = cjs.VisibilityPublic;
export const VisibilityUnlisted = cjs.VisibilityUnlisted;

// Flow run status
export const FlowRunStatusUnknown = cjs.FlowRunStatusUnknown;
export const FlowRunStatusPending = cjs.FlowRunStatusPending;
export const FlowRunStatusRunning = cjs.FlowRunStatusRunning;
export const FlowRunStatusCompleted = cjs.FlowRunStatusCompleted;
export const FlowRunStatusFailed = cjs.FlowRunStatusFailed;
export const FlowRunStatusCancelled = cjs.FlowRunStatusCancelled;

// Infra
export const InfraPrivate = cjs.InfraPrivate;
export const InfraCloud = cjs.InfraCloud;
export const InfraPrivateFirst = cjs.InfraPrivateFirst;

// Task log types
export const TaskLogTypeBuild = cjs.TaskLogTypeBuild;
export const TaskLogTypeRun = cjs.TaskLogTypeRun;
export const TaskLogTypeServe = cjs.TaskLogTypeServe;
export const TaskLogTypeSetup = cjs.TaskLogTypeSetup;
export const TaskLogTypeTask = cjs.TaskLogTypeTask;

// Graph types
export const GraphNodeTypeUnknown = cjs.GraphNodeTypeUnknown;
export const GraphNodeTypeJoin = cjs.GraphNodeTypeJoin;
export const GraphNodeTypeSplit = cjs.GraphNodeTypeSplit;
export const GraphNodeTypeExecution = cjs.GraphNodeTypeExecution;
export const GraphNodeTypeResource = cjs.GraphNodeTypeResource;
export const GraphNodeTypeApproval = cjs.GraphNodeTypeApproval;
export const GraphNodeTypeConditional = cjs.GraphNodeTypeConditional;
export const GraphNodeTypeFlowNode = cjs.GraphNodeTypeFlowNode;
export const GraphNodeStatusPending = cjs.GraphNodeStatusPending;
export const GraphNodeStatusReady = cjs.GraphNodeStatusReady;
export const GraphNodeStatusRunning = cjs.GraphNodeStatusRunning;
export const GraphNodeStatusCompleted = cjs.GraphNodeStatusCompleted;
export const GraphNodeStatusFailed = cjs.GraphNodeStatusFailed;
export const GraphNodeStatusCancelled = cjs.GraphNodeStatusCancelled;
export const GraphNodeStatusSkipped = cjs.GraphNodeStatusSkipped;
export const GraphNodeStatusBlocked = cjs.GraphNodeStatusBlocked;
export const GraphEdgeTypeDependency = cjs.GraphEdgeTypeDependency;
export const GraphEdgeTypeFlow = cjs.GraphEdgeTypeFlow;
export const GraphEdgeTypeConditional = cjs.GraphEdgeTypeConditional;
export const GraphEdgeTypeExecution = cjs.GraphEdgeTypeExecution;
`;

  fs.writeFileSync(path.join(distDir, 'index.mjs'), wrapper);
  console.log('Created dist/index.mjs');

  // Also create index.js as a CJS copy for backwards compatibility
  fs.copyFileSync(cjsPath, jsPath);
  console.log('Copied dist/index.cjs -> dist/index.js');
}

// Create ESM wrappers for proxy modules
function createProxyWrappers() {
  const proxyDir = path.join(distDir, 'proxy');
  if (!fs.existsSync(proxyDir)) {
    fs.mkdirSync(proxyDir, { recursive: true });
  }

  const jsFiles = fs.readdirSync(proxyDir).filter(f => f.endsWith('.js') && !f.endsWith('.cjs'));

  for (const jsFile of jsFiles) {
    const name = path.basename(jsFile, '.js');
    const cjsFile = `${name}.cjs`;
    const mjsFile = `${name}.mjs`;

    // Rename .js to .cjs
    const jsPath = path.join(proxyDir, jsFile);
    const cjsPath = path.join(proxyDir, cjsFile);
    fs.renameSync(jsPath, cjsPath);

    // Create .mjs wrapper
    const wrapper = `// ESM wrapper - re-export all from CommonJS
export * from './${cjsFile}';
`;

    fs.writeFileSync(path.join(proxyDir, mjsFile), wrapper);

    // Copy back for backwards compatibility
    fs.copyFileSync(cjsPath, jsPath);

    console.log(`Created dist/proxy/${mjsFile}`);
  }
}

// Create ESM wrappers for agent module
function createAgentWrappers() {
  const agentDir = path.join(distDir, 'agent');
  if (!fs.existsSync(agentDir)) {
    console.log('No agent dir found, skipping');
    return;
  }

  const jsFiles = fs.readdirSync(agentDir).filter(f => f.endsWith('.js') && !f.endsWith('.cjs'));

  for (const jsFile of jsFiles) {
    const name = path.basename(jsFile, '.js');
    const cjsFile = `${name}.cjs`;
    const mjsFile = `${name}.mjs`;

    // Rename .js to .cjs
    const jsPath = path.join(agentDir, jsFile);
    const cjsPath = path.join(agentDir, cjsFile);
    fs.renameSync(jsPath, cjsPath);

    // Create .mjs wrapper
    const wrapper = `// ESM wrapper - re-export all from CommonJS
export * from './${cjsFile}';
`;

    fs.writeFileSync(path.join(agentDir, mjsFile), wrapper);

    // Copy back for backwards compatibility
    fs.copyFileSync(cjsPath, jsPath);

    console.log(`Created dist/agent/${mjsFile}`);
  }
}

// Run
createMainWrapper();
createProxyWrappers();
createAgentWrappers();
console.log('ESM build complete');
