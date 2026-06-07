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
export const TaskStatusPending = cjs.TaskStatusPending;
export const TaskStatusProcessing = cjs.TaskStatusProcessing;
export const TaskStatusCompleted = cjs.TaskStatusCompleted;
export const TaskStatusFailed = cjs.TaskStatusFailed;
export const TaskStatusCancelled = cjs.TaskStatusCancelled;
export const ToolTypeApp = cjs.ToolTypeApp;
export const ToolTypeAgent = cjs.ToolTypeAgent;
export const ToolTypeHook = cjs.ToolTypeHook;
export const ToolTypeClient = cjs.ToolTypeClient;
export const ToolTypeInternal = cjs.ToolTypeInternal;
export const ToolInvocationStatusPending = cjs.ToolInvocationStatusPending;
export const ToolInvocationStatusRunning = cjs.ToolInvocationStatusRunning;
export const ToolInvocationStatusCompleted = cjs.ToolInvocationStatusCompleted;
export const ToolInvocationStatusFailed = cjs.ToolInvocationStatusFailed;
export const ToolInvocationStatusAwaitingInput = cjs.ToolInvocationStatusAwaitingInput;
export const VisibilityPrivate = cjs.VisibilityPrivate;
export const VisibilityTeam = cjs.VisibilityTeam;
export const VisibilityPublic = cjs.VisibilityPublic;

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

// Run
createMainWrapper();
createProxyWrappers();
console.log('ESM build complete');
