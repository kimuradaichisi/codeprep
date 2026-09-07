// evaluation/kairos-exploration/types.ts

export type KairosCondition = 'sonnet-only' | 'sonnet-codeprep';

export type ToolCallKind =
  | 'mcp'
  | 'list'
  | 'search'
  | 'read'
  | 'git'
  | 'other';

export type ParsedToolEvent = Readonly<{
  sequence: number;
  kind: ToolCallKind;
  toolName: string;
  target?: string;
  rawInput?: string;
}>;

export type ExplorationMetrics = Readonly<{
  totalDurationMs: number;
  uniqueFilesRead: number;
  uniqueSourceFilesRead: number;
  uniqueDocsRead: number;
  uniqueDirectoriesExplored: number;
  searchGrepCalls: number;
  mcpCalls: number;
  contextPackCalls: number;
  postCodePrepManualReads: number;
  duplicateReads: number;
  totalToolCalls: number;
  inputTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  totalCostUsd: number;
}>;

export type GoldFactId =
  | 'GOLD-1-REAL-DAILY-CLI'
  | 'GOLD-2-SCHEDULER-API-FLOW'
  | 'GOLD-3-STARTUP-USECASE'
  | 'GOLD-4-PAPER-MARKET-SAFETY'
  | 'GOLD-5-SCREENING-NO-MMTW'
  | 'GOLD-6-SIGNAL-CHECK-TRAP'
  | 'GOLD-7-REAL-TRADE-SETUP-NO-MMTW'
  | 'GOLD-8-REAL-TRADING-MANUAL'
  | 'GOLD-9-REGISTER-REAL-TRADE-LEGACY'
  | 'GOLD-10-MMTW-THRESHOLDS-HARDCODE';

export type GoldFactAssessment = Readonly<{
  id: GoldFactId;
  name: string;
  weight: number;
  achieved: boolean;
  notes: string;
}>;

export type CriticalError = Readonly<{
  name: string;
  penalty: number;
  detected: boolean;
  notes: string;
}>;

export type ScoringResult = Readonly<{
  totalScore: number;
  entryPointScore: number; // max 15
  schedulerApiScore: number; // max 10
  screeningScore: number; // max 10
  paperScore: number; // max 10
  realFlowScore: number; // max 15
  mmtwConsistencyScore: number; // max 20
  realTradingSemanticsScore: number; // max 10
  docDriftScore: number; // max 5
  disconnectedComponentScore: number; // max 5
  penalties: number;
  goldFacts: readonly GoldFactAssessment[];
  criticalErrors: readonly CriticalError[];
}>;

export type KairosTrialResult = Readonly<{
  taskId: string;
  condition: KairosCondition;
  executionOrder: number;
  model: string;
  kairosCommit: string;
  codeprepCommit: string;
  timestamp: string;
  metrics: ExplorationMetrics;
  score: ScoringResult;
  finalAnswer: string;
}>;
