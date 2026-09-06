// src/features/repository-context/domain/EntryPointCandidate.ts
import type { ProjectId } from './Project';

export const entryPointCandidateReasons = [
  'exactFilenameMatch',
  'filenameMatch',
  'pathMatch',
  'textMatch',
  'headingMatch',
  'symbolLikeMatch',
  'manualPin',
] as const;

export type EntryPointCandidateReason = (typeof entryPointCandidateReasons)[number];

export type EntryPointCandidateKind = 'code' | 'document' | 'other';

export type EntryPointCandidateEvidence = Readonly<{
  projectId: ProjectId;
  relativePath: string;
  reason: EntryPointCandidateReason;
  matchedTerm?: string;
}>;

export type EntryPointCandidate = Readonly<{
  projectId: ProjectId;
  relativePath: string;
  score: number;
  reasons: readonly EntryPointCandidateReason[];
  matchedTerms: readonly string[];
  kind?: EntryPointCandidateKind;
}>;

export const isEntryPointCandidateReason = (value: unknown): value is EntryPointCandidateReason =>
  typeof value === 'string' && entryPointCandidateReasons.includes(value as EntryPointCandidateReason);

export const resolveCandidateKind = (relativePath: string): EntryPointCandidateKind => {
  const normalized = relativePath.toLowerCase();
  if (normalized.endsWith('.md') || normalized.endsWith('.txt') || normalized.endsWith('.markdown')) {
    return 'document';
  }
  if (/\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|cs|rb|php)$/.test(normalized)) {
    return 'code';
  }
  return 'other';
};
