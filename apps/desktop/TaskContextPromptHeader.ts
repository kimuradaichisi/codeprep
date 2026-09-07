// apps/desktop/TaskContextPromptHeader.ts
import type { ContextEntry } from '../../src/features/repository-context/domain/ContextEntry';
import type { AdaptivePackMode } from '../../src/features/repository-context/domain/ContextConfidence';

export const buildTaskContextPromptHeader = (
  task: string,
  strategy: AdaptivePackMode,
  entries: readonly ContextEntry[]
): string => {
  const trimmedTask = task.trim();
  if (!trimmedTask) return '';

  const entryPoints = entries.filter((e) => e.role === 'target');
  const related = entries.filter((e) => e.role !== 'target');

  const epLines = formatEntryPoints(entryPoints);
  const relLines = formatRelated(related);

  return [
    `# Task Context: ${trimmedTask}`,
    '',
    '## Instructions for LLM',
    'You are an expert software engineer working on the following task:',
    `- **Goal**: ${trimmedTask}`,
    `- **Strategy**: ${strategy.toUpperCase()}`,
    'Please inspect the primary entry points and dependencies below, and implement the necessary changes defensively.',
    '',
    '## Context Summary',
    `- **Primary Entry Points (${entryPoints.length})**:`,
    epLines,
    `- **Related Dependencies & Tests (${related.length})**:`,
    relLines,
    '',
    '---',
    '',
    '## File Contents',
    '',
  ].join('\n');
};

const formatEntryPoints = (entries: readonly ContextEntry[]): string => {
  if (entries.length === 0) return '  (None selected)';
  return entries.map((e) => `  - \`${e.relativePath}\` (Score: ${e.score})`).join('\n');
};

const formatRelated = (entries: readonly ContextEntry[]): string => {
  if (entries.length === 0) return '  (None)';
  return entries.map((e) => `  - \`${e.relativePath}\` (${e.role})`).join('\n');
};
