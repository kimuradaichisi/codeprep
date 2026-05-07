/*
 * Copyright 2026 CodePrep Contributors
 */
import * as ts from 'typescript';
import { ISkeletonCompressor } from '../../domain/ISkeletonCompressor';

/**
 * 文字列スライス方式によるTS圧縮機
 * ASTで関数の範囲を特定し、文字列操作で確実に置換する
 */
export class TypescriptCompressor implements ISkeletonCompressor {
  public readonly extensions: string[] = ['.ts', '.tsx', '.js', '.jsx'];

  public compress(code: string): string {
    if (!code || !code.trim()) return '';
    
    const sourceFile = ts.createSourceFile('temp.ts', code, ts.ScriptTarget.Latest, true);
    const replacements: { start: number; end: number }[] = [];

    // 1. ASTを走査して置換が必要な範囲（body）を特定する
    this.findReplacements(sourceFile, replacements);

    if (replacements.length === 0) return code;

    // 2. 後ろから順に置換（インデックスがずれないようにするため）
    return this.applyReplacements(code, replacements);
  }

  private findReplacements(node: ts.Node, result: { start: number; end: number }[]): void {
    if (this.isCompressible(node)) {
      const body = (node as any).body;
      // ブロック（中括弧があるもの）だけを置換対象にする
      if (body && ts.isBlock(body)) {
        result.push({ start: body.getStart(), end: body.getEnd() });
      }
    }
    ts.forEachChild(node, (child) => this.findReplacements(child, result));
  }

  private isCompressible(node: ts.Node): boolean {
    return ts.isFunctionDeclaration(node) || 
           ts.isMethodDeclaration(node) || 
           ts.isArrowFunction(node);
  }

  private applyReplacements(code: string, replacements: { start: number; end: number }[]): string {
    let result = code;
    // 逆順にソート
    const sorted = [...replacements].sort((a, b) => b.start - a.start);

    for (const r of sorted) {
      const before = result.substring(0, r.start);
      const after = result.substring(r.end);
      result = `${before}{\n  // ... existing code ...\n}${after}`;
    }
    return result;
  }
}