// src/features/repository-context/__tests__/ScannerExclusionParity.test.ts
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listProjectFiles } from '../infrastructure/filesystem/ProjectFileTree';
import { ProjectScannerClient } from '../infrastructure/filesystem/ProjectScannerClient';
import { VSCodeWorkspaceRepository } from '../../selection/infrastructure/VSCodeWorkspaceRepository';
import type { Project } from '../domain/Project';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
    findFiles: vi.fn(),
    fs: {
      readFile: vi.fn(async (uri: { fsPath: string }) => {
        const { readFile } = await import('node:fs/promises');
        const buf = await readFile(uri.fsPath);
        return new Uint8Array(buf);
      }),
    },
  },
  Uri: { file: (p: string) => ({ fsPath: p, scheme: 'file' }) },
  RelativePattern: class { constructor(public base: string, public pattern: string) {} },
}));

describe('Scanner & Tree Exclusion Parity', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'codeprep-parity-'));
    await createTestFixture(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('produces identical included file lists across ProjectFileTree and ProjectScannerClient', async () => {
    const treeFiles = await listProjectFiles(tempDir, true);
    const scanner = new ProjectScannerClient();
    const project: Project = { id: 'parity-test', name: 'Parity Test', rootPath: tempDir };
    const scanned = await scanner.scanProjectFiles(project);
    const scannerFiles = scanned.map((f) => f.relativePath).sort((a, b) => a.localeCompare(b));

    const expected = [
      '.env.example',
      '.env.sample',
      '.env.template',
      '.gitignore',
      'docs/readme.md',
      'src/index.ts',
    ];

    expect(treeFiles).toEqual(expected);
    expect(scannerFiles).toEqual(expected);
    expect(treeFiles).toEqual(scannerFiles);
  });

  it('VSCodeWorkspaceRepository generates exclude pattern covering gitignore and sensitive files', async () => {
    const vscode = await import('vscode');
    (vscode.workspace.getConfiguration as any).mockReturnValue({ get: vi.fn((_k, def) => def) });

    let capturedExclude = '';
    (vscode.workspace.findFiles as any).mockImplementation((_pat: unknown, exclude: string) => {
      capturedExclude = exclude;
      return Promise.resolve([]);
    });

    const repo = new VSCodeWorkspaceRepository(tempDir);
    await repo.getAllFiles();

    expect(capturedExclude).toContain('.venv');
    expect(capturedExclude).toContain('.env');
    expect(capturedExclude).toContain('*.key');
    expect(capturedExclude).toContain('custom-cache');
    expect(capturedExclude).toContain('*.log');
  });
});

async function createTestFixture(dir: string): Promise<void> {
  await populateAllowedFiles(dir);
  await populateExcludedFiles(dir);
}

async function populateAllowedFiles(dir: string): Promise<void> {
  await mkdir(join(dir, 'src'), { recursive: true });
  await mkdir(join(dir, 'docs'), { recursive: true });
  await writeFile(join(dir, 'src/index.ts'), 'export const a = 1;');
  await writeFile(join(dir, 'docs/readme.md'), '# Docs');
  await writeFile(join(dir, '.env.example'), 'SAMPLE_API_KEY=');
  await writeFile(join(dir, '.env.sample'), 'SAMPLE=1');
  await writeFile(join(dir, '.env.template'), 'TEMPLATE=1');
}

async function populateExcludedFiles(dir: string): Promise<void> {
  await mkdir(join(dir, '.venv/bin'), { recursive: true });
  await mkdir(join(dir, 'node_modules/pkg'), { recursive: true });
  await mkdir(join(dir, 'dist'), { recursive: true });
  await mkdir(join(dir, 'custom-cache'), { recursive: true });
  await writeFile(join(dir, '.venv/bin/activate'), '#!/bin/sh');
  await writeFile(join(dir, 'node_modules/pkg/index.js'), '{}');
  await writeFile(join(dir, 'dist/bundle.js'), 'bundle');
  await writeFile(join(dir, '.env'), 'SECRET_KEY=123');
  await writeFile(join(dir, '.env.local'), 'SECRET_KEY=123');
  await writeFile(join(dir, 'server.key'), 'PRIVATE_KEY');
  await writeFile(join(dir, 'custom-cache/cached.json'), '{}');
  await writeFile(join(dir, 'debug.log'), 'error log');
  await writeFile(join(dir, '.gitignore'), 'custom-cache/\n*.log\n');
}

