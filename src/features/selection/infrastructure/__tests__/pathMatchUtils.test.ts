/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeSeparators,
  isAbsoluteCandidate,
  extractWorkspaceRelativePath,
  isEligibleForFallback,
} from '../pathMatchUtils';

describe('pathMatchUtils', () => {
  const root = 'C:/workspace/project';

  it('normalizeSeparators: バックスラッシュをスラッシュに変換すること', () => {
    expect(normalizeSeparators('a\\b\\c')).toBe('a/b/c');
  });

  it('isAbsoluteCandidate: WindowsおよびPOSIX絶対パスを検出すること', () => {
    expect(isAbsoluteCandidate('C:/workspace')).toBe(true);
    expect(isAbsoluteCandidate('/C:/workspace')).toBe(true);
    expect(isAbsoluteCandidate('/workspace')).toBe(true);
    expect(isAbsoluteCandidate('src/app.ts')).toBe(false);
  });

  it('extractWorkspaceRelativePath: 相対パスを正しく抽出すること', () => {
    expect(extractWorkspaceRelativePath('src/app.ts', root)).toBe('src/app.ts');
    expect(extractWorkspaceRelativePath('./src/app.ts', root)).toBe('src/app.ts');
    expect(extractWorkspaceRelativePath('/src/app.ts', root)).toBe('src/app.ts');
  });

  it('extractWorkspaceRelativePath: Windows絶対パスからワークスペース配下を判定し相対パス化すること', () => {
    const winPath = 'C:\\workspace\\project\\src\\app.ts';
    expect(extractWorkspaceRelativePath(winPath, root)).toBe('src/app.ts');

    // 大文字小文字の差異
    const caseDiff = 'c:\\Project\\src\\index.ts';
    expect(extractWorkspaceRelativePath(caseDiff, 'C:/project')).toBe('src/index.ts');
  });

  it('extractWorkspaceRelativePath: ワークスペース外の絶対パスは拒絶すること', () => {
    const outside = 'D:\\other\\project\\secret.txt';
    expect(extractWorkspaceRelativePath(outside, root)).toBeUndefined();
  });

  it('extractWorkspaceRelativePath: パストラバーサルは拒絶すること', () => {
    expect(extractWorkspaceRelativePath('../../secret.txt', root)).toBeUndefined();
    expect(extractWorkspaceRelativePath('src/../../secret.txt', root)).toBeUndefined();
  });

  it('isEligibleForFallback: 相対パスは対象、絶対パスや不正パスは対象外とすること', () => {
    expect(isEligibleForFallback('theme.sass')).toBe(true);
    expect(isEligibleForFallback('commands/OutputCommands.ts')).toBe(true);
    expect(isEligibleForFallback('C:/workspace/project/src/app.ts')).toBe(false);
    expect(isEligibleForFallback('../../secret.txt')).toBe(false);
  });

  it('extractWorkspaceRelativePath: WSL UNCパスとLinuxパスの相互解決ができること', () => {
    const wslRoot = '//wsl$/Ubuntu/home/user/project';
    const linuxPath = '/home/user/project/src/app.ts';
    expect(extractWorkspaceRelativePath(linuxPath, wslRoot)).toBe('src/app.ts');

    const wslLocalhostCand = '//wsl.localhost/Ubuntu/home/user/project/src/app.ts';
    expect(extractWorkspaceRelativePath(wslLocalhostCand, wslRoot)).toBe('src/app.ts');

    const linuxRoot = '/home/user/project';
    const wslCand = '\\\\wsl$\\Ubuntu\\home\\user\\project\\src\\app.ts';
    expect(extractWorkspaceRelativePath(wslCand, linuxRoot)).toBe('src/app.ts');
  });
});

