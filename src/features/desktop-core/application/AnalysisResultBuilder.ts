import {
  createCandidateFile,
  type CandidateReason,
} from '../domain/CandidateFile';
import { scoreCandidate } from '../domain/FileScorer';
import type { Project } from '../domain/Project';
import type {
  AnalysisWarning,
  AnalyzeProjectsResult,
  AnalyzedCandidate,
  GitMetadata,
  RipgrepResult,
} from './ports';

export type CandidateSignal = Readonly<{
  project: Project;
  relativePath: string;
  reason: CandidateReason;
}>;

export type ProjectAnalysis = Readonly<{
  signals: readonly CandidateSignal[];
  warnings: readonly AnalysisWarning[];
}>;

export const buildResult = (
  analyses: readonly ProjectAnalysis[],
): AnalyzeProjectsResult => {
  const signals = analyses.flatMap(analysis => analysis.signals);
  const warnings = analyses.flatMap(analysis => analysis.warnings);
  const candidates = sortCandidates(mergeSignals(signals));

  return { candidates, warnings };
};

export const mergeProjectAnalysis = (
  project: Project,
  ripgrep: RipgrepResult,
  git: GitMetadata,
): ProjectAnalysis => ({
  signals: [
    ...ripgrep.matches.map(match => rgSignal(project, match.relativePath)),
    ...git.modifiedPaths.map(path => gitSignal(project, path, 'gitModified')),
    ...git.recentPaths.map(path => gitSignal(project, path, 'recentCommit')),
  ],
  warnings: [ripgrep.warning, git.warning].filter(isWarning),
});

const mergeSignals = (
  signals: readonly CandidateSignal[],
): readonly AnalyzedCandidate[] =>
  [...groupSignals(signals).values()].map(toAnalyzedCandidate);

const groupSignals = (
  signals: readonly CandidateSignal[],
): Map<string, readonly CandidateSignal[]> =>
  signals.reduce((groups, signal) => {
    const key = `${signal.project.id}:${signal.relativePath}`;
    return groups.set(key, [...(groups.get(key) ?? []), signal]);
  }, new Map<string, readonly CandidateSignal[]>());

const toAnalyzedCandidate = (
  signals: readonly CandidateSignal[],
): AnalyzedCandidate => {
  const [first] = signals;
  const reasons = uniqueReasons(signals.map(signal => signal.reason));
  const candidate = createCandidateFile(first.project.id, first.relativePath, reasons);
  const scored = scoreCandidate({ reasons, manualPin: false });

  return { ...candidate, score: scored.score, reasons: scored.reasons };
};

const uniqueReasons = (
  reasons: readonly CandidateReason[],
): readonly CandidateReason[] => [...new Set(reasons)];

const sortCandidates = (
  candidates: readonly AnalyzedCandidate[],
): readonly AnalyzedCandidate[] =>
  [...candidates].sort((left, right) => right.score - left.score);

const rgSignal = (project: Project, relativePath: string): CandidateSignal =>
  gitSignal(project, relativePath, 'rgMatch');

const gitSignal = (
  project: Project,
  relativePath: string,
  reason: CandidateReason,
): CandidateSignal => ({ project, relativePath, reason });

const isWarning = (
  warning: AnalysisWarning | undefined,
): warning is AnalysisWarning => warning !== undefined;