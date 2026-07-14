/*
 * Copyright 2026 CodePrep Contributors
 */
import { SkeletonService } from '../infrastructure/SkeletonService';

export interface OptimizeInput {
  files: Array<{ path: string; content: string; skeleton?: boolean }>;
  byteLimit: number;
  activePath?: string;
}

interface ScoredFile {
  file: { path: string; content: string; skeleton?: boolean };
  score: number;
  size: number;
}

export class BudgetOptimizer {
  constructor(private readonly skeletonService: SkeletonService) {}

  public optimize(
    input: OptimizeInput,
    onExclude?: (path: string) => void
  ): Array<{ path: string; content: string; skeleton?: boolean }> {
    const scored = this.scoreFiles(input.files, input.activePath);
    return this.packFiles(scored, input.byteLimit, onExclude);
  }

  private scoreFiles(files: OptimizeInput['files'], activePath?: string): ScoredFile[] {
    const scored = files.map(f => {
      const isActive = activePath && f.path.replace(/\\/g, '/') === activePath;
      const size = new TextEncoder().encode(f.content).byteLength;
      const score = isActive ? 1000000000 : (100000000 - size);
      return { file: f, score, size };
    });
    return scored.sort((left, right) => right.score - left.score);
  }

  private packFiles(scored: ScoredFile[], byteLimit: number, onExclude?: (path: string) => void): OptimizeInput['files'] {
    const result: OptimizeInput['files'] = [];
    let accumulated = 0;
    for (const item of scored) {
      const packed = this.packItem(item, accumulated, byteLimit, onExclude);
      if (packed) {
        result.push(packed.file);
        accumulated += packed.size;
      }
    }
    return result;
  }

  private packItem(
    item: ScoredFile,
    accumulated: number,
    byteLimit: number,
    onExclude?: (path: string) => void
  ): { file: OptimizeInput['files'][0]; size: number } | null {
    let f = item.file;
    const fullSize = item.size;
    if (!f.skeleton && (accumulated + fullSize) > byteLimit) {
      f = { ...f, skeleton: true };
    }
    if (f.skeleton) {
      return this.packSkeleton(f, accumulated, byteLimit, onExclude);
    }
    return { file: f, size: fullSize };
  }

  private packSkeleton(
    f: OptimizeInput['files'][0],
    accumulated: number,
    byteLimit: number,
    onExclude?: (path: string) => void
  ): { file: OptimizeInput['files'][0]; size: number } | null {
    const skeletonContent = this.skeletonService.generateSkeleton(f.path, f.content);
    const skeletonSize = new TextEncoder().encode(skeletonContent).byteLength;
    if ((accumulated + skeletonSize) > byteLimit) {
      if (onExclude) onExclude(f.path);
      return null;
    }
    return { file: { ...f, content: skeletonContent }, size: skeletonSize };
  }
}
