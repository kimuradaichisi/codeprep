// apps/cli/markdownFormatter.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { CliContextResult, CliResult } from './types';
import type { ContextPackV2 } from '../../src/features/repository-context/domain/workingset';

import { formatContextPackV2Markdown } from '../../src/features/repository-context/infrastructure/formatting/ContextPackV2Formatter';

import type { ContextProjection } from '../../src/features/repository-context/domain/projection/ContextProjection';

export function formatAsMarkdown(data: CliResult): string {
  if ('entries' in data && 'request' in data) {
    return formatProjectionMarkdown(data as ContextProjection);
  }
  if ('schemaVersion' in data && data.schemaVersion === '2') {
    return formatContextPackV2Markdown(data as ContextPackV2);
  }
  return formatV1Markdown(data as CliContextResult);
}

function formatProjectionMarkdown(proj: ContextProjection): string {
  const parts: string[] = [
    `# CodePrep Context Projection`,
    `**Intent:** ${proj.request.intent}`,
    `**Goal:** ${proj.request.goal}`,
    `**Scope:** ${proj.request.requestedScope} (Inferred: ${proj.request.inferredScope})`,
    '',
    `## Projected Entries (${proj.metrics.totalFiles} files, ~${proj.metrics.totalTokens} tokens)`,
  ];
  for (const entry of proj.entries) {
    parts.push(`- **\`${entry.relativePath}\`** [${entry.role}] (${entry.reasons.join(', ')})`);
  }
  return parts.join('\n');
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

