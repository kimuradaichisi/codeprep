/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { dispatchCli } from '../dispatcher';
import { CLI_EXIT_CODES } from '../errors/cliError';

describe('CLI Dispatcher Tests', () => {
  let stdoutChunks: string[];
  let stderrChunks: string[];
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    stdoutChunks = [];
    stderrChunks = [];
    process.exitCode = undefined;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdoutChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrChunks.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  it('outputs valid JSON schema for commands --json', async () => {
    await dispatchCli(['commands', '--json']);
    const output = stdoutChunks.join('');
    const parsed = JSON.parse(output);

    expect(parsed.schemaVersion).toBe(1);
    expect(Array.isArray(parsed.commands)).toBe(true);
    expect(parsed.commands.length).toBeGreaterThan(0);
    expect(process.exitCode).toBeUndefined();
  });

  it('outputs human-readable table for commands command without flags', async () => {
    await dispatchCli(['commands']);
    const output = stdoutChunks.join('');
    expect(output).toContain('Available CodePrep Commands:');
    expect(output).toContain('codeprep status');
    expect(output).toContain('codeprep context prepare');
  });

  it('outputs global help when called with --help or empty args', async () => {
    await dispatchCli(['--help']);
    const output = stdoutChunks.join('');
    expect(output).toContain('Usage: codeprep <command>');
    expect(output).toContain('Global Options:');
  });

  it('outputs command-specific help when requested', async () => {
    await dispatchCli(['context', 'prepare', '--help']);
    const output = stdoutChunks.join('');
    expect(output).toContain('Usage: codeprep context prepare [options]');
    expect(output).toContain('--task');
  });

  it('outputs version string on --version', async () => {
    await dispatchCli(['--version']);
    const output = stdoutChunks.join('');
    expect(output.trim()).toBe('0.8.20');
  });

  it('runs status command and outputs structured JSON by default', async () => {
    const ws = path.resolve(__dirname, '../../../');
    await dispatchCli(['status', '--workspace', ws]);
    const output = stdoutChunks.join('');
    const parsed = JSON.parse(output);

    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.workspaceBound).toBe(true);
    expect(parsed.workspaceRoot).toBe(ws);
  });

  it('runs knowledge status command and outputs structured JSON', async () => {
    const ws = path.resolve(__dirname, '../../../');
    await dispatchCli(['knowledge', 'status', '--workspace', ws]);
    const output = stdoutChunks.join('');
    const parsed = JSON.parse(output);

    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.workspace).toBe(ws);
  });

  it('returns exit code 2 and structured JSON error when required args are missing in JSON mode', async () => {
    await dispatchCli(['context', 'pack', '--json']);
    const output = stdoutChunks.join('');
    const parsed = JSON.parse(output);

    expect(process.exitCode).toBe(CLI_EXIT_CODES.INVALID_ARGUMENTS);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('INVALID_ARGUMENTS');
    expect(parsed.error.suggestedAction).toContain('context pack');
  });

  it('returns exit code 2 and stderr message when required args missing in text mode', async () => {
    await dispatchCli(['context', 'pack']);
    const errOutput = stderrChunks.join('');

    expect(process.exitCode).toBe(CLI_EXIT_CODES.INVALID_ARGUMENTS);
    expect(errOutput).toContain('[codeprep-cli:error]');
    expect(errOutput).toContain('Option --task is required');
  });

  it('routes legacy arguments directly to context prepare', async () => {
    const mockContainer = {
      prepareContextUseCase: {
        execute: vi.fn().mockResolvedValue({
          task: 'Fix checkout issue',
          candidates: [],
          confidence: { level: 'HIGH', score: 0.9, reasons: [] },
          decision: { decision: 'AUTO_FAST_PACK', strategy: 'fast', requiresSelection: false },
          contextPack: null,
        }),
      },
    } as unknown as import('../../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer').RepositoryContextContainer;

    await dispatchCli(['--task', 'Fix checkout issue', '--format', 'json'], () => mockContainer);
    const output = stdoutChunks.join('');
    const parsed = JSON.parse(output);

    expect(parsed.schemaVersion).toBe('1');
    expect(parsed.task).toBe('Fix checkout issue');
  });
});
