// src/features/repository-context/application/__tests__/ClaudeHaikuLauncher.test.ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HAIKU_MODEL,
  resolveHaikuModel,
  buildClaudeArgs,
} from '../../../../../scripts/claude-haiku';

describe('Claude Code Haiku Launcher helper', () => {
  it('resolves default Haiku model when env is not set', () => {
    const model = resolveHaikuModel({});
    expect(model).toBe('claude-haiku-4-5-20251001');
    expect(model).toBe(DEFAULT_HAIKU_MODEL);
  });

  it('resolves model override from CODEPREP_CLAUDE_HAIKU_MODEL env var', () => {
    const custom = 'claude-haiku-custom-v1';
    const model = resolveHaikuModel({ CODEPREP_CLAUDE_HAIKU_MODEL: custom } as any);
    expect(model).toBe(custom);
  });

  it('prepends --model flag with resolved model ID to args', () => {
    const args = buildClaudeArgs(['-p', 'implement login feature'], {});
    expect(args).toEqual([
      '--model',
      'claude-haiku-4-5-20251001',
      '-p',
      'implement login feature',
    ]);
  });

  it('forwards empty user args safely', () => {
    const args = buildClaudeArgs([], {});
    expect(args).toEqual(['--model', 'claude-haiku-4-5-20251001']);
  });

  it('respects both custom model and user args', () => {
    const env = { CODEPREP_CLAUDE_HAIKU_MODEL: 'claude-haiku-2026' } as any;
    const args = buildClaudeArgs(['--verbose', '--dangerously-skip-permissions'], env);
    expect(args).toEqual([
      '--model',
      'claude-haiku-2026',
      '--verbose',
      '--dangerously-skip-permissions',
    ]);
  });
});
