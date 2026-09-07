// evaluation/agent-context/__tests__/parseClaudeTrace.test.ts
import { describe, expect, it } from 'vitest';
import { determineFailureClass, extractClaudeMetrics, parseClaudeEvents } from '../parseClaudeTrace';

describe('parseClaudeTrace', () => {
  it('parses tool use events from assistant stream-json messages', () => {
    const sampleLines = [
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 't1', name: 'Read', input: { file_path: 'src/index.ts' } },
            { type: 'tool_use', id: 't2', name: 'codeprep_discover_entry_points', input: { task: 'foo' } },
          ],
        },
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 't3', name: 'Edit', input: { file_path: 'src/index.ts' } },
          ],
        },
      }),
    ];

    const events = parseClaudeEvents(sampleLines);
    expect(events).toHaveLength(3);
    expect(events[0].kind).toBe('read');
    expect(events[0].isBeforeFirstEdit).toBe(true);
    expect(events[1].kind).toBe('mcp');
    expect(events[2].kind).toBe('edit');
  });

  it('extracts Claude usage metrics from final result line', () => {
    const sample = [
      '{"type":"assistant","message":{"content":[]}}',
      JSON.stringify({
        type: 'result',
        duration_ms: 5400,
        total_cost_usd: 0.0125,
        usage: {
          input_tokens: 150,
          output_tokens: 300,
          cache_read_input_tokens: 2000,
        },
      }),
    ];

    const metrics = extractClaudeMetrics(sample);
    expect(metrics.durationMs).toBe(5400);
    expect(metrics.costUsd).toBe(0.0125);
    expect(metrics.inputTokens).toBe(150);
    expect(metrics.outputTokens).toBe(300);
    expect(metrics.cacheReadTokens).toBe(2000);
  });

  it('determines failure class accurately', () => {
    expect(determineFailureClass({
      passed: true, isCompliant: true, timedOut: false, entryPointIdentified: true, condition: 'codeprep', hasContextPack: true
    })).toBe('SUCCESS');

    expect(determineFailureClass({
      passed: false, isCompliant: true, timedOut: false, entryPointIdentified: false, condition: 'baseline', hasContextPack: false
    })).toBe('ENTRY_POINT_MISS');

    expect(determineFailureClass({
      passed: false, isCompliant: true, timedOut: false, entryPointIdentified: true, condition: 'codeprep', hasContextPack: false
    })).toBe('CONTEXT_GAP');

    expect(determineFailureClass({
      passed: false, isCompliant: true, timedOut: false, entryPointIdentified: true, condition: 'codeprep', hasContextPack: true
    })).toBe('MODEL_REASONING_LIMIT');
  });
});
