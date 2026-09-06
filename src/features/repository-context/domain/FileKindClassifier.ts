import type { RepositoryFileKind } from './RepositoryIndex';

const CODE_EXTS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'go', 'rs', 'java', 'c', 'cpp',
  'h', 'hpp', 'cs', 'rb', 'php', 'swift',
  'kt', 'sh', 'bash', 'zsh', 'sql', 'html', 'css', 'scss',
]);

const CONFIG_EXTS = new Set([
  'json', 'yaml', 'yml', 'toml', 'xml', 'properties', 'ini', 'env',
]);

function isTestPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.includes('__tests__/') || lower.includes('.test.') || lower.includes('.spec.');
}

function isDocPath(ext: string): boolean {
  return ext === 'md' || ext === 'mdx';
}

/**
 * 相対パスからファイルの軽量種別を分類
 */
export function classifyFileKind(relativePath: string): RepositoryFileKind {
  const normalized = relativePath.replace(/\\/g, '/');
  if (isTestPath(normalized)) return 'test';

  const ext = normalized.split('.').pop()?.toLowerCase() ?? '';
  if (isDocPath(ext)) return 'document';
  if (CONFIG_EXTS.has(ext)) return 'config';
  if (CODE_EXTS.has(ext)) return 'code';
  return 'other';
}
