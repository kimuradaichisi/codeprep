/*
 * Copyright 2026 CodePrep Contributors
 */
import type { CliContextResult } from './types';

export function formatAsMarkdown(data: CliContextResult): string {
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
