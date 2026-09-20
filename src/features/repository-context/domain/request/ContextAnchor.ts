// src/features/repository-context/domain/request/ContextAnchor.ts

export type TextAnchor = Readonly<{
  kind: 'text';
  text: string;
}>;

export type FileAnchor = Readonly<{
  kind: 'file';
  path: string;
}>;

export type SymbolAnchor = Readonly<{
  kind: 'symbol';
  name: string;
  filePath?: string;
}>;

export type DirectoryAnchor = Readonly<{
  kind: 'directory';
  path: string;
}>;

export type GitDiffAnchor = Readonly<{
  kind: 'git-diff';
  baseRef?: string;
  headRef?: string;
}>;

export type ContextAnchor =
  | TextAnchor
  | FileAnchor
  | SymbolAnchor
  | DirectoryAnchor
  | GitDiffAnchor;

export function isFileAnchor(anchor: ContextAnchor): anchor is FileAnchor {
  return anchor.kind === 'file';
}

export function isSymbolAnchor(anchor: ContextAnchor): anchor is SymbolAnchor {
  return anchor.kind === 'symbol';
}

export function isDirectoryAnchor(anchor: ContextAnchor): anchor is DirectoryAnchor {
  return anchor.kind === 'directory';
}

export function isTextAnchor(anchor: ContextAnchor): anchor is TextAnchor {
  return anchor.kind === 'text';
}

export function createFileAnchor(path: string): FileAnchor {
  return Object.freeze({ kind: 'file', path });
}

export function createSymbolAnchor(name: string, filePath?: string): SymbolAnchor {
  return Object.freeze({ kind: 'symbol', name, filePath });
}

export function createTextAnchor(text: string): TextAnchor {
  return Object.freeze({ kind: 'text', text });
}

export function createDirectoryAnchor(path: string): DirectoryAnchor {
  return Object.freeze({ kind: 'directory', path });
}
