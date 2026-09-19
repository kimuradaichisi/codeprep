// apps/cli/markdownFormatter.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { CliContextResult, CliResult } from './types';
import type { ContextPackV2 } from '../../src/features/repository-context/domain/workingset';

import { formatContextPackV2Markdown } from '../../src/features/repository-context/infrastructure/formatting/ContextPackV2Formatter';

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

