export type SearchRecipeKind =
  | 'text'
  | 'gitDiff'
  | 'gitCommit'
  | 'clipboardPaths'
  | 'extension'
  | 'directory'
  | 'docGraph';

export type SearchRecipe =
  | Readonly<{ kind: 'text'; query: string }>
  | Readonly<{ kind: 'gitDiff' }>
  | Readonly<{ kind: 'clipboardPaths' }>
  | Readonly<{ kind: 'gitCommit'; ref: string }>
  | Readonly<{ kind: 'extension'; extensions: readonly string[] }>
  | Readonly<{ kind: 'directory'; path: string }>
  | Readonly<{ kind: 'docGraph'; path: string }>;

export const createSearchRecipe = (kind: SearchRecipeKind, input: string): SearchRecipe => {
  if (kind === 'gitDiff' || kind === 'clipboardPaths') return { kind };
  if (kind === 'extension') return { kind, extensions: extensions(input) };
  if (kind === 'text') return { kind, query: requiredInput(input, 'Query') };
  if (kind === 'gitCommit') return { kind, ref: requiredInput(input, 'Commit ref') };
  if (kind === 'docGraph') return { kind, path: requiredInput(input, 'File path') };
  return { kind, path: requiredInput(input, 'Directory') };
};

const extensions = (input: string): readonly string[] => {
  const values = input.split(',').map(value => normalizeExtension(value)).filter(Boolean);
  if (values.length === 0) throw new Error('Extension is required.');
  return [...new Set(values)];
};

const normalizeExtension = (value: string): string => {
  const trimmed = value.trim();
  return trimmed === '' ? '' : trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
};

const requiredInput = (input: string, label: string): string => {
  const value = input.trim();
  if (value === '') throw new Error(`${label} is required.`);
  return value;
};
