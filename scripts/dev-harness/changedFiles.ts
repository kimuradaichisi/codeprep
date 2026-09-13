import { runShellCommand } from './commandRunner';
import type { ChangedFilesSummary } from './types';

function parseGitStatusLines(output: string): string[] {
  const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const files: string[] = [];
  for (const line of lines) {
    const rawPath = line.replace(/^[MADRCU?! ]+\s+/, '').trim();
    if (rawPath.length > 0) files.push(rawPath.replace(/\\/g, '/'));
  }
  return files;
}

function classifyFile(file: string, sourceFiles: string[], testFiles: string[], docs: string[]): void {
  if (file.endsWith('.md')) {
    docs.push(file);
  } else if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
    testFiles.push(file);
  } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
    sourceFiles.push(file);
  }
}

export function detectChangedFiles(cwd = process.cwd()): ChangedFilesSummary {
  const statusRes = runShellCommand('git', ['status', '--short'], cwd);
  const allFiles = Array.from(new Set(parseGitStatusLines(statusRes.stdout)));

  const sourceFiles: string[] = [];
  const testFiles: string[] = [];
  const docs: string[] = [];

  for (const f of allFiles) {
    classifyFile(f, sourceFiles, testFiles, docs);
  }

  return {
    changedFiles: Object.freeze(allFiles),
    sourceFiles: Object.freeze(sourceFiles),
    testFiles: Object.freeze(testFiles),
    docs: Object.freeze(docs),
  };
}
