import { basename, resolve, dirname } from 'node:path';
import { listProjectFiles } from '../../src/features/desktop-node/ProjectFileTree';
import { randomUUID } from 'node:crypto';
import { clipboard, dialog, ipcMain } from 'electron';
import { AnalyzeProjectsUseCase } from '../../src/features/desktop-core/application/AnalyzeProjectsUseCase';
import { DiscoverFilesUseCase } from '../../src/features/desktop-core/application/DiscoverFilesUseCase';
import { BuildDesktopContextUseCase } from '../../src/features/desktop-core/application/BuildDesktopContextUseCase';
import type { Project } from '../../src/features/desktop-core/domain/Project';
import { GitMetadataClient } from '../../src/features/desktop-node/GitMetadataClient';
import { GitHistoryReader } from '../../src/features/desktop-node/GitHistoryReader';
import { ProjectRegistryStore } from '../../src/features/desktop-node/ProjectRegistryStore';
import { RipgrepClient } from '../../src/features/desktop-node/RipgrepClient';
import { DesktopContextFormatter } from '../../src/features/desktop-node/DesktopContextFormatter';
import { canReadProjectFile, readProjectFile, getProjectFileSize } from '../../src/features/desktop-node/ProjectFileContentReader';
import { DependencyScanner } from '../../src/features/engine/application/DependencyScanner';
import { DocGraphClient } from '../../src/features/desktop-node/DocGraphClient';
import { MarkdownRecommendationClient } from '../../src/features/desktop-node/MarkdownRecommendationClient';
import { GitCoChangeClient } from '../../src/features/desktop-node/GitCoChangeClient';
import { DirectoryProximityClient } from '../../src/features/desktop-node/DirectoryProximityClient';

export const registerDesktopHandlers = (registryPath: string): void => {
  const registry = new ProjectRegistryStore(registryPath);
  ipcMain.handle('chooseProjectFolder', createChooseProjectFolderHandler(openFolderDialog));
  ipcMain.handle('listProjectFiles', (_event, projectId: unknown, options: unknown) => listFiles(registry, projectId, options));
  ipcMain.handle('listProjects', () => listProjects(registry));
  ipcMain.handle('addProject', (_event, value: unknown) => addProject(registry, value));
  ipcMain.handle('removeProject', (_event, value: unknown) => removeProject(registry, value));
  ipcMain.handle('analyzeProjects', (_event, value: unknown) => analyzeProjects(registry, value));
  ipcMain.handle('discoverFiles', (_event, value: unknown) => discoverFiles(registry, value));
  ipcMain.handle('generateOutput', (_event, value: unknown) => generateOutput(registry, value));
  ipcMain.handle('copyOutput', (_event, value: unknown) => copyOutput(value));
  ipcMain.handle('readFileContent', (_event, projectId: unknown, relativePath: unknown) => readFileContent(registry, projectId, relativePath));
};

let lastChosenPath: string | undefined = undefined;

export type OpenFolderDialog = (defaultPath?: string) => Promise<Readonly<{
  canceled: boolean;
  filePaths: readonly string[];
}>>;

export const createChooseProjectFolderHandler = (openDialog: OpenFolderDialog) =>
  async (): Promise<string | undefined> => {
    try {
      const res = await openDialog(lastChosenPath);
      const chosen = res.canceled ? undefined : res.filePaths[0];
      if (chosen) lastChosenPath = chosen;
      return chosen;
    } catch {
      throw new Error('Unable to choose a project folder.');
    }
  };

const openFolderDialog = (defaultPath?: string): ReturnType<typeof dialog.showOpenDialog> =>
  dialog.showOpenDialog({
    properties: ['openDirectory'],
    defaultPath: defaultPath ? dirname(defaultPath) : undefined
  });

const listProjects = async (registry: ProjectRegistryStore): Promise<readonly Project[]> =>
  (await registry.readAll()).projects;

const listFiles = async (
  registry: ProjectRegistryStore,
  projectIdVal: unknown,
  optionsVal: unknown
): Promise<readonly Readonly<{ relativePath: string; size: number }>[]> => {
  const projectId = requiredString(projectIdVal, 'Project id');
  const useGitignore = optionsVal && typeof optionsVal === 'object' && typeof (optionsVal as any).useGitignore === 'boolean'
    ? (optionsVal as any).useGitignore
    : undefined;
  const project = (await listProjects(registry)).find(item => item.id === projectId);
  if (!project) throw new Error('Project was not found.');
  const relativePaths = await listProjectFiles(project.rootPath, useGitignore);
  return Promise.all(relativePaths.map(async relativePath => {
    const size = await getProjectFileSize(project, relativePath);
    return { relativePath, size };
  }));
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
    fileSize: { getSize: getProjectFileSize },
  });
  return useCase.analyze(toAnalyzeInput(value));
};

const discoverFiles = async (registry: ProjectRegistryStore, value: unknown) => {
  const filePort = {
    list: async (project: Project) => {
      const relativePaths = await listProjectFiles(project.rootPath);
      return Promise.all(relativePaths.map(async relativePath => ({
        relativePath, size: await getProjectFileSize(project, relativePath),
      })));
    },
  };
  const useCase = new DiscoverFilesUseCase({
    projects: registry, ripgrep: new RipgrepClient(), gitMetadata: new GitMetadataClient(),
    files: filePort,
    clipboard: { readText: () => Promise.resolve(clipboard.readText()) }, gitHistory: new GitHistoryReader(),
    fileSize: { getSize: getProjectFileSize },
    fileContent: { read: readProjectFile, canRead: canReadProjectFile },
    dependencyScanner: new DependencyScanner(),
    docGraph: new DocGraphClient(),
    recommendations: {
      markdownLink: new MarkdownRecommendationClient({ read: readProjectFile, canRead: canReadProjectFile }, filePort, 'markdownLink'),
      nameHeading: new MarkdownRecommendationClient({ read: readProjectFile, canRead: canReadProjectFile }, filePort, 'nameHeading'),
      gitCoChange: new GitCoChangeClient(),
      directoryProximity: new DirectoryProximityClient(filePort),
    },
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

const readFileContent = async (registry: ProjectRegistryStore, projectId: unknown, relativePath: unknown): Promise<string> => {
  const pId = requiredString(projectId, 'Project id');
  const relPath = requiredString(relativePath, 'Relative path');
  const project = (await listProjects(registry)).find(item => item.id === pId);
  if (!project) throw new Error('Project was not found.');
  const content = await readProjectFile(project, relPath);
  if (content === undefined) throw new Error('Unable to read file.');
  return content;
};

const copyOutput = (value: unknown): void => clipboard.writeText(requiredString(value, 'Output'));

const createProject = (rootPath: string): Project => {
  const resolvedPath = resolve(rootPath);
  return { id: randomUUID(), name: basename(resolvedPath), rootPath: resolvedPath };
};

import { toAnalyzeInput, toDiscoverInput, toBuildInput } from './DesktopRequestParser';

const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value;
};

