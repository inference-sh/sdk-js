import type { LLMDelta, LLMDeltaEvent, LLMOutput, StringEncodedMap } from './types';

export type { LLMDeltaEvent as DeltaEvent } from './types';

export class DeltaAccumulator {
  private response = '';
  private reasoning = '';
  private toolCalls: Map<number, { id?: string; type?: string; name?: string; arguments: string }> = new Map();

  seed(output: { response?: string; reasoning?: string }): void {
    if (output.response != null) this.response = output.response;
    if (output.reasoning != null) this.reasoning = output.reasoning;
  }

  apply(delta: LLMDelta): void {
    this.response += delta.response || '';
    if (delta.reasoning) this.reasoning += delta.reasoning;
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const existing = this.toolCalls.get(tc.index) || { arguments: '' };
        if (tc.id) existing.id = tc.id;
        if (tc.type) existing.type = tc.type;
        if (tc.function?.name) existing.name = tc.function.name;
        if (tc.function?.arguments) existing.arguments += tc.function.arguments;
        this.toolCalls.set(tc.index, existing);
      }
    }
  }

  toOutput(): LLMOutput {
    const output: LLMOutput = { response: this.response };
    if (this.reasoning) output.reasoning = this.reasoning;
    if (this.toolCalls.size > 0) {
      output.tool_calls = Array.from(this.toolCalls.entries())
        .sort(([a], [b]) => a - b)
        .map(([_, tc]) => {
          let args: StringEncodedMap = {};
          try {
            args = JSON.parse(tc.arguments) as StringEncodedMap;
          } catch {
            // arguments not yet valid JSON — leave empty
          }
          return {
            id: tc.id || '',
            type: tc.type || 'function',
            function: { name: tc.name || '', arguments: args },
          };
        });
    }
    return output;
  }
}
