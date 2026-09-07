// apps/desktop/TaskContextRequestParser.ts
import type { BuildTaskContextRequest } from './DesktopApi';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
};

const parseEntryPoints = (value: unknown): readonly string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('At least one entry point is required.');
  }
  const items = value.map(item => requiredString(item, 'Entry point'));
  return Object.freeze(items);
};

const parseTokenLimit = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error('Invalid token limit.');
  }
  return value;
};

const parseStrategy = (value: unknown): import('./DesktopApi').BuildTaskContextRequest['strategy'] => {
  if (value === undefined) return undefined;
  if (value === 'auto' || value === 'fast' || value === 'standard' || value === 'expanded') return value;
  throw new Error('Invalid strategy.');
};

export const toBuildTaskContextRequest = (value: unknown): BuildTaskContextRequest => {
  if (!isRecord(value)) throw new Error('Invalid task context request.');
  const projectId = requiredString(value.projectId, 'Project ID');
  const task = requiredString(value.task, 'Task');
  const entryPoints = parseEntryPoints(value.entryPoints);
  const tokenLimit = parseTokenLimit(value.tokenLimit);
  const strategy = parseStrategy(value.strategy);
  return Object.freeze({ projectId, task, entryPoints, tokenLimit, strategy });
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
