// evaluation/kairos-exploration/runKairosTrial.ts
import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildKairosPrompt, TASK_01_ID } from './taskDefinition';
import { aggregateMetrics } from './metricsAggregator';
import { extractFinalAnswer, parseToolEvents } from './traceParser';
import { scoreAnswer } from './goldFactsScorer';
import type { KairosCondition, KairosTrialResult } from './types';

const KAIROS_ROOT = 'D:/git/project-kairos';

function buildClaudeArgs(cond: KairosCondition, codeprepRoot: string): readonly string[] {
  const cfg = cond === 'sonnet-codeprep' ? 'mcp-kairos.json' : 'mcp-empty.json';
  const mcpPath = join(codeprepRoot, 'evaluation', 'kairos-exploration', cfg);
  return [
    '--model', 'sonnet',
    '--strict-mcp-config',
    '--mcp-config', mcpPath,
    '--no-session-persistence',
    '--dangerously-skip-permissions',
    '--verbose',
    '--output-format', 'stream-json',
    '--print',
  ];
}

function spawnClaude(args: readonly string[], prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude.cmd', args as string[], { cwd: KAIROS_ROOT, shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    proc.stdout?.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      if (s.includes('"type":"assistant"')) process.stdout.write('.');
    });
    proc.on('close', () => resolve(stdout));
    proc.on('error', reject);
    proc.stdin?.write(prompt + '\n');
    proc.stdin?.end();
  });
}

function persistTrial(root: string, id: string, stdout: string, result: KairosTrialResult): void {
  const traceDir = join(root, 'evaluation', 'kairos-exploration', 'traces');
  const resDir = join(root, 'evaluation', 'kairos-exploration', 'results');
  if (!existsSync(traceDir)) mkdirSync(traceDir, { recursive: true });
  if (!existsSync(resDir)) mkdirSync(resDir, { recursive: true });
  writeFileSync(join(traceDir, `${id}.jsonl`), stdout, 'utf-8');
  writeFileSync(join(resDir, `${id}.json`), JSON.stringify(result, null, 2), 'utf-8');
}

export async function runKairosTrial(condition: KairosCondition, order: number): Promise<KairosTrialResult> {
  const codeprepRoot = process.cwd();
  const prompt = buildKairosPrompt(condition);
  const args = buildClaudeArgs(condition, codeprepRoot);
  console.log(`\n>>> Starting Project KAIROS Trial: ${condition} (Order: ${order})`);
  const stdout = await spawnClaude(args, prompt);

  const lines = stdout.split('\n');
  const events = parseToolEvents(lines);
  const metrics = aggregateMetrics(events, lines);
  const finalAnswer = extractFinalAnswer(lines);
  const score = scoreAnswer(finalAnswer);

  const result: KairosTrialResult = {
    taskId: TASK_01_ID, condition, executionOrder: order, model: 'sonnet',
    kairosCommit: '0f6a732', codeprepCommit: '39c82b3', timestamp: new Date().toISOString(),
    metrics, score, finalAnswer,
  };

  persistTrial(codeprepRoot, `${TASK_01_ID}-${condition}`, stdout, result);
  return result;
}
