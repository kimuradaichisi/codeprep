/*
 * Copyright 2026 CodePrep Contributors
 */

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
    // 最後の行から順にパス候補を探す（コードブロックに近い方を優先）
    for (let i = lines.length - 1; i >= 0; i--) {
      const path = this.extractPathFromLine(lines[i]);
      if (path) return path;
    }
    return null;
  }

  private extractPathFromLine(line: string): string | null {
    for (const regex of PathExtractor.PATTERNS) {
      const match = line.match(regex);
      if (match && this.isValidPath(match[1].trim())) {
        return match[1].trim();
      }
    }
    return this.extractInlineOrPlain(line);
  }

  private extractInlineOrPlain(line: string): string | null {
    const inlineRegex = /`([^`]+)`/g;
    let match, lastInline = null;
    while ((match = inlineRegex.exec(line)) !== null) {
      if (this.isValidPath(match[1].trim())) {
        lastInline = match[1].trim();
      }
    }
    return lastInline || this.extractPlainPath(line);
  }

  private extractPlainPath(line: string): string | null {
    const pathRegex = /[a-z0-9_./\\@+-]+/gi;
    let match, lastPlain = null;
    while ((match = pathRegex.exec(line)) !== null) {
      if (this.isValidPath(match[0])) {
        lastPlain = match[0];
      }
    }
    return lastPlain;
  }

  private isValidPath(p: string): boolean {
    if (!p || p.length < 1 || /^\d+\.?$/.test(p) || /[<>|&;()]/.test(p)) {
      return false;
    }
    if (this.isEnvVar(p)) return false;

    const hasExt = /\.[a-z0-9]+$/i.test(p);
    const hasSep = p.includes('/') || p.includes('\\');
    const isSpec = this.isSpecialFileName(p);
    
    return hasExt || hasSep || isSpec || p.startsWith('.');
  }

  private isEnvVar(p: string): boolean {
    const envs = ['PATH', 'HOME', 'USER', 'PORT', 'HOST', 'ENV'];
    return /^[A-Z0-9_]+$/.test(p) && !p.includes('.') && envs.includes(p);
  }

  private isSpecialFileName(p: string): boolean {
    const specials = [
      'dockerfile', 'makefile', 'license', 'readme', 'package.json', 
      'package-lock.json', 'tsconfig.json', 'jsconfig.json',
      'vitest.config.ts', 'jest.config.js', 'vite.config.ts',
      '.env', '.gitignore', '.eslintrc', '.prettierrc'
    ];
    const lower = p.toLowerCase();
    return specials.includes(lower) || lower.includes('.config.');
  }
}