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

function renderRepoMetricsSection(evalRes?: RepositoryEvalResult): string {
  if (!evalRes) return '## 4. Repository Metrics & Known Paths (Machine Generated)\n- Not evaluated in this run\n';
  const lines = ['## 4. Repository Metrics & Known Paths (Machine Generated)'];
  lines.push(`- **Snapshot**: \`${evalRes.snapshotId}\``);
  lines.push(`- **Files**: ${evalRes.files}, **Nodes**: ${evalRes.nodes}, **Edges**: ${evalRes.edges}, **Evidence**: ${evalRes.evidence}`);
  lines.push(`- **Known Paths Golden Set**: **${evalRes.knownPaths.passed} / ${evalRes.knownPaths.total} PASS**`);
  lines.push('### Relations Breakdown:');
  for (const [k, v] of Object.entries(evalRes.relations)) {
    lines.push(`  - \`${k}\`: ${v}`);
  }
  if (evalRes.refresh) {
    lines.push('### Incremental Refresh Performance & Oracle:');
    lines.push(`- **Refresh Status**: \`${evalRes.refresh.status}\``);
    lines.push(`- **Changed Files**: ${evalRes.refresh.changedFiles}`);
    lines.push(`- **Incremental Time**: ${evalRes.refresh.incrementalMs}ms (vs Full Rebuild: ${evalRes.refresh.fullRebuildMs}ms)`);
    lines.push(`- **Reused / Regenerated**: Nodes(${evalRes.refresh.reusedNodes} reused, ${evalRes.refresh.regeneratedNodes} regen), Edges(${evalRes.refresh.reusedEdges} reused, ${evalRes.refresh.regeneratedEdges} regen)`);
    lines.push(`- **Oracle Match**: **${evalRes.refresh.oracleMatch ? 'PASS (100% Match)' : 'FAIL'}**`);
    if (evalRes.refresh.gitCoChangeEdgeExplosion) {
      lines.push(`- **Edge Explosion Note**: ${evalRes.refresh.gitCoChangeEdgeExplosion.note}`);
    }
  }
  return lines.join('\n');
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
