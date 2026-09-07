// evaluation/kairos-exploration/runPhase6EEvaluation.ts
import { writeFileSync } from 'fs';
import { join } from 'path';
import { runKairosTrial } from './runKairosTrial';
import type { KairosTrialResult } from './types';

function printSummaryTable(baseline: KairosTrialResult, codeprep: KairosTrialResult): void {
  const b = baseline.metrics;
  const c = codeprep.metrics;
  const calcDelta = (vB: number, vC: number) => {
    if (vB === 0) return '0%';
    const pct = (((vC - vB) / vB) * 100).toFixed(1);
    return `${pct}%`;
  };

  console.log('\n===============================================================');
  console.log('       PHASE 6E: KAIROS × SONNET EXPLORATION COMPRESSION      ');
  console.log('===============================================================');
  console.log(`| Metric                         | Sonnet-only | Sonnet+CodePrep | Delta    |`);
  console.log(`|:-------------------------------|------------:|----------------:|---------:|`);
  console.log(`| Unique Files Read              | ${String(b.uniqueFilesRead).padStart(11)} | ${String(c.uniqueFilesRead).padStart(15)} | ${calcDelta(b.uniqueFilesRead, c.uniqueFilesRead).padStart(8)} |`);
  console.log(`| Unique Source Files Read       | ${String(b.uniqueSourceFilesRead).padStart(11)} | ${String(c.uniqueSourceFilesRead).padStart(15)} | ${calcDelta(b.uniqueSourceFilesRead, c.uniqueSourceFilesRead).padStart(8)} |`);
  console.log(`| Unique Docs Read               | ${String(b.uniqueDocsRead).padStart(11)} | ${String(c.uniqueDocsRead).padStart(15)} | ${calcDelta(b.uniqueDocsRead, c.uniqueDocsRead).padStart(8)} |`);
  console.log(`| Unique Directories Explored    | ${String(b.uniqueDirectoriesExplored).padStart(11)} | ${String(c.uniqueDirectoriesExplored).padStart(15)} | ${calcDelta(b.uniqueDirectoriesExplored, c.uniqueDirectoriesExplored).padStart(8)} |`);
  console.log(`| Search / Grep Calls            | ${String(b.searchGrepCalls).padStart(11)} | ${String(c.searchGrepCalls).padStart(15)} | ${calcDelta(b.searchGrepCalls, c.searchGrepCalls).padStart(8)} |`);
  console.log(`| Total Tool Calls               | ${String(b.totalToolCalls).padStart(11)} | ${String(c.totalToolCalls).padStart(15)} | ${calcDelta(b.totalToolCalls, c.totalToolCalls).padStart(8)} |`);
  console.log(`| Duration (sec)                 | ${(b.totalDurationMs / 1000).toFixed(1).padStart(11)} | ${(c.totalDurationMs / 1000).toFixed(1).padStart(15)} | ${calcDelta(b.totalDurationMs, c.totalDurationMs).padStart(8)} |`);
  console.log(`| Total Cost ($)                 | ${b.totalCostUsd.toFixed(4).padStart(11)} | ${c.totalCostUsd.toFixed(4).padStart(15)} | ${calcDelta(b.totalCostUsd, c.totalCostUsd).padStart(8)} |`);
  console.log(`| Quality Score (max 100)        | ${String(baseline.score.totalScore).padStart(11)} | ${String(codeprep.score.totalScore).padStart(15)} | ${calcDelta(baseline.score.totalScore, codeprep.score.totalScore).padStart(8)} |`);
  console.log('===============================================================\n');
}

export async function main(): Promise<void> {
  console.log('[Phase 6E] Starting Project KAIROS Exploration Compression Evaluation...');
  const baselineResult = await runKairosTrial('sonnet-only', 1);
  const codeprepResult = await runKairosTrial('sonnet-codeprep', 2);

  printSummaryTable(baselineResult, codeprepResult);

  const summary = {
    task: 'TASK-01',
    model: 'sonnet',
    kairosCommit: '0f6a732',
    codeprepCommit: '39c82b3',
    trials: [baselineResult, codeprepResult],
  };

  const path = join(process.cwd(), 'evaluation', 'kairos-exploration', 'results', 'phase-6e-summary.json');
  writeFileSync(path, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`[Phase 6E] Completed! Saved summary to ${path}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[Error] Phase 6E evaluation failed:', err);
    process.exit(1);
  });
}
