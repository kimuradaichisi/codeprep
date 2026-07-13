import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import type { ProjectRegistryPort } from '../desktop-core/application/ports';
import type { Project } from '../desktop-core/domain/Project';

export type RegistryWarning = Readonly<{
  kind: 'malformedRegistry';
  message: string;
}>;

export type RegistryReadResult = Readonly<{
  projects: readonly Project[];
  warning?: RegistryWarning;
}>;

export class ProjectRegistryStore implements ProjectRegistryPort {
  public constructor(private readonly path: string) {}

  public async getByIds(projectIds: readonly string[]): Promise<readonly Project[]> {
    const result = await this.readAll();
    const ids = new Set(projectIds);
    return result.projects.filter(project => ids.has(project.id));
  }

  public async readAll(): Promise<RegistryReadResult> {
    const text = await this.readText();
    if (text === undefined) return { projects: [] };
    return parseRegistryText(text);
  }

  public async saveAll(projects: readonly Project[]): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(projects, null, 2), 'utf8');
  }

  private async readText(): Promise<string | undefined> {
    try {
      return await readFile(this.path, 'utf8');
    } catch (error) {
      if (isMissingFile(error)) return undefined;
      throw error;
    }
  }
}

const parseRegistryText = (text: string): RegistryReadResult => {
  try {
    return { projects: toProjects(JSON.parse(text)) };
  } catch {
    return { projects: [], warning: malformedWarning() };
  }
};

const toProjects = (value: unknown): readonly Project[] => {
  if (!Array.isArray(value)) throw new Error('Registry must be an array.');
  return value.map(toProject);
};

const toProject = (value: unknown): Project => {
  if (!isProject(value)) throw new Error('Registry project is invalid.');
  const excludePatterns = readExcludePatterns(value);
  return { id: value.id, name: value.name, rootPath: value.rootPath, ...excludePatterns };
};

const readExcludePatterns = (value: Project): Partial<Project> => {
  if (value.excludePatterns === undefined) return {};
  if (!isStringArray(value.excludePatterns)) throw new Error('Project excludes are invalid.');
  return { excludePatterns: value.excludePatterns };
};

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const isProject = (value: unknown): value is Project =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.rootPath === 'string';

const isMissingFile = (error: unknown): boolean =>
  isRecord(error) && error.code === 'ENOENT';

const malformedWarning = (): RegistryWarning => ({
  kind: 'malformedRegistry',
  message: 'Project registry could not be parsed.',
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

