import { describe, expect, it } from 'vitest';
import { runShellCommand } from '../commandRunner';
import { detectChangedFiles } from '../changedFiles';
import { buildPhaseReport } from '../reportBuilder';
import { loadKnownPathCases } from '../knownPathsEval';

describe('Development Harness Core Modules', () => {
  it('runShellCommand executes a simple command and returns structured result', () => {
    const res = runShellCommand('node', ['-e', '"console.log(123)"']);
    expect(res.success).toBe(true);
    expect(res.exitCode).toBe(0);
    expect(res.stdout.trim()).toBe('123');
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('runShellCommand correctly catches non-zero exit codes', () => {
    const res = runShellCommand('node', ['-e', 'process.exit(2)']);
    expect(res.success).toBe(false);
    expect(res.exitCode).toBe(2);
  });

  it('detectChangedFiles detects current modified/untracked files', () => {
    const summary = detectChangedFiles();
    expect(Array.isArray(summary.changedFiles)).toBe(true);
    expect(Array.isArray(summary.sourceFiles)).toBe(true);
    expect(Array.isArray(summary.testFiles)).toBe(true);
    expect(Array.isArray(summary.docs)).toBe(true);
  });

  it('loadKnownPathCases loads existing evaluation golden set', () => {
    const cases = loadKnownPathCases();
    expect(cases.length).toBeGreaterThanOrEqual(3);
    const first = cases[0];
    expect(first?.source).toBeDefined();
    expect(first?.relation).toBeDefined();
    expect(first?.target).toBeDefined();
  });

  it('buildPhaseReport produces expected markdown with agent review placeholders', () => {
    const report = buildPhaseReport({
      phase: 'test-phase',
      changedFiles: {
        changedFiles: ['src/index.ts', 'README.md'],
        sourceFiles: ['src/index.ts'],
        testFiles: [],
        docs: ['README.md'],
      },
    });

    expect(report).toContain('# Phase test-phase Development & Verification Report');
    expect(report).toContain('## 1. Execution Summary');
    expect(report).toContain('## 2. Changed Files');
    expect(report).toContain('## 5. Agent Review');
    expect(report).toContain('### BLOCKER');
    expect(report).toContain('### SHOULD FIX');
    expect(report).toContain('### DEFER');
  });
});
