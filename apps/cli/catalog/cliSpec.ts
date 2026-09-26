/*
 * Copyright 2026 CodePrep Contributors
 */

export type CliOutputFormat = 'json' | 'text' | 'markdown';

export interface CliOptionSpec {
  readonly name: string;
  readonly alias?: string;
  readonly type: 'string' | 'boolean' | 'number';
  readonly required?: boolean;
  readonly defaultValue?: string | boolean | number;
  readonly description: string;
  readonly valueHint?: string;
  readonly choices?: readonly string[];
}

export interface CliExitCodeSpec {
  readonly code: number;
  readonly meaning: string;
  readonly description: string;
}

export interface CliExample {
  readonly description: string;
  readonly command: string;
  readonly explanation?: string;
}

export interface CliCommandSpec {
  readonly name: string;
  readonly path: readonly string[];
  readonly summary: string;
  readonly description?: string;
  readonly category: 'repository' | 'knowledge' | 'context' | 'system';
  readonly options: readonly CliOptionSpec[];
  readonly outputFormats: readonly CliOutputFormat[];
  readonly defaultFormat: CliOutputFormat;
  readonly exitCodes: readonly CliExitCodeSpec[];
  readonly examples: readonly CliExample[];
  readonly legacyAliases?: readonly (readonly string[])[];
  readonly mcpEquivalent?: string;
  readonly sharedUseCase?: string;
}

export interface CommandCatalogDto {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly commands: readonly CliCommandSpec[];
}
