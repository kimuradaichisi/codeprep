// evaluation/agent-context/types.ts
import type { RepositoryFileKind } from '../../src/features/repository-context/domain/RepositoryIndex';

export type { RepositoryFileKind };

export type TaskCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export type TaskDefinition = Readonly<{
  id: string;
  category: TaskCategory;
  categoryName: string;
  task: string;
  primaryEntryPoint: string;
  requiredRelatedFiles: readonly string[];
  requiredTests: readonly string[];
  validationCommands: readonly string[];
}>;

export type TrialCondition = 'baseline' | 'codeprep';

export type ToolCallKind =
  | 'mcp'
  | 'list'
  | 'search'
  | 'read'
  | 'edit'
  | 'test'
  | 'git'
  | 'other';

export type ParsedToolEvent = Readonly<{
  sequence: number;
  kind: ToolCallKind;
  toolName: string;
  target?: string;
  rawInput?: string;
  isBeforeFirstEdit: boolean;
  isPostPack: boolean;
}>;

export type ContextSufficiency =
  | 'SUFFICIENT'
  | 'MINOR_ADDITIONAL_SEARCH'
  | 'MAJOR_ADDITIONAL_SEARCH'
  | 'WRONG_ENTRY_POINT';

export type AgentTrialResult = Readonly<{
  taskId: string;
  condition: TrialCondition;
  executionOrder: number; // 1 or 2

  explorationCallsBeforeEdit: number;
  postPackExplorationCalls: number;

  uniqueManualFilesReadBeforeEdit: number;
  uniqueManualFilesReadTotal: number;

  totalToolCalls: number;
  mcpToolCalls: number;
  editCalls: number;
  testCalls: number;

  correctEntryPointInFirst1: boolean;
  correctEntryPointInFirst3: boolean;
  correctEntryPointBeforeEdit: boolean;

  codeprepCandidateRank?: number;
  agentSelectedCandidate?: string;

  packEstimatedTokens?: number;
  packFileCount?: number;
  contextFileRecall?: number;

  contextSufficiency?: ContextSufficiency;
  reworkCount: number;

  timeToFirstEditMs: number;
  totalDurationMs: number;

  qualityGatePassed: boolean;
  compliance: 'COMPLIANT' | 'NON_COMPLIANT';
  failureReason?: string;

  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  failureClass?: FailureClass;
  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore?: number;
  adaptiveStrategy?: 'FAST' | 'STANDARD' | 'EXPANDED';
}>;

export type FailureClass =
  | 'SUCCESS'
  | 'ENTRY_POINT_MISS'
  | 'CONTEXT_GAP'
  | 'MODEL_REASONING_LIMIT'
  | 'IMPLEMENTATION_ERROR'
  | 'COMPLIANCE_ERROR'
  | 'TIMEOUT';

export type EvaluationSummary = Readonly<{
  evaluatorInfo: {
    agent: string;
    agentVersion: string;
    model: string;
    modelVersion: string;
    thinkingEffort: string;
    os: string;
    nodeVersion: string;
    codeprepCommit: string;
    embeddingModel: string;
  };
  taskCount: number;
  results: readonly AgentTrialResult[];
}>;

