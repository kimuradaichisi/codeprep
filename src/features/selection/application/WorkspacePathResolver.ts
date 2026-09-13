/*
 * Copyright 2026 CodePrep Contributors
 */

export interface WorkspacePathResolver {
  resolve(paths: readonly string[]): Promise<string[]>;
}
