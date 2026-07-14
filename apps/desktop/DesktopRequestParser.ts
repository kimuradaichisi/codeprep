import type { AnalyzeProjectsInput, BuildDesktopContextInput, DiscoverFilesInput } from '../../src/features/desktop-core/application/ports';
import { isPackMode, type PackMode } from '../../src/features/desktop-core/domain/PackMode';
import type { SourceExcerpt } from '../../src/features/desktop-core/domain/SourceExcerpt';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value;
};

const isContextLines = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 50;

export const toAnalyzeInput = (value: unknown): AnalyzeProjectsInput => {
  if (!isRecord(value) || !isStringArray(value.projectIds) || !isContextLines(value.contextLines)) {
    throw new Error('Invalid analysis request.');
  }
  return {
    query: requiredString(value.query, 'Query'),
    projectIds: value.projectIds,
    contextLines: value.contextLines
  };
};

const isRecipe = (value: unknown): value is DiscoverFilesInput['recipe'] =>
  isRecord(value) && typeof value.kind === 'string' && recipeFields(value);

const recipeFields = (value: Record<string, unknown>): boolean =>
  value.kind === 'gitDiff' || value.kind === 'clipboardPaths' ||
  (value.kind === 'text' && typeof value.query === 'string') ||
  (value.kind === 'gitCommit' && typeof value.ref === 'string') ||
  (value.kind === 'directory' && typeof value.path === 'string') ||
  (value.kind === 'extension' && isStringArray(value.extensions));

export const toDiscoverInput = (value: unknown): DiscoverFilesInput => {
  if (!isRecord(value) || !isStringArray(value.projectIds) || !isRecipe(value.recipe)) {
    throw new Error('Invalid discovery request.');
  }
  return { projectIds: value.projectIds, recipe: value.recipe };
};

const isExcerpt = (value: unknown): value is SourceExcerpt =>
  isRecord(value) &&
  typeof value.startLine === 'number' && Number.isInteger(value.startLine) && value.startLine > 0 &&
  typeof value.endLine === 'number' && Number.isInteger(value.endLine) && value.endLine >= value.startLine &&
  typeof value.content === 'string';

const isExcerpts = (value: unknown): value is readonly SourceExcerpt[] =>
  value === undefined || (Array.isArray(value) && value.every(isExcerpt));

const isCandidate = (value: unknown): value is BuildDesktopContextInput['candidates'][number] =>
  isRecord(value) &&
  typeof value.projectId === 'string' &&
  typeof value.relativePath === 'string' &&
  Array.isArray(value.reasons) &&
  typeof value.excluded === 'boolean' &&
  isExcerpts(value.excerpts);

const isCandidates = (value: unknown): value is BuildDesktopContextInput['candidates'] =>
  Array.isArray(value) && value.every(isCandidate);

const packMode = (value: unknown): PackMode => {
  if (value === undefined) return 'full';
  if (typeof value === 'string' && isPackMode(value)) return value;
  return invalidOutputRequest();
};


const sizeLimit = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : invalidOutputRequest();

const tokenLimit = (value: unknown): number => value === undefined ? Number.MAX_SAFE_INTEGER : sizeLimit(value);

const outputFormat = (value: unknown): BuildDesktopContextInput['format'] =>
  value === 'markdown' || value === 'xml' || value === 'json' ? value : invalidOutputRequest();

const invalidOutputRequest = (): never => { throw new Error('Invalid output request.'); };

export const toBuildInput = (value: unknown): BuildDesktopContextInput => {
  if (!isRecord(value) || !isCandidates(value.candidates)) throw new Error('Invalid output request.');
  return {
    candidates: value.candidates,
    format: outputFormat(value.format),
    maxFileSizeKB: sizeLimit(value.maxFileSizeKB),
    packMode: packMode(value.packMode),
    tokenLimit: tokenLimit(value.tokenLimit),
    includeDependencies: value.includeDependencies === true,
    autoOptimize: value.autoOptimize === true
  };
};
