import ts from 'typescript';
import { resolveActualSymbol } from '../../language/typescript/TypeScriptSymbolLocator';

export interface ResolvedParameterInfo {
  readonly parameterName: string;
  readonly parameterIndex: number;
  readonly declaredSymbol?: ts.Symbol;
  readonly declaredDecl?: ts.Declaration;
  readonly declaredSourceFile?: ts.SourceFile;
  readonly declaredTypeName?: string;
}

export interface ResolvedConsumer {
  readonly symbol: ts.Symbol;
  readonly declaration: ts.ClassDeclaration;
  readonly sourceFile: ts.SourceFile;
  readonly parameters: readonly ResolvedParameterInfo[];
}

function resolveDeclaredTypeSymbol(
  param: ts.ParameterDeclaration,
  tc: ts.TypeChecker
) {
  const type = param.type ? tc.getTypeFromTypeNode(param.type) : tc.getTypeAtLocation(param);
  const rawSym = type.getSymbol() ?? type.aliasSymbol;
  if (!rawSym) return undefined;
  const sym = resolveActualSymbol(rawSym, tc);
  if (!sym?.declarations?.[0]) return undefined;
  const decl = sym.declarations[0];
  const sf = decl.getSourceFile();
  if (sf.isDeclarationFile) return undefined;
  return { sym, decl, sf, name: sym.name };
}

function extractParameters(
  ctor: ts.ConstructorDeclaration,
  tc: ts.TypeChecker
): readonly ResolvedParameterInfo[] {
  return ctor.parameters.map((param, index) => {
    const resolvedType = resolveDeclaredTypeSymbol(param, tc);
    return {
      parameterName: param.name.getText(),
      parameterIndex: index,
      declaredSymbol: resolvedType?.sym,
      declaredDecl: resolvedType?.decl,
      declaredSourceFile: resolvedType?.sf,
      declaredTypeName: resolvedType?.name,
    };
  });
}

function findClassConstructor(decl: ts.ClassDeclaration): ts.ConstructorDeclaration | undefined {
  return decl.members.find(ts.isConstructorDeclaration);
}

function extractConsumerClass(expr: ts.NewExpression, tc: ts.TypeChecker) {
  const rawSym = tc.getSymbolAtLocation(expr.expression);
  if (!rawSym) return undefined;
  const sym = resolveActualSymbol(rawSym, tc);
  if (!sym?.declarations?.[0]) return undefined;
  const decl = sym.declarations[0];
  if (!ts.isClassDeclaration(decl)) return undefined;
  const sourceFile = decl.getSourceFile();
  if (sourceFile.isDeclarationFile) return undefined;
  return { sym, decl, sourceFile };
}

export function resolveConsumer(
  expr: ts.NewExpression,
  tc: ts.TypeChecker
): ResolvedConsumer | undefined {
  const cls = extractConsumerClass(expr, tc);
  if (!cls) return undefined;
  const ctor = findClassConstructor(cls.decl);
  const parameters = ctor ? extractParameters(ctor, tc) : [];
  return { symbol: cls.sym, declaration: cls.decl, sourceFile: cls.sourceFile, parameters };
}
