/*
 * Copyright 2026 CodePrep Contributors
 */
export class SkeletonService {
  // メソッドシグネチャを広範にカバー
  private readonly SIG_RE = /^(export\s+)?(public\s+|private\s+|protected\s+|static\s+|abstract\s+|async\s+)?(class|interface|type|enum|function|const|let|var|import|from|get\s+|set\s+|constructor|(\w+\s*\(.*?\)\s*(:|\{)))/;

  public extract(content: string): string {
    const lines = content.split(/\r?\n/);
    const skeleton: string[] = [];
    let depth = 0;

    for (const line of lines) {
      const isSig = this.SIG_RE.test(line.trim());
      if (isSig || line.trim() === '}') {
      skeleton.push(line);
        if (line.includes('{')) depth++;
        if (line.trim() === '}') depth--;
      } else if (depth > 0) {
      this.addOmitComment(skeleton);
}
  }
    return skeleton.join('\n');
}

  private addOmitComment(skeleton: string[]): void {
    const msg = '  // ... implementation omitted';
    if (skeleton.length > 0 && skeleton[skeleton.length - 1] !== msg) {
      skeleton.push(msg);
    }
  }
}