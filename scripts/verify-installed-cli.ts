/*
 * Copyright 2026 CodePrep Contributors
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { CODEPREP_CLI_VERSION } from '../apps/cli/version';

interface VerificationResult {
  readonly tarballFile: string;
  readonly tarballSizeKb: number;
  readonly installedBinPath: string;
  readonly externalTestWorkspace: string;
  readonly versionMatches: boolean;
  readonly helpValid: boolean;
  readonly commandsJsonValid: boolean;
  readonly statusJsonValid: boolean;
  readonly contextPrepareValid: boolean;
  readonly semanticParity100Percent: boolean;
}

function runCommand(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function produceTarball(repoRoot: string): { tarballName: string; sizeKb: number } {
  const packOutput = runCommand('npm pack', repoRoot);
  const lines = packOutput.split('\n').map((l) => l.trim()).filter(Boolean);
  const tarballName = lines[lines.length - 1];
  const tarballPath = path.join(repoRoot, tarballName);
  const stat = fs.statSync(tarballPath);
  return { tarballName, sizeKb: Math.round(stat.size / 1024) };
}

function setupTempInstallDir(repoRoot: string, tarballName: string): { installDir: string; binPath: string } {
  const installDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeprep-verify-install-'));
  const tarballPath = path.join(repoRoot, tarballName);
  fs.writeFileSync(path.join(installDir, 'package.json'), JSON.stringify({ name: 'temp-verify-env' }));
  runCommand(`npm install --save "${tarballPath.replace(/\\/g, '/')}"`, installDir);

  const isWin = process.platform === 'win32';
  const binName = isWin ? 'codeprep.cmd' : 'codeprep';
  const binPath = path.join(installDir, 'node_modules', '.bin', binName);
  if (!fs.existsSync(binPath)) {
    throw new Error(`Installed CLI binary not found at: ${binPath}`);
  }
  return { installDir, binPath };
}

function createDummyExternalWorkspace(): string {
  const wsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeprep-external-ws-'));
  fs.writeFileSync(path.join(wsDir, 'app.ts'), 'export function app() { return "hello"; }\n');
  fs.writeFileSync(path.join(wsDir, 'server.ts'), 'import { app } from "./app";\nconsole.log(app());\n');
  fs.writeFileSync(path.join(wsDir, 'package.json'), JSON.stringify({ name: 'dummy-app', version: '1.0.0' }));
  return wsDir;
}

function verifyInstalledExecution(binPath: string, testWs: string, repoRoot: string): VerificationResult['semanticParity100Percent'] {
  const installedVer = runCommand(`"${binPath}" --version`, testWs);
  if (!installedVer.includes(`codeprep ${CODEPREP_CLI_VERSION}`)) {
    throw new Error(`Version mismatch. Expected "codeprep ${CODEPREP_CLI_VERSION}", got: "${installedVer}"`);
  }

  const installedHelp = runCommand(`"${binPath}" --help`, testWs);
  if (!installedHelp.includes('Usage: codeprep') || !installedHelp.includes('Typical flow:')) {
    throw new Error('Installed --help output does not meet requirements.');
  }

  const installedCmdsRaw = runCommand(`"${binPath}" commands --json`, testWs);
  const devCmdsRaw = runCommand(`node "${path.join(repoRoot, 'dist-cli', 'index.js')}" commands --json`, testWs);
  const installedParsed = JSON.parse(installedCmdsRaw) as Record<string, unknown>;
  const devParsed = JSON.parse(devCmdsRaw) as Record<string, unknown>;
  delete installedParsed.generatedAt;
  delete devParsed.generatedAt;

  const installedJson = JSON.stringify(installedParsed);
  const devJson = JSON.stringify(devParsed);
  if (installedJson !== devJson) {
    throw new Error(`Semantic parity mismatch between installed and dev CLI!`);
  }

  const statusRaw = runCommand(`"${binPath}" status --format json`, testWs);
  const parsedStatus = JSON.parse(statusRaw) as { schemaVersion: number; workspaceBound: boolean };
  if (parsedStatus.schemaVersion !== 1 || !parsedStatus.workspaceBound) {
    throw new Error('Invalid status JSON output in external workspace.');
  }

  const contextRaw = runCommand(`"${binPath}" context prepare --task "Inspect app structure" --format json`, testWs);
  const parsedContext = JSON.parse(contextRaw) as { schemaVersion: string; task: string };
  if (parsedContext.schemaVersion !== '1' || parsedContext.task !== 'Inspect app structure') {
    throw new Error('Invalid context prepare JSON output in external workspace.');
  }

  return true;
}

function cleanupDirs(dirs: readonly string[], files: readonly string[]): void {
  for (const f of files) {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch { /* ignore */ }
  }
  for (const d of dirs) {
    try { if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

export function runInstalledCliVerification(): VerificationResult {
  const repoRoot = path.resolve(__dirname, '..');
  const { tarballName, sizeKb } = produceTarball(repoRoot);
  const tarballPath = path.join(repoRoot, tarballName);
  const { installDir, binPath } = setupTempInstallDir(repoRoot, tarballName);
  const externalWs = createDummyExternalWorkspace();

  try {
    const parityOk = verifyInstalledExecution(binPath, externalWs, repoRoot);
    const result: VerificationResult = {
      tarballFile: tarballName,
      tarballSizeKb: sizeKb,
      installedBinPath: binPath,
      externalTestWorkspace: externalWs,
      versionMatches: true,
      helpValid: true,
      commandsJsonValid: true,
      statusJsonValid: true,
      contextPrepareValid: true,
      semanticParity100Percent: parityOk,
    };
    return result;
  } finally {
    cleanupDirs([installDir, externalWs], [tarballPath]);
  }
}

if (require.main === module) {
  try {
    process.stdout.write('[verify-installed-cli] Starting package build & install verification...\n');
    const result = runInstalledCliVerification();
    process.stdout.write(`[verify-installed-cli] PASS: Tarball ${result.tarballFile} (${result.tarballSizeKb} KB)\n`);
    process.stdout.write(`[verify-installed-cli] PASS: Installed binary executed in external CWD successfully.\n`);
    process.stdout.write(`[verify-installed-cli] PASS: Semantic parity 100% verified against dev CLI.\n`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[verify-installed-cli:FAIL] ${msg}\n`);
    process.exit(1);
  }
}
