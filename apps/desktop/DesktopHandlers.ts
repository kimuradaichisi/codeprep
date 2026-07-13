import { basename, resolve } from 'node:path';
import { listProjectFiles } from '../../src/features/desktop-node/ProjectFileTree';
import { randomUUID } from 'node:crypto';
import { clipboard, dialog, ipcMain } from 'electron';
import { AnalyzeProjectsUseCase } from '../../src/features/desktop-core/application/AnalyzeProjectsUseCase';
import { DiscoverFilesUseCase } from '../../src/features/desktop-core/application/DiscoverFilesUseCase';
import type { AnalyzeProjectsInput, BuildDesktopContextInput, DiscoverFilesInput } from '../../src/features/desktop-core/application/ports';
import { BuildDesktopContextUseCase } from '../../src/features/desktop-core/application/BuildDesktopContextUseCase';
import type { Project } from '../../src/features/desktop-core/domain/Project';
import { isPackMode } from '../../src/features/desktop-core/domain/PackMode';
import { GitMetadataClient } from '../../src/features/desktop-node/GitMetadataClient';
import { GitHistoryReader } from '../../src/features/desktop-node/GitHistoryReader';
import { ProjectRegistryStore } from '../../src/features/desktop-node/ProjectRegistryStore';
import { RipgrepClient } from '../../src/features/desktop-node/RipgrepClient';
import { DesktopContextFormatter } from '../../src/features/desktop-node/DesktopContextFormatter';
import { canReadProjectFile, readProjectFile } from '../../src/features/desktop-node/ProjectFileContentReader';

export const registerDesktopHandlers = (registryPath: string): void => {
  const registry = new ProjectRegistryStore(registryPath);
  ipcMain.handle('chooseProjectFolder', createChooseProjectFolderHandler(openFolderDialog));
  ipcMain.handle('listProjectFiles', (_event, value: unknown) => listFiles(registry, value));
  ipcMain.handle('listProjects', () => listProjects(registry));
  ipcMain.handle('addProject', (_event, value: unknown) => addProject(registry, value));
  ipcMain.handle('removeProject', (_event, value: unknown) => removeProject(registry, value));
  ipcMain.handle('analyzeProjects', (_event, value: unknown) => analyzeProjects(registry, value));
  ipcMain.handle('discoverFiles', (_event, value: unknown) => discoverFiles(registry, value));
  ipcMain.handle('generateOutput', (_event, value: unknown) => generateOutput(registry, value));
  ipcMain.handle('copyOutput', (_event, value: unknown) => copyOutput(value));
};

export type OpenFolderDialog = () => Promise<Readonly<{
  canceled: boolean;
  filePaths: readonly string[];
}>>;

export const createChooseProjectFolderHandler = (openDialog: OpenFolderDialog) =>
  async (): Promise<string | undefined> => {
    try {
      return selectedFolder(await openDialog());
    } catch {
      throw new Error('Unable to choose a project folder.');
    }
  };

const openFolderDialog = (): ReturnType<typeof dialog.showOpenDialog> =>
  dialog.showOpenDialog({ properties: ['openDirectory'] });

const selectedFolder = (result: Readonly<{ canceled: boolean; filePaths: readonly string[] }>): string | undefined =>
  result.canceled ? undefined : result.filePaths[0];

const listProjects = async (registry: ProjectRegistryStore): Promise<readonly Project[]> =>
  (await registry.readAll()).projects;

const listFiles = async (registry: ProjectRegistryStore, value: unknown): Promise<readonly string[]> => {
  const projectId = requiredString(value, 'Project id');
  const project = (await listProjects(registry)).find(item => item.id === projectId);
  if (!project) throw new Error('Project was not found.');
  return listProjectFiles(project.rootPath);
};

const addProject = async (registry: ProjectRegistryStore, value: unknown): Promise<readonly Project[]> => {
  const rootPath = requiredString(value, 'Project path');
  const current = await listProjects(registry);
  const project = createProject(rootPath);
  const projects = [...current, project];
  await registry.saveAll(projects);
  return projects;
};

const removeProject = async (registry: ProjectRegistryStore, value: unknown): Promise<readonly Project[]> => {
  const projectId = requiredString(value, 'Project id');
  const projects = (await listProjects(registry)).filter(project => project.id !== projectId);
  await registry.saveAll(projects);
  return projects;
};

const analyzeProjects = async (registry: ProjectRegistryStore, value: unknown) => {
  const useCase = new AnalyzeProjectsUseCase({
    projects: registry, ripgrep: new RipgrepClient(), gitMetadata: new GitMetadataClient(),
    fileContent: { canRead: canReadProjectFile, read: readProjectFile },
  });
  return useCase.analyze(toAnalyzeInput(value));
};

const discoverFiles = async (registry: ProjectRegistryStore, value: unknown) => {
  const useCase = new DiscoverFilesUseCase({
    projects: registry, ripgrep: new RipgrepClient(), gitMetadata: new GitMetadataClient(),
    files: { list: project => listProjectFiles(project.rootPath) },
    clipboard: { readText: () => Promise.resolve(clipboard.readText()) }, gitHistory: new GitHistoryReader(),
  });
  return useCase.discover(toDiscoverInput(value));
};

const generateOutput = async (registry: ProjectRegistryStore, value: unknown) => {
  const useCase = new BuildDesktopContextUseCase({
    projects: registry, fileContent: { canRead: canReadProjectFile, read: readProjectFile }, formatter: new DesktopContextFormatter(),
  });
  const result = await useCase.build(toBuildInput(value));
  return { preview: result.preview, warning: result.warnings.map(warning => warning.message).join('\n') || undefined, manifest: result.manifest };
};

const copyOutput = (value: unknown): void => clipboard.writeText(requiredString(value, 'Output'));

const createProject = (rootPath: string): Project => {
  const resolvedPath = resolve(rootPath);
  return { id: randomUUID(), name: basename(resolvedPath), rootPath: resolvedPath };
};

const toAnalyzeInput = (value: unknown): AnalyzeProjectsInput => {
  if (!isRecord(value) || !isStringArray(value.projectIds)) throw new Error('Invalid analysis request.');
  return { query: requiredString(value.query, 'Query'), projectIds: value.projectIds };
};

const toDiscoverInput = (value: unknown): DiscoverFilesInput => {
  if (!isRecord(value) || !isStringArray(value.projectIds) || !isRecipe(value.recipe)) throw new Error('Invalid discovery request.');
  return { projectIds: value.projectIds, recipe: value.recipe };
};

const isRecipe = (value: unknown): value is DiscoverFilesInput['recipe'] =>
  isRecord(value) && typeof value.kind === 'string' && recipeFields(value);

const recipeFields = (value: Record<string, unknown>): boolean =>
  value.kind === 'gitDiff' || value.kind === 'clipboardPaths' ||
  (value.kind === 'text' && typeof value.query === 'string') ||
  (value.kind === 'gitCommit' && typeof value.ref === 'string') ||
  (value.kind === 'directory' && typeof value.path === 'string') ||
  (value.kind === 'extension' && isStringArray(value.extensions));

const toBuildInput = (value: unknown): BuildDesktopContextInput => {
  if (!isRecord(value) || !isCandidates(value.candidates)) throw new Error('Invalid output request.');
  return { candidates: value.candidates, format: outputFormat(value.format), maxFileSizeKB: sizeLimit(value.maxFileSizeKB), packMode: packMode(value.packMode), tokenLimit: tokenLimit(value.tokenLimit) };
};

const packMode = (value: unknown) => value === undefined ? 'full' as const : isPackMode(String(value)) ? value : invalidOutputRequest();

const tokenLimit = (value: unknown): number => value === undefined ? Number.MAX_SAFE_INTEGER : sizeLimit(value);

const isCandidates = (value: unknown): value is BuildDesktopContextInput['candidates'] =>
  Array.isArray(value) && value.every(isCandidate);

const isCandidate = (value: unknown): value is BuildDesktopContextInput['candidates'][number] =>
  isRecord(value) && typeof value.projectId === 'string' && typeof value.relativePath === 'string' &&
  Array.isArray(value.reasons) && typeof value.excluded === 'boolean';

const outputFormat = (value: unknown): BuildDesktopContextInput['format'] =>
  value === 'markdown' || value === 'xml' || value === 'json' ? value : invalidOutputRequest();

const sizeLimit = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : invalidOutputRequest();

const invalidOutputRequest = (): never => { throw new Error('Invalid output request.'); };

const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value;
};

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
