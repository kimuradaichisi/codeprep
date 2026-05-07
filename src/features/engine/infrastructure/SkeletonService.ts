/*
 * Copyright 2026 CodePrep Contributors
 */
import { ISkeletonCompressor } from '../domain/ISkeletonCompressor';
import { GenericCompressor } from './compressors/GenericCompressor';
import { TypescriptCompressor } from './compressors/TypescriptCompressor';

/**
 * ファイル形式に応じて適切な圧縮機を選択し、スケルトンを生成する
 */
export class SkeletonService {
  private compressors: Map<string, ISkeletonCompressor> = new Map();
  private generic: ISkeletonCompressor = new GenericCompressor();

  constructor() {
    this.register(new TypescriptCompressor());
    }

  private register(compressor: ISkeletonCompressor): void {
    compressor.extensions.forEach(ext => this.compressors.set(ext.toLowerCase(), compressor));
  }

  /**
   * 指定されたファイルのスケルトンを生成する
   */
  public generateSkeleton(filename: string, code: string): string {
    const ext = this.extractExtension(filename);
    const compressor = this.compressors.get(ext) || this.generic;
    return compressor.compress(code);
  }

  private extractExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
  }
}