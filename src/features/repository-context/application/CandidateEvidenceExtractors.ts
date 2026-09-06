// src/features/repository-context/application/CandidateEvidenceExtractors.ts
import type { DependencyScanner } from '../../engine/application/DependencyScanner';
import type {
  CandidateEvidence,
  CandidateEvidenceDiagnostic,
  CandidateEvidenceKind,
} from '../domain/CandidateEvidence';
import type { EntryPointCandidate } from '../domain/EntryPointCandidate';
import type { Project } from '../domain/Project';
import type { StructuredKnowledgeEntry, StructuredKnowledgeIndex } from '../domain/StructuredKnowledgeIndex';
import type { RecommendationRecord } from '../domain/Recommendation';
import type { FileContentPort, RecommendationSourcePort, RecommendationSourcePorts } from './ports';

export async function extractDependencyEvidences(
  project: Project,
  candidate: EntryPointCandidate,
  fileContent: FileContentPort,
  scanner?: DependencyScanner
): Promise<readonly CandidateEvidence[]> {
  if (!scanner) return [];
  try {
    const content = await fileContent.read(project, candidate.relativePath);
    return typeof content === 'string'
      ? toDependencyEvidences(project, candidate.relativePath, await scanner.findDependencies(candidate.relativePath, content, project.rootPath))
      : [];
  } catch {
    return [];
  }
}

const toDependencyEvidences = (project: Project, candidatePath: string, deps: readonly string[]): readonly CandidateEvidence[] =>
  deps.map((dep) => ({ kind: 'dependency', projectId: project.id, candidatePath, relatedPath: dep, detail: `direct dependency: ${dep}` }));

export function extractRelatedTestEvidences(
  project: Project,
  candidate: EntryPointCandidate,
  allFiles: readonly Readonly<{ relativePath: string }>[]
): readonly CandidateEvidence[] {
  const base = getFileBase(candidate.relativePath);
  if (!base || isTestPath(candidate.relativePath)) return [];
  return allFiles
    .filter((f) => isTestPath(f.relativePath) && f.relativePath.toLowerCase().includes(base))
    .map((f) => ({ kind: 'relatedTest', projectId: project.id, candidatePath: candidate.relativePath, relatedPath: f.relativePath, detail: `matching test file: ${f.relativePath}` }));
}

const getFileBase = (path: string): string =>
  path.replace(/\\/g, '/').toLowerCase().split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';

const isTestPath = (path: string): boolean => {
  const norm = path.replace(/\\/g, '/').toLowerCase();
  const base = norm.split('/').pop() ?? '';
  return norm.includes('__tests__') || base.includes('.test.') || base.includes('.spec.');
};

const toEvidenceKind = (source: string): CandidateEvidenceKind | undefined => {
  if (source === 'gitCoChange' || source === 'directoryProximity' || source === 'markdownLink') return source;
  return undefined;
};

export async function extractRecommendationEvidences(
  project: Project,
  candidate: EntryPointCandidate,
  recommendations?: RecommendationSourcePorts
): Promise<{ evidences: readonly CandidateEvidence[]; diagnostics: readonly CandidateEvidenceDiagnostic[] }> {
  if (!recommendations) return { evidences: [], diagnostics: [] };
  const evidences: CandidateEvidence[] = [];
  const diagnostics: CandidateEvidenceDiagnostic[] = [];
  for (const [source, port] of Object.entries(recommendations)) {
    await collectSingleRecommendation({ project, candidatePath: candidate.relativePath, source, port }, evidences, diagnostics);
  }
  return { evidences, diagnostics };
}

type RecContext = Readonly<{ project: Project; candidatePath: string; source: string; port: RecommendationSourcePort | undefined }>;

async function collectSingleRecommendation(ctx: RecContext, out: CandidateEvidence[], diag: CandidateEvidenceDiagnostic[]): Promise<void> {
  const kind = toEvidenceKind(ctx.source);
  if (!ctx.port || !kind) return;
  try {
    const records = await ctx.port.recommend(ctx.project, ctx.candidatePath);
    for (const r of records) out.push(toRecommendationEvidence(kind, ctx.project.id, ctx.candidatePath, r));
  } catch (err) {
    diag.push({ kind, message: `${ctx.source} recommendation failed: ${String(err)}` });
  }
}

const toRecommendationEvidence = (
  kind: CandidateEvidenceKind,
  projectId: string,
  candidatePath: string,
  r: RecommendationRecord
): CandidateEvidence => ({
  kind,
  projectId,
  candidatePath,
  relatedPath: r.relativePath,
  score: r.reason.score,
  detail: r.reason.detail,
});

export function extractSymbolSupportEvidences(
  project: Project,
  candidate: EntryPointCandidate,
  task: string,
  knowledgeIndex?: StructuredKnowledgeIndex
): readonly CandidateEvidence[] {
  if (!knowledgeIndex) return [];
  const terms = extractTerms(task);
  return terms.length === 0 ? [] : matchSymbolEvidences(project, candidate.relativePath, terms, knowledgeIndex.entries);
}

const matchSymbolEvidences = (
  project: Project,
  candidatePath: string,
  terms: readonly string[],
  entries: readonly StructuredKnowledgeEntry[]
): readonly CandidateEvidence[] => {
  const matched: CandidateEvidence[] = [];
  for (const e of entries) {
    if (e.kind !== 'code-symbol' || e.relativePath !== candidatePath) continue;
    const lower = e.symbolName.toLowerCase();
    if (terms.some((t) => lower.includes(t))) {
      matched.push({ kind: 'symbolSupport', projectId: project.id, candidatePath, relatedSymbol: e.symbolName, startLine: e.startLine, endLine: e.endLine, detail: `${e.symbolKind} ${e.symbolName}` });
    }
  }
  return matched;
};

const extractTerms = (task: string): readonly string[] => {
  const matches = task.toLowerCase().match(/[a-z0-9_]{3,}|[\u4e00-\u9faf\u30a0-\u30ff]{2,}/g) ?? [];
  return Array.from(new Set(matches));
};
