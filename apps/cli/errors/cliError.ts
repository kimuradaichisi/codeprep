/*
 * Copyright 2026 CodePrep Contributors
 */

export const CLI_EXIT_CODES = {
  SUCCESS: 0,
  UNEXPECTED_FAILURE: 1,
  INVALID_ARGUMENTS: 2,
  KNOWLEDGE_MISSING: 3,
  KNOWLEDGE_STALE: 4,
  REPOSITORY_UNAVAILABLE: 5,
  ENTITY_NOT_FOUND: 6,
} as const;

export type CliExitCodeValue = (typeof CLI_EXIT_CODES)[keyof typeof CLI_EXIT_CODES];

export interface StructuredErrorPayload {
  readonly schemaVersion: 1;
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly suggestedAction?: string;
  };
}

export class CliError extends Error {
  public readonly exitCode: CliExitCodeValue;
  public readonly errorCode: string;
  public readonly suggestedAction?: string;

  public constructor(params: {
    message: string;
    exitCode: CliExitCodeValue;
    errorCode: string;
    suggestedAction?: string;
  }) {
    super(params.message);
    this.name = 'CliError';
    this.exitCode = params.exitCode;
    this.errorCode = params.errorCode;
    this.suggestedAction = params.suggestedAction;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function createStructuredErrorResponse(err: unknown): StructuredErrorPayload {
  if (err instanceof CliError) {
    return {
      schemaVersion: 1,
      ok: false,
      error: {
        code: err.errorCode,
        message: err.message,
        suggestedAction: err.suggestedAction,
      },
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  return {
    schemaVersion: 1,
    ok: false,
    error: {
      code: 'UNEXPECTED_FAILURE',
      message,
      suggestedAction: 'codeprep commands --json',
    },
  };
}

export function resolveExitCode(err: unknown): number {
  if (err instanceof CliError) {
    return err.exitCode;
  }
  return CLI_EXIT_CODES.UNEXPECTED_FAILURE;
}
