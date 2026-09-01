import type { LLMDelta, LLMDeltaEvent, LLMOutput, StringEncodedMap, ToolCallDelta } from './types';
import {
  LLMDelta_fieldTags,
  ToolCallDelta_fieldTags,
  ToolCallFunctionDelta_fieldTags,
  MergeStrategyConcat,
  MergeStrategyIndexed,
  MergeStrategyNested,
  MergeStrategyReplace,
} from './types';

export type { LLMDeltaEvent as DeltaEvent } from './types';

type FieldTags = Record<string, { merge: string }>;

function mergeField(current: any, incoming: any, strategy: string): any {
  if (incoming == null) return current;
  if (strategy === MergeStrategyConcat) {
    return (current ?? '') + incoming;
  }
  if (strategy === MergeStrategyReplace) {
    return incoming;
  }
  if (strategy === MergeStrategyIndexed) {
    return mergeIndexed(current, incoming);
  }
  if (strategy === MergeStrategyNested) {
    return mergeNested(current, incoming);
  }
  return incoming;
}

function mergeIndexed(current: any[] | undefined, incoming: any[]): any[] {
  const byIndex = new Map<number, any>();
  if (current) {
    for (const item of current) byIndex.set(item.index ?? 0, item);
  }
  for (const item of incoming) {
    const idx = item.index ?? 0;
    const existing = byIndex.get(idx);
    if (!existing) {
      byIndex.set(idx, { ...item });
    } else {
      byIndex.set(idx, mergeObject(existing, item, ToolCallDelta_fieldTags));
    }
  }
  return Array.from(byIndex.entries())
    .sort(([a], [b]) => a - b)
    .map(([_, v]) => v);
}

function mergeNested(current: any, incoming: any): any {
  if (current == null) return { ...incoming };
  const tags = ToolCallFunctionDelta_fieldTags as FieldTags;
  return mergeObject(current, incoming, tags);
}

function mergeObject(current: any, incoming: any, tags: FieldTags): any {
  const result = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null) continue;
    const strategy = tags[key]?.merge ?? MergeStrategyConcat;
    if (strategy === MergeStrategyReplace && key in result && !value) continue;
    result[key] = mergeField(result[key], value, strategy);
  }
  return result;
}

export class DeltaAccumulator {
  private state: Record<string, any> = {};

  seed(output: { response?: string; reasoning?: string }): void {
    if (output.response != null) this.state.response = output.response;
    if (output.reasoning != null) this.state.reasoning = output.reasoning;
  }

  apply(delta: LLMDelta): void {
    const tags = LLMDelta_fieldTags as FieldTags;
    for (const [key, value] of Object.entries(delta)) {
      if (value == null) continue;
      const strategy = tags[key]?.merge ?? MergeStrategyConcat;
      if (strategy === MergeStrategyIndexed) {
        this.state[key] = mergeIndexed(this.state[key], value);
      } else {
        this.state[key] = mergeField(this.state[key], value, strategy);
      }
    }
  }

  toOutput(): LLMOutput {
    const output: LLMOutput = { response: this.state.response ?? '' };
    if (this.state.reasoning) output.reasoning = this.state.reasoning;
    if (this.state.tool_calls?.length > 0) {
      output.tool_calls = this.state.tool_calls.map((tc: any) => {
        let args: StringEncodedMap = {};
        const rawArgs = tc.function?.arguments ?? '';
        try {
          args = JSON.parse(rawArgs) as StringEncodedMap;
        } catch {
          // arguments not yet valid JSON — leave empty
        }
        return {
          id: tc.id || '',
          type: tc.type || 'function',
          function: { name: tc.function?.name || '', arguments: args },
        };
      });
    }
    if (this.state.usage) output.usage = this.state.usage;
    return output;
  }
}
