import type { AnalyzedCandidate, BuildDesktopContextInput } from '../../../src/features/desktop-core/application/ports';
import type { Project } from '../../../src/features/desktop-core/domain/Project';
import type { DesktopApi, DesktopOutput } from '../DesktopApi';

export const loadProjects = (api: DesktopApi): Promise<readonly Project[]> =>
  api.listProjects();

export const addProject = (
  api: DesktopApi,
  rootPath: string,
): Promise<readonly Project[]> => api.addProject(rootPath);

export const removeProject = (
  api: DesktopApi,
  projectId: string,
): Promise<readonly Project[]> => api.removeProject(projectId);

export const analyzeProjects = async (
  api: DesktopApi,
  query: string,
  contextLines: number,
  projects: readonly Project[],
): Promise<readonly AnalyzedCandidate[]> => {
  const input = { query, projectIds: projects.map(project => project.id), contextLines };
  return (await api.analyzeProjects(input)).candidates;
};


export const generateOutput = (api: DesktopApi, input: BuildDesktopContextInput): Promise<DesktopOutput> =>
  api.generateOutput(input);

export const copyOutput = (api: DesktopApi, output: string): Promise<void> =>
  api.copyOutput(output);

export const runDesktopAction = async <Value>(
  action: () => Promise<Value>,
  setValue: (value: Value) => void,
  setError: (value: string) => void,
): Promise<void> => {
  try { setValue(await action()); } catch (error) { setError(desktopErrorMessage(error)); }
};

export const desktopErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Desktop action failed.';
