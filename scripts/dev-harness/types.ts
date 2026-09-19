export interface PhaseStartOptions {
  readonly phase: string;
  readonly task?: string;
  readonly taskFile?: string;
  readonly format?: 'text' | 'json';
}

export interface PhaseStartResult {
  readonly schemaVersion: string;
  readonly phase: string;
  readonly baselineRevision: string;
  readonly workingTreeClean: boolean;
  readonly startedAt: string;
  readonly task: string;
  readonly beforeEvaluation?: Readonly<{
    decision: string;
    confidence: number;
    rawOutput?: unknown;
  }>;
}

export interface ChangedFilesSummary {
  readonly changedFiles: readonly string[];
  readonly sourceFiles: readonly string[];
  readonly testFiles: readonly string[];
  readonly docs: readonly string[];
}

export interface FastVerifyResult {
  readonly status: 'PASS' | 'FAIL';
  readonly changedFiles: number;
  readonly standards: {
    readonly status: 'PASS' | 'FAIL';
    readonly details?: string;
  };
  readonly compile: {
    readonly status: 'PASS' | 'FAIL';
    readonly details?: string;
  };
  readonly tests: {
    readonly executed: number;
    readonly passed: number;
    readonly failed: number;
    readonly unresolvedTargets: readonly string[];
  };
}

export interface QualityGateItem {
  readonly name: string;
  readonly status: 'PASS' | 'FAIL';
  readonly durationMs: number;
  readonly details?: string;
}

export interface FinalVerifyResult {
  readonly status: 'PASS' | 'FAIL';
  readonly gates: readonly QualityGateItem[];
  readonly totalDurationMs: number;
}

export interface KnownPathCase {
  readonly id: string;
  readonly source: string;
  readonly relation: string;
  readonly target: string;
  readonly description?: string;
}

export interface KnownPathsEvalResult {
  readonly passed: number;
  readonly failed: number;
  readonly total: number;
  readonly failures: readonly Readonly<{
    readonly id: string;
    readonly reason: string;
  }>[];
}

export interface RepositoryEvalResult {
  readonly snapshotId: string;
  readonly files: number;
  readonly nodes: number;
  readonly edges: number;
  readonly evidence: number;
  readonly relations: Readonly<Record<string, number>>;
  readonly knownPaths: KnownPathsEvalResult;
  readonly performance: Readonly<{
    sessionSetupMs?: number;
    structuredKnowledgeMs?: number;
    languageAnalysisMs?: number;
    wiringAnalysisMs?: number;
    dependencyMs?: number;
    gitCoChangeMs?: number;
    docGraphMs?: number;
    saveMs?: number;
    loadMs?: number;
    neighborQueryMs?: number;
    totalMs: number;
    dbSizeBytes?: number;
    heapDeltaMb?: number;
  }>;
  readonly refresh?: Readonly<{
    status: string;
    changedFiles: number;
    incrementalMs: number;
    fullRebuildMs: number;
    reusedNodes: number;
    reusedEdges: number;
    regeneratedNodes: number;
    regeneratedEdges: number;
    oracleMatch: boolean;
    gitCoChangeEdgeExplosion?: {
      note: string;
    };
  }>;
  readonly taskQuery?: Readonly<{
    tasks: number;
    hitAt5: number;
    hitAt10: number;
    recallAt10: number;
    mrr: number;
    avgDurationMs: number;
    baseline?: Readonly<{
      hitAt5: number;
      hitAt10: number;
      recallAt10: number;
      mrr: number;
    }>;
    graphQuery?: Readonly<{
      hitAt5: number;
      hitAt10: number;
      recallAt10: number;
      mrr: number;
    }>;
    delta?: Readonly<{
      hitAt5: number;
      hitAt10: number;
      recallAt10: number;
      mrr: number;
    }>;
    efficiency?: Readonly<{
      avgExpandedNodes: number;
      avgTraversedEdges: number;
      avgSqliteQueryCount: number;
      avgHops: number;
      avgResultNodes: number;
      avgDurationMs: number;
    }>;
    relationNoise?: Readonly<Record<string, {
      available: number;
      considered: number;
      accepted: number;
      pruned: number;
    }>>;
    goldenTask?: Readonly<{
      task: string;
      topNodes: readonly {
        rank: number;
        path: string;
        name: string;
        kind: string;
        score: number;
        reasons: readonly string[];
      }[];
    }>;
  }>;
  readonly contextPackV2?: Readonly<{
    tasks: number;
    mustHaveRecall: number;
    avgFiles: number;
    avgEstimatedTokens: number;
    avgCompressionRatio: number;
    avgIrrelevantRatio: number;
    recallReserveContribution: number;
    details?: readonly unknown[];
  }>;
  readonly agentIntegration?: Readonly<{
    cliMcpParity: number;
    dogfoodTasks: number;
    avgFilesReadBeforeEditControl: number;
    avgFilesReadBeforeEditCodePrep: number;
    avgSearchesControl: number;
    avgSearchesCodePrep: number;
    avgTimeToFirstEditControlMs: number;
    avgTimeToFirstEditCodePrepMs: number;
    changedButNotRecommended: number;
    recallReserveUsed: number;
    packCapHitRate: number;
    tasks?: readonly unknown[];
  }>;
}

export interface PhaseFinishResult {
  readonly schemaVersion: string;
  readonly phase: string;
  readonly finishedAt: string;
  readonly baselineRevision: string;
  readonly finalStatus: 'PASS' | 'FAIL';
  readonly reportPath: string;
}
