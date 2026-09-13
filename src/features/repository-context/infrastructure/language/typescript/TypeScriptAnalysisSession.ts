import type ts from 'typescript';
import { createTypeScriptProgram } from './TypeScriptProgramLoader';

export interface TypeScriptAnalysisSession {
  readonly program: ts.Program;
  readonly typeChecker: ts.TypeChecker;
  readonly workspaceRoot: string;
}

export function createAnalysisSession(
  workspaceRoot: string,
  targetFilePaths?: readonly string[]
): TypeScriptAnalysisSession {
  const program = createTypeScriptProgram(workspaceRoot, targetFilePaths);
  const typeChecker = program.getTypeChecker();
  return Object.freeze({
    program,
    typeChecker,
    workspaceRoot,
  });
}
