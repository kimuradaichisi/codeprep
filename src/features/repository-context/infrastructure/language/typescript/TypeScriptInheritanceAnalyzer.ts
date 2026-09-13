import ts from 'typescript';
import type { LanguageStructuralRelation } from '../../../application/ir/language';
import { buildSymbolRef } from './TypeScriptSymbolLocator';

function resolveTargetRef(expr: ts.ExpressionWithTypeArguments, tc: ts.TypeChecker, root: string) {
  const symbol = tc.getSymbolAtLocation(expr.expression);
  if (!symbol || !symbol.declarations || symbol.declarations.length === 0) return undefined;
  const decl = symbol.declarations[0];
  return buildSymbolRef(symbol, decl, decl.getSourceFile(), root);
}

function buildClauseRelation(
  typeExpr: ts.ExpressionWithTypeArguments,
  relType: 'implements' | 'extends',
  srcRef: import('../../../application/ir/language').LanguageSymbolRef,
  tc: ts.TypeChecker,
  root: string
): LanguageStructuralRelation | undefined {
  const targetRef = resolveTargetRef(typeExpr, tc, root);
  if (!targetRef) return undefined;
  return { source: srcRef, target: targetRef, relationType: relType, confidence: 1.0, analyzer: 'typescript-compiler' };
}

function processClause(
  clause: ts.HeritageClause,
  srcSymbol: ts.Symbol,
  srcDecl: ts.Declaration,
  sf: ts.SourceFile,
  tc: ts.TypeChecker,
  root: string
): LanguageStructuralRelation[] {
  const relType = clause.token === ts.SyntaxKind.ImplementsKeyword ? 'implements' : 'extends';
  const srcRef = buildSymbolRef(srcSymbol, srcDecl, sf, root);
  return clause.types
    .map(typeExpr => buildClauseRelation(typeExpr, relType, srcRef, tc, root))
    .filter((rel): rel is LanguageStructuralRelation => rel !== undefined);
}

function inspectNode(
  node: ts.Node,
  sf: ts.SourceFile,
  tc: ts.TypeChecker,
  root: string,
  out: LanguageStructuralRelation[]
): void {
  if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
    if (!node.heritageClauses || !node.name) return;
    const sym = tc.getSymbolAtLocation(node.name);
    if (!sym) return;
    for (const clause of node.heritageClauses) {
      out.push(...processClause(clause, sym, node, sf, tc, root));
    }
  }
}

export function extractInheritanceRelations(
  program: ts.Program,
  workspaceRoot: string,
  sourceFiles?: readonly ts.SourceFile[]
): readonly LanguageStructuralRelation[] {
  const tc = program.getTypeChecker();
  const files = sourceFiles ?? program.getSourceFiles();
  const relations: LanguageStructuralRelation[] = [];

  for (const sf of files) {
    if (sf.isDeclarationFile) continue;
    ts.forEachChild(sf, (node) => inspectNode(node, sf, tc, workspaceRoot, relations));
  }

  return Object.freeze(relations);
}
