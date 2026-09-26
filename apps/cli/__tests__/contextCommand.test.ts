/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runContextCommand } from '../contextCommand';
import type { RepositoryContextContainer } from '../../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer';
import type { CliContextResult } from '../types';

describe('runContextCommand', () => {
  let mockExecute: ReturnType<typeof vi.fn>;
  let mockContainer: RepositoryContextContainer;
  let stdoutChunks: string[];
  let stderrChunks: string[];

  beforeEach(() => {
    stdoutChunks = [];
    stderrChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      stdoutChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: any) => {
      stderrChunks.push(String(chunk));
      return true;
    });

    mockExecute = vi.fn().mockResolvedValue({
      task: 'Optimize checkout',
      candidates: [
        {
          candidate: {
            relativePath: 'src/checkout.ts',
            score: 0.95,
            reasons: ['exactFilenameMatch'],
            matchedTerms: ['checkout'],
          },
          supportScore: 0.8,
          evidence: [],
        },
      ],
      confidence: { level: 'HIGH', score: 0.9, reasons: ['Clear match'] },
      decision: {
        decision: 'AUTO_FAST_PACK',
        strategy: 'fast',
        requiresSelection: false,
        autoSelectedEntryPoints: ['src/checkout.ts'],
      },
      contextPack: {
        manifest: { entries: [{ relativePath: 'src/checkout.ts' }] },
        content: '# Checkout Pack Content',
        warnings: [],
      },
    });

    mockContainer = {
      prepareContextUseCase: { execute: mockExecute } as any,
    } as any;
  });

  it('passes task and workspace to UseCase and outputs valid JSON to stdout without logs', async () => {
    const args = {
      task: 'Optimize checkout',
      workspace: 'C:/mock-ws',
      format: 'json' as const,
      pack: false,
    };

    const result = (await runContextCommand(args, () => mockContainer)) as CliContextResult;

    expect(mockExecute).toHaveBeenCalledWith({ task: 'Optimize checkout' });
    expect(result.schemaVersion).toBe('1');
    if (result.schemaVersion === '1') {
      expect(result.task).toBe('Optimize checkout');
      expect(result.workspace).toBe('C:/mock-ws');
      expect(result.result.decision).toBe('AUTO_FAST_PACK');
      expect(result.result.candidates).toHaveLength(1);
      // pack is false, so contextPack is null
      expect(result.result.contextPack).toBeNull();
    }

    // stdout check: must be valid JSON only
    const fullStdout = stdoutChunks.join('');
    const parsed = JSON.parse(fullStdout);
    expect(parsed.schemaVersion).toBe('1');
    expect(parsed.task).toBe('Optimize checkout');

    // stderr check: logs should be in stderr
    const fullStderr = stderrChunks.join('');
    expect(fullStderr).toContain('[codeprep-cli]');
  });

  it('includes contextPack when pack option is true', async () => {
    const args = {
      task: 'Optimize checkout',
      workspace: 'C:/mock-ws',
      format: 'json' as const,
      pack: true,
    };

    const result = (await runContextCommand(args, () => mockContainer)) as CliContextResult;

    expect(result.schemaVersion).toBe('1');
    if (result.schemaVersion === '1') {
      expect(result.result.contextPack).not.toBeNull();
      expect(result.result.contextPack?.content).toBe('# Checkout Pack Content');
    }
  });

  it('outputs markdown when format is markdown', async () => {
    const args = {
      task: 'Optimize checkout',
      workspace: 'C:/mock-ws',
      format: 'markdown' as const,
      pack: true,
    };

    await runContextCommand(args, () => mockContainer);

    const fullStdout = stdoutChunks.join('');
    expect(fullStdout).toContain('# CodePrep Repository Context');
    expect(fullStdout).toContain('`src/checkout.ts`');
    expect(fullStdout).toContain('# Checkout Pack Content');
  });

  it('writes output to file when output path is specified', async () => {
    const tmpOut = path.resolve(__dirname, 'tmp_out.json');
    const args = {
      task: 'Optimize checkout',
      workspace: 'C:/mock-ws',
      format: 'json' as const,
      pack: false,
      output: tmpOut,
    };

    try {
      await runContextCommand(args, () => mockContainer);
      expect(fs.existsSync(tmpOut)).toBe(true);
      const content = JSON.parse(fs.readFileSync(tmpOut, 'utf-8'));
      expect(content.task).toBe('Optimize checkout');
      // stdout should NOT contain the result
      expect(stdoutChunks).toHaveLength(0);
    } finally {
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    }
  });

  it('throws CliError with KNOWLEDGE_MISSING when knowledge db does not exist', async () => {
    const args = {
      task: 'Optimize checkout',
      workspace: 'C:/non-existent-ws-for-db',
      format: 'json' as const,
      pack: false,
      strategy: 'knowledge' as const,
    };

    await expect(runContextCommand(args, () => mockContainer)).rejects.toThrow(
      'Knowledge database not found in workspace'
    );
  });
});

