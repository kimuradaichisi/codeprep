// src/features/repository-context/infrastructure/formatting/ContextPackV2Formatter.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type {
  ContextPackV2,
  ContextPackV2Entry,
  WorkingSetEntry,
} from '../../domain/workingset';

export function formatContextPackV2Markdown(data: ContextPackV2): string {
  const header = buildMarkdownHeader(data);
  const coreSection = formatTierSection('Core', data.workingSet.core);
  const supportingSection = formatTierSection('Supporting', data.workingSet.supporting);
  const reserveSection = formatTierSection('Recall Reserve', data.workingSet.recallReserve);
  const excludedSection = formatExcludedSection(data);

  return [
    ...header,
    '',
    '## Working Set',
    ...coreSection,
    ...supportingSection,
    ...reserveSection,
    ...excludedSection,
  ].join('\n');
}

export function formatContextPackV2Content(data: ContextPackV2): string {
  const blocks: string[] = [];
  for (const entry of data.context) {
    blocks.push(formatEntryContent(entry));
  }
  return blocks.join('\n\n');
}

function buildMarkdownHeader(data: ContextPackV2): string[] {
  const bd = data.metrics.budgetDecision;
  const budgetInfo = bd
    ? `**Budget Decision:** \`${bd.source}\` (Scope: \`${bd.scope}\`, MaxFiles: ${bd.budget.maxFiles}, MaxTokens: ${bd.budget.maxEstimatedTokens})`
    : '';
  const comp = (data.metrics.compressionRatio * 100).toFixed(1);
  const summary = `**Compression Ratio:** ${comp}% (Nodes: ${data.metrics.subgraphNodes} -> Files: ${data.metrics.contextFiles}, Est. Tokens: ${data.metrics.estimatedTokens})`;

  return [
    `# CodePrep Context Pack v2`,
    `**Task:** ${data.task}`,
    `**Strategy:** \`${data.strategy}\``,
    budgetInfo,
    summary,
  ].filter(Boolean);
}

function formatTierSection(tierName: string, entries: readonly WorkingSetEntry[]): string[] {
  const lines: string[] = [`### ${tierName} (${entries.length})`];
  for (const entry of entries) {
    const reasons = entry.inclusionReasons.join(', ');
    lines.push(`- **\`${entry.relativePath}\`** [${entry.role}] (score: ${entry.score.toFixed(2)}, reasons: ${reasons})`);
  }
  return lines;
}

function formatExcludedSection(data: ContextPackV2): string[] {
  if (data.excluded.length === 0) return [];
  const lines: string[] = ['', `## Excluded (${data.excluded.length})`];
  for (const ex of data.excluded.slice(0, 10)) {
    const detail = ex.detail ? `, ${ex.detail}` : '';
    lines.push(`- \`${ex.path}\` [${ex.reason}] (score: ${ex.score.toFixed(2)}${detail})`);
  }
  return lines;
}

function formatEntryContent(entry: ContextPackV2Entry): string {
  const rangeInfo = formatRangeInfo(entry);
  const header = `// === ${entry.path} [${entry.tier.toUpperCase()} | ${entry.role.toUpperCase()} | ${entry.granularity}] ${rangeInfo} ===`;
  const body = entry.content ?? '// (No content extracted)';
  return `${header}\n${body}`;
}

function formatRangeInfo(entry: ContextPackV2Entry): string {
  if (entry.selectedRanges.length === 0) return '';
  const ranges = entry.selectedRanges.map((r) => `L${r.startLine}-L${r.endLine}`).join(', ');
  return `(${ranges})`;
}
