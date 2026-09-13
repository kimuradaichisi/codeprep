import * as path from 'node:path';
import ts from 'typescript';
import type { RepositoryLocation } from '../../../domain/ir';
import type { LanguageSymbolRef } from '../../../application/ir/language';

export function getNodeLocation(sourceFile: ts.SourceFile, node: ts.Node): RepositoryLocation {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return {
    startLine: start.line + 1,
    endLine: end.line + 1,
    startColumn: start.character + 1,
    endColumn: end.character + 1,
  };
}

export function normalizeWorkspacePath(workspaceRoot: string, fullPath: string): string {
  const rel = path.relative(workspaceRoot, fullPath);
  return rel.replace(/\\/g, '/');
}

export function resolveSymbolKind(flags: ts.SymbolFlags): string {
  if (flags & ts.SymbolFlags.Class) return 'class';
  if (flags & ts.SymbolFlags.Interface) return 'interface';
  if (flags & ts.SymbolFlags.Function) return 'function';
  if (flags & ts.SymbolFlags.Method) return 'method';
  if (flags & ts.SymbolFlags.TypeAlias) return 'type';
  if (flags & ts.SymbolFlags.Enum) return 'enum';
  if (flags & ts.SymbolFlags.Variable) return 'constant';
  return 'symbol';
}

export function buildSymbolRef(
  sym: ts.Symbol,
  decl: ts.Declaration,
  sourceFile: ts.SourceFile,
  workspaceRoot: string
): LanguageSymbolRef {
  const normPath = normalizeWorkspacePath(workspaceRoot, sourceFile.fileName);
  const location = getNodeLocation(sourceFile, decl);
  const symbolKind = resolveSymbolKind(sym.flags);
  return {
    path: normPath,
    symbolName: sym.name,
    symbolKind,
    location,
  };
}
