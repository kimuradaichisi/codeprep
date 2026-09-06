// src/features/repository-context/application/ExpandContextFromEvidence.ts
import type { CandidateFile, CandidateReason } from '../domain/CandidateFile';
import { createCandidateFile } from '../domain/CandidateFile';
import type { CandidateEvidence, CandidateEvidenceKind } from '../domain/CandidateEvidence';

const reasonForKind = (kind: CandidateEvidenceKind): CandidateReason => {
  if (kind === 'dependency') return 'dependency';
  return 'pathAffinity';
};

export const MAX_RELATED_CONTEXT_PER_CANDIDATE = 5;

const tryAddCandidate = (
  ev: CandidateEvidence,
  seen: Set<string>,
  out: CandidateFile[],
  max: number
): void => {
  if (!ev.relatedPath || out.length >= max) return;
  const key = `${ev.projectId}:${ev.relatedPath}`;
  if (!seen.has(key)) {
    seen.add(key);
    out.push(createCandidateFile(ev.projectId, ev.relatedPath, [reasonForKind(ev.kind)]));
  }
};

export function expandContextFromEvidence(
  evidences: readonly CandidateEvidence[],
  maxExpansion = MAX_RELATED_CONTEXT_PER_CANDIDATE
): readonly CandidateFile[] {
  const seen = new Set<string>();
  const candidates: CandidateFile[] = [];
  for (const ev of evidences) {
    tryAddCandidate(ev, seen, candidates, maxExpansion);
  }
  return candidates;
}
