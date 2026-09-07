// evaluation/agent-context/__tests__/parseTrace.test.ts
import { describe, expect, it } from 'vitest';
import { generateReportMarkdown } from '../generateReport';
import { computeMetrics, parseCodexEvents } from '../parseTrace';
import type { EvaluationSummary, TaskDefinition } from '../types';

describe('Phase 5B evaluation trace parser & report generator', () => {
  const mockTask: TaskDefinition = {
    id: 'TASK-01',
    category: 'A',
    categoryName: 'small bug fix',
    task: 'Fix ripgrep client hang',
    primaryEntryPoint: 'src/features/repository-context/infrastructure/search/RipgrepClient.ts',
    requiredRelatedFiles: [],
    requiredTests: [],
    validationCommands: [],
  };

  it('parses codex events accurately', () => {
    const lines = [
      JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: 'rg "spawn" src' } }),
      JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: 'cat src/RipgrepClient.ts' } }),
      JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: 'npm test' } }),
    ];
    const events = parseCodexEvents(lines);
    expect(events).toHaveLength(3);
    expect(events[0].kind).toBe('search');
    expect(events[1].kind).toBe('read');
    expect(events[2].kind).toBe('test');
  });

  it('computes trial metrics for baseline and codeprep conditions', () => {
    const lines = [
      JSON.stringify({ type: 'item.completed', item: { type: 'mcp_tool_call', tool: 'codeprep_discover_entry_points' } }),
      JSON.stringify({ type: 'item.completed', item: { type: 'mcp_tool_call', tool: 'codeprep_build_context_pack' } }),
      JSON.stringify({ type: 'item.completed', item: { type: 'edit', path: 'src/RipgrepClient.ts' } }),
    ];
    const events = parseCodexEvents(lines);
    const metrics = computeMetrics({
      task: mockTask,
      condition: 'codeprep',
      order: 1,
      events,
      rawText: lines.join('\n'),
      durationMs: 5000,
      qualityGatePassed: true,
    });
    expect(metrics.explorationCallsBeforeEdit).toBe(0);
    expect(metrics.postPackExplorationCalls).toBe(0);
    expect(metrics.contextSufficiency).toBe('SUFFICIENT');
    expect(metrics.compliance).toBe('COMPLIANT');
  });

  it('generates markdown report from evaluation summary', () => {
    const summary: EvaluationSummary = {
      evaluatorInfo: {
        agent: 'Codex CLI',
        agentVersion: '0.145.0',
        model: 'gpt-5.6-sol',
        modelVersion: 'gpt-5.6-sol',
        thinkingEffort: 'high',
        os: 'Windows 11',
        nodeVersion: 'v22.23.1',
        codeprepCommit: 'af8ea94',
        embeddingModel: 'nomic-embed-text:latest',
      },
      taskCount: 1,
      results: [
        {
          taskId: 'TASK-01',
          condition: 'baseline',
          executionOrder: 1,
          explorationCallsBeforeEdit: 4,
          postPackExplorationCalls: 0,
          uniqueManualFilesReadBeforeEdit: 3,
          uniqueManualFilesReadTotal: 3,
          totalToolCalls: 6,
          mcpToolCalls: 0,
          editCalls: 1,
          testCalls: 1,
          correctEntryPointInFirst1: false,
          correctEntryPointInFirst3: true,
          correctEntryPointBeforeEdit: true,
          reworkCount: 0,
          timeToFirstEditMs: 2000,
          totalDurationMs: 5000,
          qualityGatePassed: true,
          compliance: 'COMPLIANT',
        },
        {
          taskId: 'TASK-01',
          condition: 'codeprep',
          executionOrder: 2,
          explorationCallsBeforeEdit: 0,
          postPackExplorationCalls: 0,
          uniqueManualFilesReadBeforeEdit: 0,
          uniqueManualFilesReadTotal: 1,
          totalToolCalls: 4,
          mcpToolCalls: 2,
          editCalls: 1,
          testCalls: 1,
          correctEntryPointInFirst1: true,
          correctEntryPointInFirst3: true,
          correctEntryPointBeforeEdit: true,
          contextSufficiency: 'SUFFICIENT',
          reworkCount: 0,
          timeToFirstEditMs: 1500,
          totalDurationMs: 4000,
          qualityGatePassed: true,
          compliance: 'COMPLIANT',
        },
      ],
    };
    const md = generateReportMarkdown(summary);
    expect(md).toContain('# Phase 5B Real Agent Evaluation Report');
    expect(md).toContain('Does CodePrep materially reduce repository exploration?');
    expect(md).toContain('**YES**');
  });
});
