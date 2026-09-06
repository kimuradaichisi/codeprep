// src/features/repository-context/infrastructure/formatting/ContextManifestFormatter.ts
import type { ContextManifest } from '../../domain/ContextManifest';
import type { ContextEntry } from '../../domain/ContextEntry';
import type { CandidateEvidence } from '../../domain/CandidateEvidence';

export const formatContextManifest = (manifest: ContextManifest): string => {
  const sections = [
    '# Context Manifest',
    formatTask(manifest.task),
    formatEntryPoints(manifest.entryPoints),
    formatContextTable(manifest.entries),
    formatBudget(manifest.budget),
  ];
  if (manifest.evidences && manifest.evidences.length > 0) {
    sections.push(formatEvidences(manifest.evidences));
  }
  return sections.join('\n\n') + '\n';
};

const formatTask = (task: string): string => `## Task\n\n${task}`;

const formatEntryPoints = (entryPoints: readonly string[]): string => {
  const list = entryPoints.map((ep) => `- ${ep}`).join('\n');
  return `## Entry Points\n\n${list}`;
};

const formatContextTable = (entries: readonly ContextEntry[]): string => {
  const header = '| Role | File | Score | Pack Mode | Reasons |\n|---|---|---:|---|---|';
  const rows = entries.map(formatTableRow).join('\n');
  return `## Context\n\n${header}\n${rows}`;
};

const formatTableRow = (entry: ContextEntry): string => {
  const reasons = formatReasons(entry);
  return `| ${entry.role} | ${entry.relativePath} | ${entry.score} | ${entry.packMode} | ${reasons} |`;
};

const formatReasons = (entry: ContextEntry): string => {
  if (entry.role === 'target') return 'target';
  const cand = entry.candidateReasons ?? [];
  const rec = (entry.recommendationReasons ?? []).map((r) => r.source);
  const combined = Array.from(new Set([...cand, ...rec]));
  return combined.length > 0 ? combined.join(', ') : '-';
};

const formatBudget = (budget: ContextManifest['budget']): string => {
  const within = budget.withinLimit ? 'yes' : 'no';
  return `## Budget\n\n- Bytes: ${budget.bytes}\n- Estimated tokens: ${budget.estimatedTokens}\n- Limit: ${budget.limit}\n- Within limit: ${within}`;
};

const formatEvidences = (evidences: readonly CandidateEvidence[]): string => {
  const byCandidate = groupEvidencesByCandidate(evidences);
  const blocks: string[] = ['## Candidate Evidence'];
  for (const [candidate, items] of byCandidate.entries()) {
    blocks.push(`### ${candidate}\n\nStructural support:\n${items.join('\n')}`);
  }
  return blocks.join('\n\n');
};

const groupEvidencesByCandidate = (
  evidences: readonly CandidateEvidence[]
): Map<string, string[]> => {
  const byCandidate = new Map<string, string[]>();
  for (const ev of evidences) {
    const list = byCandidate.get(ev.candidatePath) ?? [];
    const target = ev.relatedPath ?? ev.relatedSymbol ?? '';
    const line = ev.startLine ? `:L${ev.startLine}` : '';
    const item = `- ${ev.kind}: ${target}${line}`;
    list.push(item);
    byCandidate.set(ev.candidatePath, list);
  }
  return byCandidate;
};
