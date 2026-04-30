export type OutputFormat = 'markdown' | 'xml' | 'json';

export interface OutputOptions {
  format: OutputFormat;
  includeMetadata: boolean;
  removeComments: boolean;
  includeEmptyLines: boolean;
  outputMode: 'everything' | 'structureOnly';
}
