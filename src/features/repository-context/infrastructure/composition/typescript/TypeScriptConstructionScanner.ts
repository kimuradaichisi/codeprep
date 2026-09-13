import ts from 'typescript';
import type { WiringStructuralRelation } from '../../../application/ir/composition';
import { buildSymbolRef, getNodeLocation, normalizeWorkspacePath } from '../../language/typescript/TypeScriptSymbolLocator';
import { resolveConcreteArgument, type ResolvedConcreteSymbol } from './TypeScriptArgumentResolver';
import { resolveConsumer, type ResolvedConsumer, type ResolvedParameterInfo } from './TypeScriptConstructorResolver';

function buildCompositionSite(sf: ts.SourceFile, expr: ts.NewExpression, root: string) {
  return { path: normalizeWorkspacePath(root, sf.fileName), location: getNodeLocation(sf, expr) };
}

function buildInjectsRelation(
  consumer: ResolvedConsumer, concrete: ResolvedConcreteSymbol,
  param: ResolvedParameterInfo | undefined, expr: ts.NewExpression,
  sf: ts.SourceFile, root: string
): WiringStructuralRelation {
  const site = buildCompositionSite(sf, expr, root);
  const src = buildSymbolRef(consumer.symbol, consumer.declaration, consumer.sourceFile, root);
  const tgt = buildSymbolRef(concrete.symbol, concrete.declaration, concrete.sourceFile, root);
  return {
    relationType: 'injects', source: src, target: tgt, compositionSite: site,
    parameterName: param?.parameterName, parameterIndex: param?.parameterIndex,
    declaredType: param?.declaredTypeName, confidence: 1.0, analyzer: 'typescript-manual-composition',
  };
}

function buildBindsToRelation(
  param: ResolvedParameterInfo, concrete: ResolvedConcreteSymbol,
  expr: ts.NewExpression, sf: ts.SourceFile, root: string
): WiringStructuralRelation | undefined {
  if (!param.declaredSymbol || !param.declaredDecl || !param.declaredSourceFile || param.declaredSymbol === concrete.symbol) {
    return undefined;
  }
  const site = buildCompositionSite(sf, expr, root);
  const src = buildSymbolRef(param.declaredSymbol, param.declaredDecl, param.declaredSourceFile, root);
  const tgt = buildSymbolRef(concrete.symbol, concrete.declaration, concrete.sourceFile, root);
  return {
    relationType: 'binds_to', source: src, target: tgt, compositionSite: site,
    parameterName: param.parameterName, parameterIndex: param.parameterIndex,
    declaredType: param.declaredTypeName, confidence: 1.0, analyzer: 'typescript-manual-composition',
  };
}

function inspectArgument(
  arg: ts.Expression, index: number, consumer: ResolvedConsumer,
  expr: ts.NewExpression, sf: ts.SourceFile, tc: ts.TypeChecker, root: string,
  out: WiringStructuralRelation[]
): void {
  const concrete = resolveConcreteArgument(arg, tc);
  if (!concrete) return;
  const param = consumer.parameters[index];
  out.push(buildInjectsRelation(consumer, concrete, param, expr, sf, root));
  if (param) {
    const binds = buildBindsToRelation(param, concrete, expr, sf, root);
    if (binds) out.push(binds);
  }
}

function inspectNewExpression(
  expr: ts.NewExpression, sf: ts.SourceFile, tc: ts.TypeChecker,
  root: string, out: WiringStructuralRelation[]
): void {
  if (!expr.arguments || expr.arguments.length === 0) return;
  const consumer = resolveConsumer(expr, tc);
  if (!consumer) return;
  expr.arguments.forEach((arg, i) => inspectArgument(arg, i, consumer, expr, sf, tc, root, out));
}

function walkNodes(
  node: ts.Node, sf: ts.SourceFile, tc: ts.TypeChecker,
  root: string, out: WiringStructuralRelation[]
): void {
  if (ts.isNewExpression(node)) {
    inspectNewExpression(node, sf, tc, root, out);
  }
  ts.forEachChild(node, child => walkNodes(child, sf, tc, root, out));
}

export function extractWiringRelations(
  program: ts.Program,
  workspaceRoot: string,
  sourceFiles?: readonly ts.SourceFile[]
): readonly WiringStructuralRelation[] {
  const tc = program.getTypeChecker();
  const files = (sourceFiles ?? program.getSourceFiles()).filter(sf => !sf.isDeclarationFile);
  const relations: WiringStructuralRelation[] = [];

  for (const sf of files) {
    walkNodes(sf, sf, tc, workspaceRoot, relations);
  }
  return Object.freeze(relations);
}
