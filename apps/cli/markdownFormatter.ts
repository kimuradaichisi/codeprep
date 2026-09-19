// apps/cli/markdownFormatter.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { CliContextResult, CliResult } from './types';
import type { ContextPackV2 } from '../../src/features/repository-context/domain/workingset';

export function formatAsMarkdown(data: CliResult): string {
  if (data.schemaVersion === '2') {
    return formatContextPackV2Markdown(data);
  }
  return formatV1Markdown(data);
}

function formatV1Markdown(data: CliContextResult): string {
  const parts: string[] = [
    `# CodePrep Repository Context`,
    `**Task:** ${data.task}`,
    `**Workspace:** \`${data.workspace}\``,
    `**Confidence:** ${data.result.confidence.level} (Decision: \`${data.result.decision}\`, Strategy: \`${data.result.strategy}\`)`,
    '',
    `## Recommended Candidate Entry Points`,
  ];

  if (data.result.candidates.length === 0) {
    parts.push(`No candidate entry points discovered.`);
  } else {
    for (const c of data.result.candidates) {
      parts.push(`- **\`${c.relativePath}\`** (score: ${c.score.toFixed(2)}, reasons: ${c.reasons.join(', ')})`);
    }
  }

  if (data.result.contextPack?.content) {
    parts.push('', '## Context Pack Content', '', data.result.contextPack.content);
  }

  return parts.join('\n');
}

function formatContextPackV2Markdown(data: ContextPackV2): string {
  const bd = data.metrics.budgetDecision;
  const budgetInfo = bd
    ? `**Budget Decision:** \`${bd.source}\` (Scope: \`${bd.scope}\`, MaxFiles: ${bd.budget.maxFiles}, MaxTokens: ${bd.budget.maxEstimatedTokens})`
    : '';
  const parts: string[] = [
    `# CodePrep Context Pack v2`,
    `**Task:** ${data.task}`,
    `**Strategy:** \`${data.strategy}\``,
    budgetInfo,
    `**Compression Ratio:** ${(data.metrics.compressionRatio * 100).toFixed(1)}% (Nodes: ${data.metrics.subgraphNodes} -> Files: ${data.metrics.contextFiles}, Est. Tokens: ${data.metrics.estimatedTokens})`,
    '',
    `## Working Set`,
    `### Core (${data.workingSet.core.length})`,
    ...data.workingSet.core.map((c) => `- **\`${c.relativePath}\`** [${c.role}] (score: ${c.score.toFixed(2)}, reasons: ${c.inclusionReasons.join(', ')})`),
    `### Supporting (${data.workingSet.supporting.length})`,
    ...data.workingSet.supporting.map((c) => `- **\`${c.relativePath}\`** [${c.role}] (score: ${c.score.toFixed(2)}, reasons: ${c.inclusionReasons.join(', ')})`),
    `### Recall Reserve (${data.workingSet.recallReserve.length})`,
    ...data.workingSet.recallReserve.map((c) => `- **\`${c.relativePath}\`** [${c.role}] (score: ${c.score.toFixed(2)}, reasons: ${c.inclusionReasons.join(', ')})`),
  ];

  if (data.excluded.length > 0) {
    parts.push('', `## Excluded (${data.excluded.length})`);
    for (const ex of data.excluded.slice(0, 10)) {
      parts.push(`- \`${ex.path}\` [${ex.reason}] (score: ${ex.score.toFixed(2)}${ex.detail ? `, ${ex.detail}` : ''})`);
    }
  }

  return parts.join('\n');
}
