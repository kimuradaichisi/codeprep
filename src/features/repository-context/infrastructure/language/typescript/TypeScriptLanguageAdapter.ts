import type {
  LanguageAnalysisInput,
  LanguageAnalysisResult,
  LanguageCapabilities,
  LanguageIntelligencePort,
} from '../../../application/ir/language';
import { createTypeScriptProgram } from './TypeScriptProgramLoader';
import { extractInheritanceRelations } from './TypeScriptInheritanceAnalyzer';
import { extractReferenceRelations } from './TypeScriptReferenceAnalyzer';

const CAPABILITIES: LanguageCapabilities = Object.freeze({
  references: true,
  implementations: true,
  typeHierarchy: true,
  callHierarchy: false, // CALLS is deferred to lazy on-demand query
});

function resolveTargetSourceFiles(
  program: import('typescript').Program,
  relativePaths?: readonly string[]
): readonly import('typescript').SourceFile[] | undefined {
  if (!relativePaths || relativePaths.length === 0) return undefined;
  return relativePaths
    .map(p => program.getSourceFile(p))
    .filter((sf): sf is import('typescript').SourceFile => sf !== undefined);
}

export class TypeScriptLanguageAdapter implements LanguageIntelligencePort {
  public getCapabilities(): LanguageCapabilities {
    return CAPABILITIES;
  }

  public async analyze(input: LanguageAnalysisInput): Promise<LanguageAnalysisResult> {
    const program = createTypeScriptProgram(input.workspaceRoot, input.relativePaths);
    const targetSourceFiles = resolveTargetSourceFiles(program, input.relativePaths);
    const inheritance = extractInheritanceRelations(program, input.workspaceRoot, targetSourceFiles);
    const references = extractReferenceRelations(program, input.workspaceRoot, targetSourceFiles);

    return Object.freeze({
      relations: Object.freeze([...inheritance, ...references]),
      unresolvedCount: 0,
      capabilities: CAPABILITIES,
      analyzerName: 'typescript-compiler',
    });
  }
}
