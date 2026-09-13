/**
 * Precise text location within a source file (1-indexed).
 */
export interface RepositoryLocation {
  readonly startLine: number;
  readonly endLine: number;
  readonly startColumn?: number;
  readonly endColumn?: number;
}

/**
 * Validates text location ranges.
 */
export function isValidLocation(location: RepositoryLocation): boolean {
  if (!Number.isInteger(location.startLine) || !Number.isInteger(location.endLine)) {
    return false;
  }
  if (location.startLine < 1 || location.endLine < location.startLine) {
    return false;
  }
  if (location.startColumn !== undefined && location.startColumn < 0) {
    return false;
  }
  if (location.endColumn !== undefined && location.endColumn < 0) {
    return false;
  }
  return true;
}
