// src/features/repository-context/application/DesktopSearchPromptHeader.ts
export const buildSearchPromptHeader = (
  query?: string,
  presetKind?: string,
  fileCount: number = 0
): string => {
  if (!query && !presetKind) return '';

  const queryLine = query ? `- **Search Query / Focus**: \`${query}\`` : '';
  const presetLine = presetKind ? `- **Scenario Preset**: ${presetKind}` : '';
  const metaLines = [queryLine, presetLine, `- **Included Files**: ${fileCount} files`].filter(Boolean).join('\n');

  return [
    '# CodePrep Repository Context',
    '',
    '## Context Metadata',
    metaLines,
    '',
    '## Instructions for LLM',
    query
      ? `This context was extracted focusing on \`${query}\`. Please review the files below and assist with the user's implementation or analysis.`
      : "Please review the included repository files below and assist with the user's task.",
    '',
    '---',
    '',
    '## File Contents',
    '',
  ].join('\n');
};
