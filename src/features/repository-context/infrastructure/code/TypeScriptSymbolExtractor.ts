import ts from 'typescript';
import type { CodeSymbolExtractorPort } from '../../application/structuredKnowledgePorts';
import type { CodeSymbolEntry } from '../../domain/CodeSymbolEntry';
import {
  handleClass,
  handleEnum,
  handleFunction,
  handleInterface,
  handleTypeAlias,
  handleVariable,
  type SymbolContext,
} from './SymbolDeclarationHandlers';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

function getExtension(filePath: string): string {
  const dotIndex = filePath.lastIndexOf('.');
  return dotIndex !== -1 ? filePath.substring(dotIndex).toLowerCase() : '';
}

function processStatement(statement: ts.Statement, ctx: SymbolContext): CodeSymbolEntry[] {
  if (ts.isClassDeclaration(statement)) {
    return handleClass(statement, ctx);
  }
  if (ts.isFunctionDeclaration(statement)) {
    return handleFunction(statement, ctx);
  }
  if (ts.isInterfaceDeclaration(statement)) {
    return handleInterface(statement, ctx);
  }
  if (ts.isTypeAliasDeclaration(statement)) {
    return handleTypeAlias(statement, ctx);
  }
  if (ts.isEnumDeclaration(statement)) {
    return handleEnum(statement, ctx);
  }
  if (ts.isVariableStatement(statement)) {
    return handleVariable(statement, ctx);
  }
  return [];
}

export class TypeScriptSymbolExtractor implements CodeSymbolExtractorPort {
  supports(relativePath: string): boolean {
    return SUPPORTED_EXTENSIONS.has(getExtension(relativePath));
  }

  extract(projectId: string, relativePath: string, content: string): CodeSymbolEntry[] {
    if (!this.supports(relativePath)) {
      return [];
    }
    try {
      const sourceFile = ts.createSourceFile(
        relativePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );
      const ctx: SymbolContext = { projectId, relativePath, sourceFile };
      const entries: CodeSymbolEntry[] = [];
      for (const statement of sourceFile.statements) {
        const extracted = processStatement(statement, ctx);
        entries.push(...extracted);
      }
      return entries;
    } catch {
      return [];
    }
  }
}
