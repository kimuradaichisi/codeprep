/*
 * Copyright 2026 CodePrep Contributors
 */
import { PathValidator } from '../../../shared/domain/PathValidator';

export class PathExtractor {
  private static readonly PATTERNS = [
    /##\s*File:\s*([^\s`]+)/i,
    /`([^`]+)`\s*:?$/,
    /\*\*([^*]+)\*\*\s*:?$/,
    /__([^_]+)__\s*:?$/,
    /^[-*+]\s+([^\s`].*?)\s*:?$/,
    /^\d+\.\s+([^\s`].*?)\s*:?$/
  ];

  public extractPathFromContext(context: string): string | null {
    const lines = context.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    for (let i = lines.length - 1; i >= 0; i--) {
      const path = this.extractPathFromLine(lines[i]);
      if (path) return path;
    }
    return null;
  }

  private extractPathFromLine(line: string): string | null {
    for (const regex of PathExtractor.PATTERNS) {
      const match = line.match(regex);
      if (match && PathValidator.isValidFilePath(match[1].trim())) {
        return match[1].trim();
      }
    }
    return this.extractInlineOrPlain(line);
  }

  private extractInlineOrPlain(line: string): string | null {
    const inlineRegex = /`([^`]+)`/g;
    let match, lastInline = null;
    while ((match = inlineRegex.exec(line)) !== null) {
      if (PathValidator.isValidFilePath(match[1].trim())) {
        lastInline = match[1].trim();
      }
    }
    return lastInline || this.extractPlainPath(line);
  }

  private extractPlainPath(line: string): string | null {
    const pathRegex = /[a-z0-9_./\\@+-]+/gi;
    let match, lastPlain = null;
    while ((match = pathRegex.exec(line)) !== null) {
      if (PathValidator.isValidFilePath(match[0])) {
        lastPlain = match[0];
      }
    }
    return lastPlain;
  }
}