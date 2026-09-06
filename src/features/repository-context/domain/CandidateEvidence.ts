// src/features/repository-context/domain/CandidateEvidence.ts
import type { EntryPointCandidate } from './EntryPointCandidate';

export const candidateEvidenceKinds = [
  'dependency',
  'relatedTest',
  'gitCoChange',
  'directoryProximity',
  'markdownLink',
  'symbolSupport',
] as const;

export type CandidateEvidenceKind = (typeof candidateEvidenceKinds)[number];

export type CandidateEvidence = Readonly<{
  kind: CandidateEvidenceKind;
  projectId: string;
  candidatePath: string;
  relatedPath?: string;
  relatedSymbol?: string;
  score?: number;
  detail: string;
  startLine?: number;
  endLine?: number;
}>;

export type CandidateEvidenceDiagnostic = Readonly<{
  kind: CandidateEvidenceKind;
  message: string;
}>;

export type CandidateEvidenceBundle = Readonly<{
  projectId: string;
  candidatePath: string;
  evidence: readonly CandidateEvidence[];
  diagnostics: readonly CandidateEvidenceDiagnostic[];
}>;

export type EnrichedEntryPointCandidate = Readonly<{
  candidate: EntryPointCandidate;
  evidence: readonly CandidateEvidence[];
  supportScore: number;
}>;

const evidenceKey = (e: CandidateEvidence): string =>
  `${e.kind}:${e.projectId}:${e.candidatePath}:${e.relatedPath ?? ''}:${e.relatedSymbol ?? ''}:${e.startLine ?? 0}:${e.endLine ?? 0}`;

export function sortCandidateEvidences(evidences: readonly CandidateEvidence[]): readonly CandidateEvidence[] {
  return [...evidences].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if ((a.relatedPath ?? '') !== (b.relatedPath ?? '')) {
      return (a.relatedPath ?? '').localeCompare(b.relatedPath ?? '');
    }
    if ((a.relatedSymbol ?? '') !== (b.relatedSymbol ?? '')) {
      return (a.relatedSymbol ?? '').localeCompare(b.relatedSymbol ?? '');
    }
    return (a.startLine ?? 0) - (b.startLine ?? 0);
  });
}

export function deduplicateCandidateEvidences(evidences: readonly CandidateEvidence[]): readonly CandidateEvidence[] {
  const seen = new Set<string>();
  const result: CandidateEvidence[] = [];
  for (const e of evidences) {
    const key = evidenceKey(e);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(e);
    }
  }
  return sortCandidateEvidences(result);
}
