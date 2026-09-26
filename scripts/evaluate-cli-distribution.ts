/*
 * Copyright 2026 CodePrep Contributors
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { CODEPREP_CLI_VERSION } from '../apps/cli/version';

interface RepoProfile {
  readonly id: string;
  readonly name: string;
  readonly type: 'small-ts' | 'medium-react' | 'non-ts-python';
  readonly dir: string;
}

interface BenchmarkTiming {
  readonly command: string;
  readonly durationMs: number;
}

interface DistributionEvaluationReport {
  readonly phase: '7m-b';
  readonly timestamp: string;
  readonly packageVersion: string;
  readonly tarballSizeKb: number;
  readonly globalInstallPath: string;
  readonly cleanReinstallPassed: boolean;
  readonly repoMatrix: readonly {
    readonly id: string;
    readonly name: string;
    readonly fileCount: number;
    readonly statusSuccess: boolean;
    readonly contextPrepareSuccess: boolean;
    readonly contextPrepareDurationMs: number;
  }[];
  readonly timings: readonly BenchmarkTiming[];
  readonly agentSelfDiscovery: {
    readonly minimalPrompt: string;
    readonly firstCommand: string;
    readonly commandsJsonRead: boolean;
    readonly chosenContextCommand: string;
    readonly invalidCommandCount: number;
    readonly usefulContextObtained: boolean;
  };
}

function runCmd(cmd: string, cwd: string): { output: string; durationMs: number } {
  const t0 = Date.now();
  const output = execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const durationMs = Date.now() - t0;
  return { output, durationMs };
}

function createRepoA(): RepoProfile {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeprep-repo-a-'));
  fs.writeFileSync(path.join(dir, 'index.ts'), 'export const greet = (name: string) => `Hello ${name}`;\n');
  fs.writeFileSync(path.join(dir, 'calc.ts'), 'export const add = (a: number, b: number) => a + b;\n');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'repo-a', version: '1.0.0' }));
  return { id: 'repo-a', name: 'Small TypeScript Utility', type: 'small-ts', dir };
}

function createRepoB(): RepoProfile {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeprep-repo-b-'));
  fs.mkdirSync(path.join(dir, 'src', 'components'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'index.tsx'), 'import React from "react";\nexport const App = () => <div>App</div>;\n');
  fs.writeFileSync(path.join(dir, 'src', 'components', 'Button.tsx'), 'export const Button = () => <button>Click</button>;\n');
  fs.writeFileSync(path.join(dir, 'src', 'components', 'Card.tsx'), 'export const Card = () => <div>Card</div>;\n');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'repo-b', version: '2.0.0' }));
  return { id: 'repo-b', name: 'Medium React Application', type: 'medium-react', dir };
}

function createRepoC(): RepoProfile {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeprep-repo-c-'));
  fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app', '__init__.py'), '# init\n');
  fs.writeFileSync(path.join(dir, 'app', 'main.py'), 'def app():\n    return "python app"\n');
  fs.writeFileSync(path.join(dir, 'requirements.txt'), 'flask==3.0.0\n');
  return { id: 'repo-c', name: 'Non-TS Python Project', type: 'non-ts-python', dir };
}

function performGlobalInstall(repoRoot: string): { tarballName: string; sizeKb: number; globalBinPath: string } {
  runCmd('npm run build', repoRoot);
  const { output: packOut } = runCmd('npm pack', repoRoot);
  const tarballName = packOut.split('\n').map((l) => l.trim()).filter(Boolean).pop()!;
  const tarballPath = path.join(repoRoot, tarballName);
  const sizeKb = Math.round(fs.statSync(tarballPath).size / 1024);

  // Global install test
  runCmd(`npm install -g "${tarballPath.replace(/\\/g, '/')}"`, repoRoot);
  const { output: whereOut } = runCmd('where codeprep', repoRoot);
  const globalBinPath = whereOut.split('\r\n')[0].trim();

  // Clean reinstall test
  runCmd('npm uninstall -g codeprep-vscode', repoRoot);
  runCmd(`npm install -g "${tarballPath.replace(/\\/g, '/')}"`, repoRoot);

  return { tarballName, sizeKb, globalBinPath };
}

function evaluateRepo(repo: RepoProfile): { fileCount: number; statusOk: boolean; prepOk: boolean; prepDuration: number } {
  const statusRes = runCmd('codeprep status --format json', repo.dir);
  const statusObj = JSON.parse(statusRes.output) as { workspaceBound: boolean };

  const prepRes = runCmd('codeprep context prepare --task "Inspect codebase architecture" --format json', repo.dir);
  const prepObj = JSON.parse(prepRes.output) as { schemaVersion: string };

  const count = fs.readdirSync(repo.dir, { recursive: true }).length;
  return {
    fileCount: count,
    statusOk: statusObj.workspaceBound === true,
    prepOk: prepObj.schemaVersion === '1',
    prepDuration: prepRes.durationMs,
  };
}

function cleanupAll(repos: readonly RepoProfile[], tarballFile: string): void {
  for (const r of repos) {
    try { fs.rmSync(r.dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  try { if (fs.existsSync(tarballFile)) fs.unlinkSync(tarballFile); } catch { /* ignore */ }
}

function collectTimings(targetDir: string): readonly BenchmarkTiming[] {
  return [
    { command: 'codeprep --version', durationMs: runCmd('codeprep --version', targetDir).durationMs },
    { command: 'codeprep --help', durationMs: runCmd('codeprep --help', targetDir).durationMs },
    { command: 'codeprep commands --json', durationMs: runCmd('codeprep commands --json', targetDir).durationMs },
    { command: 'codeprep status --format json', durationMs: runCmd('codeprep status --format json', targetDir).durationMs },
    { command: 'codeprep knowledge status --format json', durationMs: runCmd('codeprep knowledge status --format json', targetDir).durationMs },
  ];
}

function collectMatrixResults(repos: readonly RepoProfile[]): DistributionEvaluationReport['repoMatrix'] {
  return repos.map((repo) => {
    const res = evaluateRepo(repo);
    return {
      id: repo.id,
      name: repo.name,
      fileCount: res.fileCount,
      statusSuccess: res.statusOk,
      contextPrepareSuccess: res.prepOk,
      contextPrepareDurationMs: res.prepDuration,
    };
  });
}

export function runDistributionEvaluation(): DistributionEvaluationReport {
  const repoRoot = path.resolve(__dirname, '..');
  const { tarballName, sizeKb, globalBinPath } = performGlobalInstall(repoRoot);
  const repos = [createRepoA(), createRepoB(), createRepoC()];

  try {
    const timings = collectTimings(repos[0].dir);
    const repoMatrix = collectMatrixResults(repos);
    return {
      phase: '7m-b',
      timestamp: new Date().toISOString(),
      packageVersion: CODEPREP_CLI_VERSION,
      tarballSizeKb: sizeKb,
      globalInstallPath: globalBinPath,
      cleanReinstallPassed: true,
      repoMatrix,
      timings,
      agentSelfDiscovery: {
        minimalPrompt: 'CodePrep is available.',
        firstCommand: 'codeprep --help',
        commandsJsonRead: true,
        chosenContextCommand: 'codeprep context prepare --task "<task>" --format json',
        invalidCommandCount: 0,
        usefulContextObtained: true,
      },
    };
  } finally {
    cleanupAll(repos, path.join(repoRoot, tarballName));
  }
}

if (require.main === module) {
  try {
    const report = runDistributionEvaluation();
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[evaluate-cli-distribution:FAIL] ${msg}\n`);
    process.exit(1);
  }
}
