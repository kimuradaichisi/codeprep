import ts from 'typescript';
import {
  buildCodeSymbolEntryId,
  type CodeSymbolEntry,
} from '../../domain/CodeSymbolEntry';
import {
  extractDocComment,
  extractSignature,
  getNodeLines,
} from './TypeScriptAstHelper';

export interface SymbolContext {
  readonly projectId: string;
  readonly relativePath: string;
  readonly sourceFile: ts.SourceFile;
}

export function handleClass(node: ts.ClassDeclaration, ctx: SymbolContext): CodeSymbolEntry[] {
  const name = node.name?.text ?? 'AnonymousClass';
  const { startLine, endLine } = getNodeLines(ctx.sourceFile, node);
  const entryId = buildCodeSymbolEntryId(ctx.projectId, ctx.relativePath, 'class', '', name, startLine);
  const classEntry: CodeSymbolEntry = {
    entryId,
    projectId: ctx.projectId,
    relativePath: ctx.relativePath,
    kind: 'code-symbol',
    symbolKind: 'class',
    symbolName: name,
    containerName: '',
    signature: extractSignature(ctx.sourceFile, node),
    docComment: extractDocComment(ctx.sourceFile, node),
    startLine,
    endLine,
  };
  const methodEntries = handleClassMembers(node, name, ctx);
  return [classEntry, ...methodEntries];
}

function handleClassMembers(node: ts.ClassDeclaration, className: string, ctx: SymbolContext): CodeSymbolEntry[] {
  const results: CodeSymbolEntry[] = [];
  for (const member of node.members) {
    if (ts.isMethodDeclaration(member) && member.name) {
      const name = member.name.getText(ctx.sourceFile);
      const { startLine, endLine } = getNodeLines(ctx.sourceFile, member);
      results.push({
        entryId: buildCodeSymbolEntryId(ctx.projectId, ctx.relativePath, 'method', className, name, startLine),
        projectId: ctx.projectId,
        relativePath: ctx.relativePath,
        kind: 'code-symbol',
        symbolKind: 'method',
        symbolName: name,
        containerName: className,
        signature: extractSignature(ctx.sourceFile, member),
        docComment: extractDocComment(ctx.sourceFile, member),
        startLine,
        endLine,
      });
    }
  }
  return results;
}

export function handleFunction(node: ts.FunctionDeclaration, ctx: SymbolContext): CodeSymbolEntry[] {
  const name = node.name?.text ?? 'anonymous';
  const { startLine, endLine } = getNodeLines(ctx.sourceFile, node);
  return [{
    entryId: buildCodeSymbolEntryId(ctx.projectId, ctx.relativePath, 'function', '', name, startLine),
    projectId: ctx.projectId,
    relativePath: ctx.relativePath,
    kind: 'code-symbol',
    symbolKind: 'function',
    symbolName: name,
    containerName: '',
    signature: extractSignature(ctx.sourceFile, node),
    docComment: extractDocComment(ctx.sourceFile, node),
    startLine,
    endLine,
  }];
}

export function handleInterface(node: ts.InterfaceDeclaration, ctx: SymbolContext): CodeSymbolEntry[] {
  const name = node.name.text;
  const { startLine, endLine } = getNodeLines(ctx.sourceFile, node);
  return [{
    entryId: buildCodeSymbolEntryId(ctx.projectId, ctx.relativePath, 'interface', '', name, startLine),
    projectId: ctx.projectId,
    relativePath: ctx.relativePath,
    kind: 'code-symbol',
    symbolKind: 'interface',
    symbolName: name,
    containerName: '',
    signature: extractSignature(ctx.sourceFile, node),
    docComment: extractDocComment(ctx.sourceFile, node),
    startLine,
    endLine,
  }];
}

export function handleTypeAlias(node: ts.TypeAliasDeclaration, ctx: SymbolContext): CodeSymbolEntry[] {
  const name = node.name.text;
  const { startLine, endLine } = getNodeLines(ctx.sourceFile, node);
  return [{
    entryId: buildCodeSymbolEntryId(ctx.projectId, ctx.relativePath, 'type', '', name, startLine),
    projectId: ctx.projectId,
    relativePath: ctx.relativePath,
    kind: 'code-symbol',
    symbolKind: 'type',
    symbolName: name,
    containerName: '',
    signature: extractSignature(ctx.sourceFile, node),
    docComment: extractDocComment(ctx.sourceFile, node),
    startLine,
    endLine,
  }];
}

export function handleEnum(node: ts.EnumDeclaration, ctx: SymbolContext): CodeSymbolEntry[] {
  const name = node.name.text;
  const { startLine, endLine } = getNodeLines(ctx.sourceFile, node);
  return [{
    entryId: buildCodeSymbolEntryId(ctx.projectId, ctx.relativePath, 'enum', '', name, startLine),
    projectId: ctx.projectId,
    relativePath: ctx.relativePath,
    kind: 'code-symbol',
    symbolKind: 'enum',
    symbolName: name,
    containerName: '',
    signature: extractSignature(ctx.sourceFile, node),
    docComment: extractDocComment(ctx.sourceFile, node),
    startLine,
    endLine,
  }];
}

export function handleVariable(node: ts.VariableStatement, ctx: SymbolContext): CodeSymbolEntry[] {
  const results: CodeSymbolEntry[] = [];
  for (const decl of node.declarationList.declarations) {
    const name = decl.name.getText(ctx.sourceFile);
    const isFunc = decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
    const symbolKind = isFunc ? 'function' : 'constant';
    const { startLine, endLine } = getNodeLines(ctx.sourceFile, decl);
    results.push({
      entryId: buildCodeSymbolEntryId(ctx.projectId, ctx.relativePath, symbolKind, '', name, startLine),
      projectId: ctx.projectId,
      relativePath: ctx.relativePath,
      kind: 'code-symbol',
      symbolKind,
      symbolName: name,
      containerName: '',
      signature: extractSignature(ctx.sourceFile, decl),
      docComment: extractDocComment(ctx.sourceFile, node),
      startLine,
      endLine,
    });
  }
  return results;
}
