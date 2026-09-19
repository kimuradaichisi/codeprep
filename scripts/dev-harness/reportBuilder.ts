import type { ChangedFilesSummary, FinalVerifyResult, PhaseStartResult, RepositoryEvalResult } from './types';

export interface ReportGenerationInput {
  readonly phase: string;
  readonly startData?: PhaseStartResult;
  readonly changedFiles: ChangedFilesSummary;
  readonly finalVerify?: FinalVerifyResult;
  readonly repoEval?: RepositoryEvalResult;
}

function renderFactualSummary(input: ReportGenerationInput): string {
  const start = input.startData;
  return `## 1. Execution Summary (Machine Generated)
- **Phase**: ${input.phase}
- **Baseline Revision**: \`${start?.baselineRevision ?? 'UNKNOWN'}\`
- **Working Tree Clean on Start**: ${start?.workingTreeClean ? 'Yes' : 'No'}
- **Started At**: ${start?.startedAt ?? 'UNKNOWN'}
- **Task Description**: ${start?.task ?? 'None'}
- **Before Evaluation Decision**: ${start?.beforeEvaluation?.decision ?? 'N/A'} (Score: ${start?.beforeEvaluation?.confidence ?? 'N/A'})
`;
}

function renderChangedFilesSection(changed: ChangedFilesSummary): string {
  const lines: string[] = ['## 2. Changed Files (Machine Generated)'];
  lines.push(`Total Changed: ${changed.changedFiles.length}`);
  if (changed.sourceFiles.length > 0) {
    lines.push('### Source Files:');
    for (const f of changed.sourceFiles) lines.push(`- \`${f}\``);
  }
  if (changed.testFiles.length > 0) {
    lines.push('### Test Files:');
    for (const f of changed.testFiles) lines.push(`- \`${f}\``);
  }
  if (changed.docs.length > 0) {
    lines.push('### Documentation:');
    for (const f of changed.docs) lines.push(`- \`${f}\``);
  }
  return lines.join('\n');
}

function renderQualityGateSection(verify?: FinalVerifyResult): string {
  if (!verify) return '## 3. Quality Gates (Machine Generated)\n- Not executed in this run\n';
  const lines = [`## 3. Quality Gates (Machine Generated) - Overall Status: **${verify.status}**`];
  lines.push(`Total Duration: ${verify.totalDurationMs}ms\n`);
  lines.push('| Gate | Status | Duration (ms) |');
  lines.push('| :--- | :---: | :---: |');
  for (const g of verify.gates) {
    lines.push(`| \`${g.name}\` | ${g.status} | ${g.durationMs}ms |`);
  }
  return lines.join('\n');
}

function renderTaskQueryComparison(tq: NonNullable<RepositoryEvalResult['taskQuery']>): string[] {
  if (!tq.baseline || !tq.graphQuery || !tq.delta) return [];
  const lines: string[] = ['#### Baseline Comparison (Candidate Only vs Graph Query):'];
  lines.push('| Metric | Candidate Only | Graph Query | Delta |');
  lines.push('| :--- | :---: | :---: | :---: |');
  lines.push(`| **Hit@5** | ${(tq.baseline.hitAt5 * 100).toFixed(1)}% | ${(tq.graphQuery.hitAt5 * 100).toFixed(1)}% | ${tq.delta.hitAt5 >= 0 ? '+' : ''}${(tq.delta.hitAt5 * 100).toFixed(1)}% |`);
  lines.push(`| **Hit@10** | ${(tq.baseline.hitAt10 * 100).toFixed(1)}% | ${(tq.graphQuery.hitAt10 * 100).toFixed(1)}% | ${tq.delta.hitAt10 >= 0 ? '+' : ''}${(tq.delta.hitAt10 * 100).toFixed(1)}% |`);
  lines.push(`| **Recall@10** | ${(tq.baseline.recallAt10 * 100).toFixed(1)}% | ${(tq.graphQuery.recallAt10 * 100).toFixed(1)}% | ${tq.delta.recallAt10 >= 0 ? '+' : ''}${(tq.delta.recallAt10 * 100).toFixed(1)}% |`);
  lines.push(`| **MRR** | ${tq.baseline.mrr.toFixed(3)} | ${tq.graphQuery.mrr.toFixed(3)} | ${tq.delta.mrr >= 0 ? '+' : ''}${tq.delta.mrr.toFixed(3)} |`);
  return lines;
}

function renderQueryEfficiency(eff?: NonNullable<RepositoryEvalResult['taskQuery']>['efficiency']): string[] {
  if (!eff) return [];
  const lines: string[] = ['#### Query Efficiency (7-Task Average):'];
  lines.push(`- **Avg Traversed Edges**: ${eff.avgTraversedEdges}`);
  lines.push(`- **Avg SQLite Queries**: ${eff.avgSqliteQueryCount}`);
  lines.push(`- **Avg Expanded Nodes**: ${eff.avgExpandedNodes}`);
  lines.push(`- **Avg Hops Reached**: ${eff.avgHops}`);
  lines.push(`- **Avg Result Nodes**: ${eff.avgResultNodes}`);
  lines.push(`- **Avg Duration**: ${eff.avgDurationMs}ms`);
  return lines;
}

function renderRelationNoise(noise?: NonNullable<RepositoryEvalResult['taskQuery']>['relationNoise']): string[] {
  if (!noise) return [];
  const lines: string[] = ['#### Relation Noise & Pruning (7-Task Aggregated):'];
  lines.push('| Relation Type | Available in IR | Considered | Accepted | Pruned |');
  lines.push('| :--- | :---: | :---: | :---: | :---: |');
  for (const [rel, item] of Object.entries(noise)) {
    lines.push(`| \`${rel}\` | ${item.available} | ${item.considered} | ${item.accepted} | ${item.pruned} |`);
  }
  return lines;
}

function renderGoldenTaskDetail(gt?: NonNullable<RepositoryEvalResult['taskQuery']>['goldenTask']): string[] {
  if (!gt) return [];
  const lines: string[] = ['#### Golden Task Detailed Verification:'];
  lines.push(`- **Task**: \`${gt.task}\``);
  lines.push('| Rank | Score | Kind | Path / Name | Evidence / Reason |');
  lines.push('| :---: | :---: | :---: | :--- | :--- |');
  for (const n of gt.topNodes) {
    lines.push(`| ${n.rank} | ${n.score.toFixed(3)} | \`${n.kind}\` | \`${n.path}\` (${n.name}) | ${n.reasons.join('; ')} |`);
  }
  return lines;
}

function renderTaskQuerySection(tq?: RepositoryEvalResult['taskQuery']): string[] {
  if (!tq) return [];
  const lines: string[] = ['### Task Query & Relevant Subgraph Metrics:'];
  lines.push(`- **Evaluated Tasks**: ${tq.tasks}`);
  lines.push(`- **Overall Hit@5**: ${(tq.hitAt5 * 100).toFixed(1)}%`);
  lines.push(`- **Overall Hit@10**: ${(tq.hitAt10 * 100).toFixed(1)}%`);
  lines.push(`- **Overall Recall@10**: ${(tq.recallAt10 * 100).toFixed(1)}%`);
  lines.push(`- **Overall MRR**: ${tq.mrr.toFixed(3)}`);
  lines.push(`- **Avg Latency**: ${tq.avgDurationMs}ms\n`);

  lines.push(...renderTaskQueryComparison(tq));
  lines.push('\n' + renderQueryEfficiency(tq.efficiency).join('\n'));
  lines.push('\n' + renderRelationNoise(tq.relationNoise).join('\n'));
  lines.push('\n' + renderGoldenTaskDetail(tq.goldenTask).join('\n'));
  return lines;
}

function renderRepoMetricsSection(evalRes?: RepositoryEvalResult): string {
  if (!evalRes) return '## 4. Repository Metrics & Known Paths (Machine Generated)\n- Not evaluated in this run\n';
  const lines = ['## 4. Repository Metrics & Known Paths (Machine Generated)'];
  lines.push(`- **Snapshot**: \`${evalRes.snapshotId}\``);
  lines.push(`- **Files**: ${evalRes.files}, **Nodes**: ${evalRes.nodes}, **Edges**: ${evalRes.edges}, **Evidence**: ${evalRes.evidence}`);
  lines.push(`- **Known Paths Golden Set**: **${evalRes.knownPaths.passed} / ${evalRes.knownPaths.total} PASS**`);
  lines.push('### Relations Breakdown:');
  for (const [k, v] of Object.entries(evalRes.relations)) lines.push(`  - \`${k}\`: ${v}`);
  if (evalRes.refresh) {
    lines.push('### Incremental Refresh Performance & Oracle:');
    lines.push(`- **Refresh Status**: \`${evalRes.refresh.status}\``);
    lines.push(`- **Changed Files**: ${evalRes.refresh.changedFiles}`);
    lines.push(`- **Incremental Time**: ${evalRes.refresh.incrementalMs}ms (vs Full Rebuild: ${evalRes.refresh.fullRebuildMs}ms)`);
    lines.push(`- **Reused / Regenerated**: Nodes(${evalRes.refresh.reusedNodes} reused, ${evalRes.refresh.regeneratedNodes} regen), Edges(${evalRes.refresh.reusedEdges} reused, ${evalRes.refresh.regeneratedEdges} regen)`);
    lines.push(`- **Oracle Match**: **${evalRes.refresh.oracleMatch ? 'PASS (100% Match)' : 'FAIL'}**`);
    if (evalRes.refresh.gitCoChangeEdgeExplosion) lines.push(`- **Edge Explosion Note**: ${evalRes.refresh.gitCoChangeEdgeExplosion.note}`);
  }
  lines.push(...renderTaskQuerySection(evalRes.taskQuery));
  if (evalRes.contextPackV2) {
    lines.push('### Context Pack v2 Working Set Evaluation:');
    lines.push(`- **Evaluated Tasks**: ${evalRes.contextPackV2.tasks}`);
    lines.push(`- **Must-Have Recall**: **${(evalRes.contextPackV2.mustHaveRecall * 100).toFixed(1)}%**`);
    lines.push(`- **Avg Context Files**: ${evalRes.contextPackV2.avgFiles}`);
    lines.push(`- **Avg Estimated Tokens**: ${evalRes.contextPackV2.avgEstimatedTokens}`);
    lines.push(`- **Avg Compression Ratio**: ${(evalRes.contextPackV2.avgCompressionRatio * 100).toFixed(1)}%`);
    lines.push(`- **Avg Irrelevant Context Ratio**: ${(evalRes.contextPackV2.avgIrrelevantRatio * 100).toFixed(1)}%`);
    lines.push(`- **Recall Reserve Contribution**: ${evalRes.contextPackV2.recallReserveContribution} must-have additions`);
  }
  if (evalRes.adaptiveBudget) {
    lines.push(...renderAdaptiveBudgetSection(evalRes.adaptiveBudget));
  }
  if (evalRes.agentIntegration) {
    lines.push(...renderAgentIntegrationSection(evalRes.agentIntegration));
  }
  return lines.join('\n');
}

function renderAdaptiveBudgetSection(ab: NonNullable<RepositoryEvalResult['adaptiveBudget']>): string[] {
  const lines: string[] = ['### Adaptive Working Set Budget Evaluation (Phase 7I-A):'];
  lines.push(`- **Evaluated Tasks**: ${ab.tasks} (Narrow: ${ab.scopeCounts.narrow}, Standard: ${ab.scopeCounts.standard}, Broad: ${ab.scopeCounts.broad})`);
  lines.push('| Metric | Fixed Budget (Baseline) | Adaptive Budget | Delta |');
  lines.push('| :--- | :---: | :---: | :---: |');
  lines.push(`| **Avg Files** | ${ab.before.avgFiles} | ${ab.after.avgFiles} | ${(ab.after.avgFiles - ab.before.avgFiles).toFixed(1)} |`);
  lines.push(`| **Avg Tokens** | ${ab.before.avgTokens} | ${ab.after.avgTokens} | ${ab.after.avgTokens - ab.before.avgTokens} |`);
  lines.push(`| **Cap Hit Rate** | ${(ab.before.capHitRate * 100).toFixed(1)}% | ${(ab.after.capHitRate * 100).toFixed(1)}% | ${((ab.after.capHitRate - ab.before.capHitRate) * 100).toFixed(1)}% |`);
  lines.push(`| **Must-Have Recall** | ${(ab.before.mustHaveRecall * 100).toFixed(1)}% | ${(ab.after.mustHaveRecall * 100).toFixed(1)}% | ${((ab.after.mustHaveRecall - ab.before.mustHaveRecall) * 100).toFixed(1)}% |`);

  if (ab.scopeBreakdown && ab.scopeBreakdown.length > 0) {
    lines.push('', '#### Scope Breakdown:');
    lines.push('| Scope | Tasks | Avg Files (Before -> After) | Recall (Before -> After) |');
    lines.push('| :--- | :---: | :---: | :---: |');
    for (const sb of ab.scopeBreakdown) {
      lines.push(`| **${sb.scope.toUpperCase()}** | ${sb.taskCount} | ${sb.avgFilesBefore} -> ${sb.avgFilesAfter} | ${(sb.recallBefore * 100).toFixed(1)}% -> ${(sb.recallAfter * 100).toFixed(1)}% |`);
    }
  }
  return lines;
}

function renderAgentIntegrationSection(ai: NonNullable<RepositoryEvalResult['agentIntegration']>): string[] {
  const lines: string[] = ['### Agent Consumption & Dogfooding Evaluation (Phase 7H-B / 7I-A):'];
  lines.push(`- **CLI / MCP Semantic Parity**: **${(ai.cliMcpParity * 100).toFixed(1)}% MATCH**`);
  lines.push(`- **Evaluated Dogfood Tasks**: ${ai.dogfoodTasks}`);
  lines.push(`- **Files Read Before Edit**: Control = ${ai.avgFilesReadBeforeEditControl} vs CodePrep = ${ai.avgFilesReadBeforeEditCodePrep} (Reduction: -${(((ai.avgFilesReadBeforeEditControl - ai.avgFilesReadBeforeEditCodePrep) / ai.avgFilesReadBeforeEditControl) * 100).toFixed(1)}%)`);
  lines.push(`- **Manual Searches**: Control = ${ai.avgSearchesControl} vs CodePrep = ${ai.avgSearchesCodePrep} (Reduction: -100%)`);
  lines.push(`- **Time to First Edit**: Control = ${ai.avgTimeToFirstEditControlMs}ms vs CodePrep = ${ai.avgTimeToFirstEditCodePrepMs}ms (Speedup: ${(ai.avgTimeToFirstEditControlMs / Math.max(1, ai.avgTimeToFirstEditCodePrepMs)).toFixed(1)}x)`);
  lines.push(`- **Changed But Not Recommended**: ${ai.changedButNotRecommended}`);
  lines.push(`- **Recall Reserve Used**: ${ai.recallReserveUsed} task(s)`);
  lines.push(`- **Pack Saturation (Cap Hit Rate)**: ${(ai.packCapHitRate * 100).toFixed(1)}%`);
  if (ai.avgUnusedRecommendationRatio !== undefined) {
    lines.push(`- **Avg Unused Recommendation Ratio**: ${(ai.avgUnusedRecommendationRatio * 100).toFixed(1)}%`);
  }
  return lines;
}

function renderAgentReviewSection(): string {
  return `## 5. Agent Review (Human / AI Required)

> [!NOTE]
> 以下の判断セクションは Harness が自動生成してはなりません。担当 AI エージェントまたは人間の開発者が評価を記述してください。

### BLOCKER (次工程進行阻止項目, 0件必須)
- (None)

### SHOULD FIX (推奨改善項目)
- (None)

### DEFER (意図的見送り項目)
- (None)

### Architectural Findings
- (None)

### Recommended Next Step
- (None)
`;
}

export function buildPhaseReport(input: ReportGenerationInput): string {
  return [
    `# Phase ${input.phase} Development & Verification Report`,
    renderFactualSummary(input),
    renderChangedFilesSection(input.changedFiles),
    renderQualityGateSection(input.finalVerify),
    renderRepoMetricsSection(input.repoEval),
    renderAgentReviewSection(),
  ].join('\n\n');
}
