/*
 * Copyright 2026 CodePrep Contributors
 */
export type OutputFormat = 'markdown' | 'xml' | 'json';

export interface OutputOptions {
  format: OutputFormat;
  includeMetadata: boolean;
  removeComments: boolean;
  includeEmptyLines: boolean;
  outputMode: 'everything' | 'structureOnly';
  maxFileSizeKB?: number;
  skeletonMode?: boolean;
  autoOptimizeByBudget?: boolean;
  includeDependencies?: boolean;
  includeErrors?: boolean;
  incrementalMode?: boolean;
}