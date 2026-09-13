import type {
  DependencyWiringPort,
  WiringAnalysisInput,
  WiringAnalysisResult,
  WiringCapabilities,
} from '../../../application/ir/composition';
import type { TypeScriptAnalysisSession } from '../../language/typescript/TypeScriptAnalysisSession';
import { createTypeScriptProgram } from '../../language/typescript/TypeScriptProgramLoader';
import { extractWiringRelations } from './TypeScriptConstructionScanner';

import * as path from 'node:path';

const CAPABILITIES: WiringCapabilities = Object.freeze({
  manualComposition: true,
  localVariableTracking: true,
});

function resolveTargetFiles(
  program: import('typescript').Program,
  workspaceRoot: string,
  relativePaths?: readonly string[]
): readonly import('typescript').SourceFile[] | undefined {
  if (!relativePaths || relativePaths.length === 0) return undefined;
  const absPaths = new Set(relativePaths.map(p => path.resolve(workspaceRoot, p).toLowerCase()));
  return program.getSourceFiles().filter(sf => absPaths.has(path.resolve(sf.fileName).toLowerCase()));
}

export class TypeScriptWiringAdapter implements DependencyWiringPort {
  constructor(private readonly session?: TypeScriptAnalysisSession) {}

  public getCapabilities(): WiringCapabilities {
    return CAPABILITIES;
  }

  public async analyze(input: WiringAnalysisInput): Promise<WiringAnalysisResult> {
    const program = this.session?.program ?? createTypeScriptProgram(input.workspaceRoot, input.relativePaths);
    const targetSourceFiles = resolveTargetFiles(program, input.workspaceRoot, input.relativePaths);
    const relations = extractWiringRelations(program, input.workspaceRoot, targetSourceFiles);

    return Object.freeze({
      relations: Object.freeze(relations),
      unresolvedCount: 0,
      analyzerName: 'typescript-manual-composition',
    });
  }
}
