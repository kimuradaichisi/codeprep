import type { ProjectId } from './Project';
import type { ContextBudget } from './ContextBudget';
import type { ContextEntry } from './ContextEntry';

export type ContextManifest = Readonly<{
  projectId: ProjectId;
  task: string;
  entryPoints: readonly string[];
  entries: readonly ContextEntry[];
  budget: ContextBudget;
}>;

export const createContextManifest = (
  projectId: ProjectId,
  task: string,
  entryPoints: readonly string[],
  entries: readonly ContextEntry[],
  budget: ContextBudget
): ContextManifest => Object.freeze({
  projectId,
  task,
  entryPoints: Object.freeze([...entryPoints]),
  entries: Object.freeze([...entries]),
  budget,
});
