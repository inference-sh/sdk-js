import {
  LLMDelta_fieldTags,
  ToolCallDelta_fieldTags,
  ToolCallFunctionDelta_fieldTags,
  MergeStrategyConcat,
  MergeStrategyIndexed,
  MergeStrategyNested,
  MergeStrategyReplace,
} from './types';

export type { DeltaEvent } from './types';

export type FieldTags = Record<string, { merge: string }>;
export type FieldTagsRegistry = Map<FieldTags, FieldTags>;

function mergeField(current: any, incoming: any, strategy: string, childTags: FieldTags, registry?: FieldTagsRegistry): any {
  if (incoming == null) return current;
  switch (strategy) {
    case MergeStrategyConcat:
      return (current ?? '') + incoming;
    case MergeStrategyReplace:
      return incoming;
    case MergeStrategyIndexed:
      return mergeIndexed(current, incoming, childTags, registry);
    case MergeStrategyNested:
      return mergeNested(current, incoming, childTags, registry);
    default:
      return incoming;
  }
}

function mergeIndexed(current: any[] | undefined, incoming: any[], itemTags: FieldTags, registry?: FieldTagsRegistry): any[] {
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
      byIndex.set(idx, mergeObject(existing, item, itemTags, registry));
    }
  }
  return Array.from(byIndex.entries())
    .sort(([a], [b]) => a - b)
    .map(([_, v]) => v);
}

function mergeNested(current: any, incoming: any, nestedTags: FieldTags, registry?: FieldTagsRegistry): any {
  if (current == null) return { ...incoming };
  return mergeObject(current, incoming, nestedTags, registry);
}

function mergeObject(current: any, incoming: any, tags: FieldTags, registry?: FieldTagsRegistry): any {
  const result = { ...current };
  const childTags = registry?.get(tags) ?? {};
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null) continue;
    const strategy = tags[key]?.merge ?? MergeStrategyReplace;
    result[key] = mergeField(result[key], value, strategy, childTags, registry);
  }
  return result;
}

export class DeltaAccumulator {
  private state: Record<string, any> = {};
  private tags: FieldTags;
  private registry: FieldTagsRegistry | undefined;

  constructor(tags: FieldTags, registry?: FieldTagsRegistry) {
    this.tags = tags;
    this.registry = registry;
  }

  seed(output: Record<string, any>): void {
    for (const [key, value] of Object.entries(output)) {
      if (value != null) this.state[key] = value;
    }
  }

  apply(delta: Record<string, any>): void {
    const childTags = this.registry?.get(this.tags) ?? {};
    for (const [key, value] of Object.entries(delta)) {
      if (value == null) continue;
      const strategy = this.tags[key]?.merge ?? MergeStrategyReplace;
      this.state[key] = mergeField(this.state[key], value, strategy, childTags, this.registry);
    }
  }

  toOutput(): Record<string, any> {
    return { ...this.state };
  }
}

export function createLLMDeltaAccumulator(): DeltaAccumulator {
  const registry: FieldTagsRegistry = new Map();
  registry.set(LLMDelta_fieldTags as FieldTags, ToolCallDelta_fieldTags as FieldTags);
  registry.set(ToolCallDelta_fieldTags as FieldTags, ToolCallFunctionDelta_fieldTags as FieldTags);
  return new DeltaAccumulator(LLMDelta_fieldTags as FieldTags, registry);
}
