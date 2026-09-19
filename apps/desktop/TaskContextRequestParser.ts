// apps/desktop/TaskContextRequestParser.ts
import type { BuildTaskContextRequest, DesktopPackStrategy } from './DesktopApi';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
};

const parseEntryPoints = (value: unknown, isKnowledge: boolean): readonly string[] | undefined => {
  if (value === undefined || value === null) {
    if (isKnowledge) return undefined;
    throw new Error('At least one entry point is required.');
  }
  if (!Array.isArray(value)) {
    throw new Error('At least one entry point is required.');
  }
  if (value.length === 0 && !isKnowledge) {
    throw new Error('At least one entry point is required.');
  }
  const items = value.map((item) => requiredString(item, 'Entry point'));
  return Object.freeze(items);
};

const parseTokenLimit = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error('Invalid token limit.');
  }
  return value;
};

const parseStrategy = (value: unknown): DesktopPackStrategy | undefined => {
  if (value === undefined) return undefined;
  if (value === 'auto' || value === 'fast' || value === 'standard' || value === 'expanded' || value === 'knowledge') {
    return value;
  }
  throw new Error('Invalid strategy.');
};

const parseBudget = (value: unknown): BuildTaskContextRequest['budget'] => {
  if (!isRecord(value)) return undefined;
  const maxFiles = typeof value.maxFiles === 'number' && value.maxFiles > 0 ? value.maxFiles : undefined;
  const maxTokens = typeof value.maxTokens === 'number' && value.maxTokens > 0 ? value.maxTokens : undefined;
  if (maxFiles === undefined && maxTokens === undefined) return undefined;
  return Object.freeze({ maxFiles, maxTokens });
};

const parseExplicitPaths = (value: unknown): readonly string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const valid = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return Object.freeze(valid);
};

export const toBuildTaskContextRequest = (value: unknown): BuildTaskContextRequest => {
  if (!isRecord(value)) throw new Error('Invalid task context request.');
  const projectId = requiredString(value.projectId, 'Project ID');
  const task = requiredString(value.task, 'Task');
  const strategy = parseStrategy(value.strategy);
  const entryPoints = parseEntryPoints(value.entryPoints, strategy === 'knowledge');
  const tokenLimit = parseTokenLimit(value.tokenLimit);
  const budget = parseBudget(value.budget);
  const explicitPaths = parseExplicitPaths(value.explicitPaths);

  return Object.freeze({ projectId, task, entryPoints, tokenLimit, strategy, budget, explicitPaths });
};

export const toDiscoverEntryPointCandidatesRequest = (
  value: unknown
): import('./DesktopApi').DiscoverEntryPointCandidatesRequest => {
  if (!isRecord(value)) throw new Error('Invalid discover entry points request.');
  const projectId = requiredString(value.projectId, 'Project ID');
  const task = requiredString(value.task, 'Task');
  const max = typeof value.maxCandidates === 'number' && value.maxCandidates > 0 ? value.maxCandidates : undefined;
  const pins = Array.isArray(value.manualPinnedPaths)
    ? Object.freeze(value.manualPinnedPaths.filter((p): p is string => typeof p === 'string' && !!p.trim()))
    : undefined;
  return Object.freeze({ projectId, task, maxCandidates: max, manualPinnedPaths: pins });
};
