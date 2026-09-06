export const rgJsonWithDuplicateMatches = [
  '{"type":"begin","data":{"path":{"text":"src/app.ts"}}}',
  '{"type":"match","data":{"path":{"text":"src/app.ts"}}}',
  '{"type":"match","data":{"path":{"text":"src/app.ts"}}}',
  '{"type":"match","data":{"path":{"text":"README.md"}}}',
].join('\n');

export const rgJsonWithDiagnosticLine = [
  'rg: ./node_modules/cache: Permission denied',
  '{"type":"match","data":{"path":{"text":"src/app.ts"}}}',
  'not-json',
  '{"type":"match","data":{"path":{"text":"README.md"}}}',
].join('\n');

export const gitStatusOutput = [
  ' M src/app.ts',
  'R  old.ts -> src/new.ts',
  '?? README.md',
].join('\n');

export const gitLogOutput = ['src/app.ts', '', 'README.md', 'src/app.ts'].join('\n');

export const gitStatusSingleOutput = ' M src/app.ts\n';

export const gitLogSingleOutput = 'README.md\n';

export const gitFailureOutput = 'fatal';

export const gitEmptyOutput = '';

