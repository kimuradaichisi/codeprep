import ts from 'typescript';
import { resolveActualSymbol } from '../../language/typescript/TypeScriptSymbolLocator';

export interface ResolvedConcreteSymbol {
  readonly symbol: ts.Symbol;
  readonly declaration: ts.Declaration;
  readonly sourceFile: ts.SourceFile;
}

function extractConcreteFromSymbol(rawSym: ts.Symbol | undefined, tc: ts.TypeChecker): ResolvedConcreteSymbol | undefined {
  if (!rawSym) return undefined;
  const sym = resolveActualSymbol(rawSym, tc);
  if (!sym?.declarations?.[0]) return undefined;
  const declaration = sym.declarations[0];
  const sourceFile = declaration.getSourceFile();
  if (sourceFile.isDeclarationFile) return undefined;
  return { symbol: sym, declaration, sourceFile };
}

function resolveFromNewExpr(expr: ts.NewExpression, tc: ts.TypeChecker): ResolvedConcreteSymbol | undefined {
  const sym = tc.getSymbolAtLocation(expr.expression);
  return extractConcreteFromSymbol(sym, tc);
}

function resolveFromIdentifier(idNode: ts.Identifier, tc: ts.TypeChecker): ResolvedConcreteSymbol | undefined {
  const sym = tc.getSymbolAtLocation(idNode);
  if (!sym?.declarations?.[0]) return undefined;
  const decl = sym.declarations[0];
  if (!ts.isVariableDeclaration(decl) || !decl.initializer || !ts.isNewExpression(decl.initializer)) {
    return undefined;
  }
  return resolveFromNewExpr(decl.initializer, tc);
}

export function resolveConcreteArgument(
  expr: ts.Expression,
  tc: ts.TypeChecker
): ResolvedConcreteSymbol | undefined {
  if (ts.isNewExpression(expr)) {
    return resolveFromNewExpr(expr, tc);
  }
  if (ts.isIdentifier(expr)) {
    return resolveFromIdentifier(expr, tc);
  }
  return undefined;
}
