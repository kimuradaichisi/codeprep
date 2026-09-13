import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { extractInheritanceRelations } from '../TypeScriptInheritanceAnalyzer';
import { extractReferenceRelations } from '../TypeScriptReferenceAnalyzer';
import { TypeScriptLanguageAdapter } from '../TypeScriptLanguageAdapter';

describe('TypeScriptLanguageAdapter Unit Tests', () => {
  it('returns capabilities matching specification', () => {
    const adapter = new TypeScriptLanguageAdapter();
    const caps = adapter.getCapabilities();
    expect(caps.implementations).toBe(true);
    expect(caps.typeHierarchy).toBe(true);
    expect(caps.references).toBe(true);
    expect(caps.callHierarchy).toBe(false); // CALLS is deferred
  });

  it('extracts implements and extends from AST correctly', () => {
    const sourceCode = `
      interface MyPort { execute(): void; }
      class BaseService {}
      class MyAdapter extends BaseService implements MyPort {
        execute(): void {}
      }
    `;
    const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
    const host: ts.CompilerHost = {
      getSourceFile: (name) => name === 'test.ts' ? sourceFile : undefined,
      getDefaultLibFileName: () => 'lib.d.ts',
      writeFile: () => {},
      getCurrentDirectory: () => '/',
      getCanonicalFileName: (f) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (name) => name === 'test.ts',
      readFile: (name) => name === 'test.ts' ? sourceCode : undefined,
    };

    const program = ts.createProgram(['test.ts'], { target: ts.ScriptTarget.ES2022 }, host);
    const relations = extractInheritanceRelations(program, '/', [sourceFile]);

    expect(relations.length).toBeGreaterThanOrEqual(2);
    const extendsRel = relations.find(r => r.relationType === 'extends');
    const implementsRel = relations.find(r => r.relationType === 'implements');

    expect(extendsRel?.source.symbolName).toBe('MyAdapter');
    expect(extendsRel?.target.symbolName).toBe('BaseService');
    expect(implementsRel?.source.symbolName).toBe('MyAdapter');
    expect(implementsRel?.target.symbolName).toBe('MyPort');
  });

  it('extracts symbol references correctly', () => {
    const sourceCode = `
      class Helper { static help(): void {} }
      class Consumer {
        run(): void { Helper.help(); }
      }
    `;
    const sourceFile = ts.createSourceFile('test2.ts', sourceCode, ts.ScriptTarget.Latest, true);
    const host: ts.CompilerHost = {
      getSourceFile: (name) => name === 'test2.ts' ? sourceFile : undefined,
      getDefaultLibFileName: () => 'lib.d.ts',
      writeFile: () => {},
      getCurrentDirectory: () => '/',
      getCanonicalFileName: (f) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (name) => name === 'test2.ts',
      readFile: (name) => name === 'test2.ts' ? sourceCode : undefined,
    };

    const program = ts.createProgram(['test2.ts'], { target: ts.ScriptTarget.ES2022 }, host);
    const relations = extractReferenceRelations(program, '/', [sourceFile]);

    const ref = relations.find(r => r.target.symbolName === 'Helper');
    expect(ref).toBeDefined();
    expect(ref?.relationType).toBe('references');
  });
});
