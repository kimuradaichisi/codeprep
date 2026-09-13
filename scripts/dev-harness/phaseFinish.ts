import * as fs from 'node:fs';
import * as path from 'node:path';
import { outputHarnessResult } from './commandRunner';
import { detectChangedFiles } from './changedFiles';
import { buildPhaseReport } from './reportBuilder';
import type { FinalVerifyResult, PhaseFinishResult, PhaseStartResult, RepositoryEvalResult } from './types';

function readJsonFile<T>(filePath: string): T | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return undefined;
  }
}

function parseFinishArgs(args: readonly string[]): { phase: string; format: 'text' | 'json' } {
  let phase = 'current';
  let format: 'text' | 'json' = 'text';
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phase' && args[i + 1]) phase = args[++i];
    else if (args[i] === '--format' && args[i + 1] === 'json') format = 'json';
    else if (!args[i].startsWith('--')) positional.push(args[i]);
  }
  if (phase === 'current' && positional.length > 0) phase = positional[0];
  return { phase, format };
}

function saveFinishArtifacts(phaseDir: string, reportMarkdown: string, finishResult: PhaseFinishResult): void {
  fs.writeFileSync(path.join(phaseDir, 'phase-report.md'), reportMarkdown, 'utf-8');
  fs.writeFileSync(path.join(phaseDir, 'finish.json'), JSON.stringify(finishResult, null, 2), 'utf-8');
}

function printFinishSummary(res: PhaseFinishResult): void {
  console.log(`[Phase Finish: ${res.phase}] Status: ${res.finalStatus}`);
  console.log(`- Report generated at: ${res.reportPath}`);
  console.log('- Reminder: Review Gate (BLOCKER/SHOULD FIX/DEFER) must be reviewed by the Agent.');
  console.log('- Harness will NOT commit. Please review changes before git commit.');
}

export function executePhaseFinish(args: readonly string[]): PhaseFinishResult {
  const { phase, format } = parseFinishArgs(args);
  const phaseDir = path.resolve(process.cwd(), '.codeprep/dev-harness', phase);
  const startData = readJsonFile<PhaseStartResult>(path.join(phaseDir, 'start.json'));
  const repoEval = readJsonFile<RepositoryEvalResult>(path.join(phaseDir, 'repository-eval.json'));
  const finalVerify = readJsonFile<FinalVerifyResult>(path.join(phaseDir, 'final-verify.json'));
  const changedFiles = detectChangedFiles();

  const reportMarkdown = buildPhaseReport({ phase, startData, changedFiles, finalVerify, repoEval });
  const reportPath = path.join(phaseDir, 'phase-report.md');
  const finishResult: PhaseFinishResult = {
    schemaVersion: '1', phase, finishedAt: new Date().toISOString(),
    baselineRevision: startData?.baselineRevision ?? 'UNKNOWN',
    finalStatus: finalVerify ? finalVerify.status : 'PASS', reportPath,
  };

  saveFinishArtifacts(phaseDir, reportMarkdown, finishResult);
  outputHarnessResult(finishResult, format, () => printFinishSummary(finishResult));
  return finishResult;
}

if (require.main === module) {
  const res = executePhaseFinish(process.argv.slice(2));
  if (res.finalStatus === 'FAIL') process.exit(1);
}
