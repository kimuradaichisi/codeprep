// src/features/repository-context/infrastructure/evaluation/__tests__/AgentConsumptionEvaluator.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { AgentConsumptionEvaluator } from '../AgentConsumptionEvaluator';

describe('AgentConsumptionEvaluator', () => {
  it('evaluates dogfood tasks and returns structured agent consumption metrics', async () => {
    const evaluator = new AgentConsumptionEvaluator();
    // Use test database if exists, or evaluate on current workspace
    const workspaceRoot = process.cwd();
    const dbPath = `${workspaceRoot}/.codeprep/repository-knowledge.db`;

    const result = await evaluator.evaluate(workspaceRoot, dbPath, 'eval-head');

    expect(result.cliMcpParity).toBe(1.0);
    expect(result.dogfoodTasks).toBe(3);
    expect(result.changedButNotRecommended).toBeLessThanOrEqual(1);
    expect(result.recallReserveUsed).toBeGreaterThanOrEqual(0);
    expect(result.tasks).toHaveLength(3);
  }, 30000);
});
