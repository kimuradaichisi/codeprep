import ts from 'typescript';
import type { LanguageStructuralRelation, LanguageSymbolRef } from '../../../application/ir/language';
import {
  buildSymbolRef,
  getNodeLocation,
  normalizeWorkspacePath,
  resolveActualSymbol,
} from './TypeScriptSymbolLocator';

function isTopLevelSymbol(sym: ts.Symbol): boolean {
  const flags = sym.flags;
  return Boolean(flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.Function | ts.SymbolFlags.TypeAlias));
}

function isSelfFileDeclaration(targetDecl: ts.Declaration, targetSf: ts.SourceFile, sourceFile: ts.SourceFile, idNode: ts.Identifier): boolean {
  return targetSf.fileName === sourceFile.fileName && targetDecl.pos <= idNode.pos && idNode.end <= targetDecl.end;
}

function resolveTargetDeclaration(idNode: ts.Identifier, sourceFile: ts.SourceFile, tc: ts.TypeChecker) {
  const rawSym = tc.getSymbolAtLocation(idNode);
  if (!rawSym) return undefined;
  const sym = resolveActualSymbol(rawSym, tc);
  if (!sym?.declarations?.[0] || !isTopLevelSymbol(sym)) return undefined;
  const targetDecl = sym.declarations[0];
  const targetSf = targetDecl.getSourceFile();
  if (targetSf.isDeclarationFile || isSelfFileDeclaration(targetDecl, targetSf, sourceFile, idNode)) return undefined;
  return { sym, targetDecl, targetSf };
}

function buildSourceSymbolRef(sourceFile: ts.SourceFile, idNode: ts.Identifier, root: string): LanguageSymbolRef {
  return {
    path: normalizeWorkspacePath(root, sourceFile.fileName),
    symbolName: idNode.text,
    symbolKind: 'reference',
    location: getNodeLocation(sourceFile, idNode),
  };
}

function resolveReferencePair(
  idNode: ts.Identifier,
  sourceFile: ts.SourceFile,
  tc: ts.TypeChecker,
  root: string
): LanguageStructuralRelation | undefined {
  const target = resolveTargetDeclaration(idNode, sourceFile, tc);
  if (!target) return undefined;
  return {
    source: buildSourceSymbolRef(sourceFile, idNode, root),
    target: buildSymbolRef(target.sym, target.targetDecl, target.targetSf, root),
    relationType: 'references',
    confidence: 1.0,
    analyzer: 'typescript-compiler',
  };
}

function tryAddRelation(rel: LanguageStructuralRelation | undefined, seen: Set<string>, out: LanguageStructuralRelation[]): void {
  if (!rel) return;
  const key = `${rel.source.path}:${rel.source.location?.startLine}->${rel.target.path}:${rel.target.symbolName}`;
  if (!seen.has(key)) {
    seen.add(key);
    out.push(rel);
  }
}

function processIdentifier(
  node: ts.Identifier,
  sf: ts.SourceFile,
  tc: ts.TypeChecker,
  root: string,
  out: LanguageStructuralRelation[],
  seen: Set<string>
): void {
  if (!node.parent || ts.isImportSpecifier(node.parent) || ts.isExportSpecifier(node.parent)) return;
  tryAddRelation(resolveReferencePair(node, sf, tc, root), seen, out);
}

function walkIdentifiers(
  node: ts.Node,
  sf: ts.SourceFile,
  tc: ts.TypeChecker,
  root: string,
  out: LanguageStructuralRelation[],
  seen: Set<string>
): void {
  if (ts.isIdentifier(node)) {
    processIdentifier(node, sf, tc, root, out, seen);
  }
  ts.forEachChild(node, child => walkIdentifiers(child, sf, tc, root, out, seen));
}

export function extractReferenceRelations(
  program: ts.Program,
  workspaceRoot: string,
  sourceFiles?: readonly ts.SourceFile[]
): readonly LanguageStructuralRelation[] {
  const tc = program.getTypeChecker();
  const files = (sourceFiles ?? program.getSourceFiles()).filter(sf => !sf.isDeclarationFile);
  const relations: LanguageStructuralRelation[] = [];
  const seen = new Set<string>();

  for (const sf of files) {
    walkIdentifiers(sf, sf, tc, workspaceRoot, relations, seen);
  }
  return Object.freeze(relations);
}
