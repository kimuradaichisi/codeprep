import * as fs from 'node:fs';
import * as path from 'node:path';
import { runShellCommand, outputHarnessResult } from './commandRunner';
import { detectChangedFiles } from './changedFiles';
import type { FastVerifyResult, FinalVerifyResult, QualityGateItem } from './types';

function findColocatedTest(srcFile: string): string | undefined {
  const dir = path.dirname(srcFile);
  const base = path.basename(srcFile, path.extname(srcFile));
  const candidates = [
    path.join(dir, `${base}.test.ts`),
    path.join(dir, `${base}.test.tsx`),
    path.join(dir, '__tests__', `${base}.test.ts`),
    path.join(dir, '__tests__', `${base}.test.tsx`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c.replace(/\\/g, '/');
  }
  return undefined;
}

function discoverAffectedTests(sourceFiles: readonly string[]): { targets: string[]; unresolved: string[] } {
  const targets: string[] = [];
  const unresolved: string[] = [];
  for (const src of sourceFiles) {
    const testFile = findColocatedTest(src);
    if (testFile) targets.push(testFile);
    else unresolved.push(src);
  }
  return { targets: Array.from(new Set(targets)), unresolved };
}

function runIndividualTests(testFiles: readonly string[]): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;
  for (const testFile of testFiles) {
    const res = runShellCommand('npx', ['vitest', 'run', testFile]);
    if (res.success) passed++;
    else failed++;
  }
  return { passed, failed };
}

function printFastSummary(res: FastVerifyResult, testCount: number, passed: number, unresolvedCount: number): void {
  console.log(`[Fast Verify: ${res.status}]`);
  console.log(`- Changed files: ${res.changedFiles}`);
  console.log(`- Standards: ${res.standards.status}, Compile: ${res.compile.status}`);
  console.log(`- Tests: ${passed}/${testCount} PASS (Unresolved: ${unresolvedCount})`);
}

export function executeFastVerify(format: 'text' | 'json' = 'text'): FastVerifyResult {
  const changed = detectChangedFiles();
  const stdRes = runShellCommand('npm', ['run', 'lint:standards:changed']);
  const tscRes = runShellCommand('npx', ['tsc', '-p', './', '--noEmit']);
  const { targets, unresolved } = discoverAffectedTests(changed.sourceFiles);
  const uniqueTests = Array.from(new Set([...changed.testFiles, ...targets]));
  const testResults = runIndividualTests(uniqueTests);

  const stdPass = stdRes.success ? 'PASS' : 'FAIL';
  const tscPass = tscRes.success ? 'PASS' : 'FAIL';
  const overall = stdPass === 'PASS' && tscPass === 'PASS' && testResults.failed === 0 ? 'PASS' : 'FAIL';

  const result: FastVerifyResult = {
    status: overall,
    changedFiles: changed.changedFiles.length,
    standards: { status: stdPass, details: stdRes.stderr || stdRes.stdout },
    compile: { status: tscPass, details: tscRes.stderr || tscRes.stdout },
    tests: { executed: uniqueTests.length, passed: testResults.passed, failed: testResults.failed, unresolvedTargets: unresolved },
  };

  outputHarnessResult(result, format, () => printFastSummary(result, uniqueTests.length, testResults.passed, unresolved.length));
  return result;
}

function runSingleGate(name: string, cmd: string, args: readonly string[]): QualityGateItem {
  const start = Date.now();
  const res = runShellCommand(cmd, args);
  return {
    name,
    status: res.success ? 'PASS' : 'FAIL',
    durationMs: Date.now() - start,
    details: res.success ? undefined : (res.stderr || res.stdout).slice(0, 500),
  };
}

export function executeFinalVerify(phase = 'current', format: 'text' | 'json' = 'text'): FinalVerifyResult {
  const t0 = Date.now();
  const gates: QualityGateItem[] = [
    runSingleGate('check', 'npm', ['run', 'check']),
    runSingleGate('desktop:test', 'npm', ['run', 'desktop:test']),
    runSingleGate('cli:test', 'npm', ['run', 'cli:test']),
    runSingleGate('cli:verify-install', 'npm', ['run', 'cli:verify-install']),
    runSingleGate('mcp:test', 'npm', ['run', 'mcp:test']),
    runSingleGate('standards:changed', 'npm', ['run', 'lint:standards:changed']),
  ];

  const overallStatus = gates.every(g => g.status === 'PASS') ? 'PASS' : 'FAIL';
  const result: FinalVerifyResult = {
    status: overallStatus,
    gates: Object.freeze(gates),
    totalDurationMs: Date.now() - t0,
  };

  const outputDir = path.resolve(process.cwd(), '.codeprep/dev-harness', phase);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'final-verify.json'), JSON.stringify(result, null, 2), 'utf-8');

  outputHarnessResult(result, format, () => {
    console.log(`[Final Verify: ${overallStatus}] Total Duration: ${result.totalDurationMs}ms`);
    for (const g of gates) {
      console.log(`  - ${g.name}: ${g.status} (${g.durationMs}ms)`);
    }
  });

  return result;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args.find((_, i) => args[i - 1] === '--mode') ?? 'fast';
  const phase = args.find((_, i) => args[i - 1] === '--phase') ?? args.find(a => !a.startsWith('--') && a !== 'final' && a !== 'fast') ?? 'current';
  const format = args.includes('--format') && args[args.indexOf('--format') + 1] === 'json' ? 'json' : 'text';
  const res = mode === 'final' ? executeFinalVerify(phase, format) : executeFastVerify(format);
  if (res.status === 'FAIL') process.exit(1);
}
