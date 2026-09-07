// src/features/repository-context/application/PrepareTaskContextUseCase.ts
import type { Project } from '../domain/Project';
import type { DiscoverEntryPointCandidatesUseCase } from './DiscoverEntryPointCandidatesUseCase';
import type { EnrichEntryPointCandidatesUseCase } from './EnrichEntryPointCandidatesUseCase';
import type { BuildTaskContextUseCase } from './BuildTaskContextUseCase';
import type { ContextFormatterPort, DesktopContextFile, FileContentPort } from './ports';
import type { ContextConfidence } from '../domain/ContextConfidence';
import { evaluateContextConfidence } from '../domain/ContextConfidenceEvaluator';
import { resolveAutoPackDecision, type AutoPackDecision } from '../domain/AutoPackDecision';
import type { EnrichedEntryPointCandidate } from '../domain/CandidateEvidence';
import type { ContextManifest } from '../domain/ContextManifest';

export type PrepareContextQuery = Readonly<{
  task: string;
  maxCandidates?: number;
  enrichTopN?: number;
  tokenLimit?: number;
}>;

export type TaskContextPack = Readonly<{
  manifest: ContextManifest;
  content: string;
  warnings: readonly string[];
}>;

export type PrepareContextResult = Readonly<{
  task: string;
  candidates: readonly EnrichedEntryPointCandidate[];
  confidence: ContextConfidence;
  decision: AutoPackDecision;
  contextPack?: TaskContextPack;
}>;

export type PrepareTaskContextPorts = Readonly<{
  project: Project;
  discoverUseCase: DiscoverEntryPointCandidatesUseCase;
  enrichUseCase: EnrichEntryPointCandidatesUseCase;
  buildContextUseCase: BuildTaskContextUseCase;
  fileContentPort: FileContentPort;
  formatter: ContextFormatterPort;
}>;

export class PrepareTaskContextUseCase {
  constructor(private readonly ports: PrepareTaskContextPorts) {}

  async execute(query: PrepareContextQuery): Promise<PrepareContextResult> {
    const candidates = await this.discoverAndEnrich(query);
    const confidence = evaluateContextConfidence({ candidates });
    const decision = resolveAutoPackDecision(confidence, candidates);
    const contextPack = decision.decision === 'AUTO_FAST_PACK'
      ? await this.buildFastPack(query.task, decision.autoSelectedEntryPoints, query.tokenLimit)
      : undefined;

    return Object.freeze({ task: query.task, candidates, confidence, decision, contextPack });
  }

  private async discoverAndEnrich(q: PrepareContextQuery): Promise<readonly EnrichedEntryPointCandidate[]> {
    const pid = this.ports.project.id;
    const maxC = q.maxCandidates ?? 10;
    const enrichN = q.enrichTopN ?? 5;
    const discovered = await this.ports.discoverUseCase.execute({ task: q.task, projectIds: [pid], maxCandidates: maxC });
    return this.ports.enrichUseCase.execute({ task: q.task, projectIds: [pid], candidates: discovered.candidates, options: { enrichTopN: enrichN } });
  }

  private async loadFiles(paths: readonly string[]): Promise<DesktopContextFile[]> {
    const files: DesktopContextFile[] = [];
    for (const rel of paths) {
      const content = await this.ports.fileContentPort.read(this.ports.project, rel);
      if (content !== undefined) files.push({ relativePath: rel, content });
    }
    return files;
  }

  private async buildFastPack(task: string, entryPoints: readonly string[], tokenLimit?: number): Promise<TaskContextPack> {
    const buildRes = await this.ports.buildContextUseCase.execute({
      taskContext: { projectId: this.ports.project.id, task, entryPoints },
      tokenLimit: tokenLimit ?? 40000,
      strategy: 'fast',
    });
    const paths = buildRes.manifest.entries.map((e) => e.relativePath);
    const files = await this.loadFiles(paths);
    const header = createCompletePackHeader(paths);
    const body = this.ports.formatter.format({ format: 'markdown', files });
    return Object.freeze({
      manifest: buildRes.manifest,
      content: header + body,
      warnings: buildRes.warnings.map((w) => w.message),
    });
  }
}

function createCompletePackHeader(paths: readonly string[]): string {
  const list = paths.map((p) => `- \`${p}\``).join('\n');
  return `<!-- CODEPREP_FAST_PACK_START -->\n> [!IMPORTANT]\n> **Context Confidence: HIGH** (Auto Fast Pack Generated)\n> Included files:\n${list}\n> Directly start implementation. Additional manual Read/Grep on these files is not required.\n\n`;
}
