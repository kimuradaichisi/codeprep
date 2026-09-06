import type { ProjectId } from './Project';

export type TaskContext = Readonly<{
  projectId: ProjectId;
  task: string;
  entryPoints: readonly string[];
}>;

export const createTaskContext = (
  projectId: ProjectId,
  task: string,
  entryPoints: readonly string[]
): TaskContext => {
  const trimmedTask = task.trim();
  if (!trimmedTask) {
    throw new Error('Task must not be empty');
  }
  const cleanEntryPoints = entryPoints.map(ep => ep.trim()).filter(Boolean);
  if (cleanEntryPoints.length === 0) {
    throw new Error('At least one entry point is required');
  }
  return Object.freeze({
    projectId,
    task: trimmedTask,
    entryPoints: Object.freeze(cleanEntryPoints),
  });
};
