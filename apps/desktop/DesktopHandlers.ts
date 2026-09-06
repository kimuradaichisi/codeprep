import { basename, resolve, dirname } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { clipboard, dialog, ipcMain } from 'electron';
import { AnalyzeProjectsUseCase } from '../../src/features/repository-context/application/AnalyzeProjectsUseCase';
import { DiscoverFilesUseCase } from '../../src/features/repository-context/application/DiscoverFilesUseCase';
import { BuildDesktopContextUseCase } from '../../src/features/repository-context/application/BuildDesktopContextUseCase';
import type { Project } from '../../src/features/repository-context/domain/Project';
import { GitMetadataClient } from '../../src/features/repository-context/infrastructure/git/GitMetadataClient';
import { GitHistoryReader } from '../../src/features/repository-context/infrastructure/git/GitHistoryReader';
import { ProjectRegistryStore } from '../../src/features/repository-context/infrastructure/filesystem/ProjectRegistryStore';
import { RipgrepClient } from '../../src/features/repository-context/infrastructure/search/RipgrepClient';
import { DesktopContextFormatter } from '../../src/features/repository-context/infrastructure/formatting/DesktopContextFormatter';
import { canReadProjectFile, readProjectFile, getProjectFileSize } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileContentReader';
import { listProjectFiles } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileTree';
import { DependencyScanner } from '../../src/features/engine/application/DependencyScanner';
import { DocGraphClient } from '../../src/features/repository-context/infrastructure/recommendation/DocGraphClient';
import { MarkdownRecommendationClient } from '../../src/features/repository-context/infrastructure/recommendation/MarkdownRecommendationClient';
import { GitCoChangeClient } from '../../src/features/repository-context/infrastructure/git/GitCoChangeClient';
import { DirectoryProximityClient } from '../../src/features/repository-context/infrastructure/recommendation/DirectoryProximityClient';
import { toAnalyzeInput, toDiscoverInput, toBuildInput, toSaveOutputRequest } from './DesktopRequestParser';
import { saveOutputFile, type OutputFileDependencies } from './OutputFileSaver';
import { handleBuildTaskContext } from './TaskContextHandler';

export const registerDesktopHandlers = (registryPath: string): void => {
  const registry = new ProjectRegistryStore(registryPath);
  ipcMain.handle('chooseProjectFolder', createChooseProjectFolderHandler(openFolderDialog));
  ipcMain.handle('listProjectFiles', (_event, pId: unknown, opt: unknown) => listFiles(registry, pId, opt));
  ipcMain.handle('listProjects', () => listProjects(registry));
  ipcMain.handle('addProject', (_event, value: unknown) => addProject(registry, value));
  ipcMain.handle('removeProject', (_event, value: unknown) => removeProject(registry, value));
  ipcMain.handle('analyzeProjects', (_event, value: unknown) => analyzeProjects(registry, value));
  ipcMain.handle('discoverFiles', (_event, value: unknown) => discoverFiles(registry, value));
  ipcMain.handle('generateOutput', (_event, value: unknown) => generateOutput(registry, value));
  ipcMain.handle('copyOutput', (_event, value: unknown) => copyOutput(value));
  ipcMain.handle('saveOutput', (_event, value: unknown) => saveOutput(value));
  ipcMain.handle('readFileContent', (_event, pId: unknown, rel: unknown) => readFileContent(registry, pId, rel));
  ipcMain.handle('buildTaskContext', (_event, value: unknown) => handleBuildTaskContext(registry, value));
};

let lastChosenPath: string | undefined = undefined;

export type OpenFolderDialog = (defaultPath?: string) => Promise<Readonly<{ canceled: boolean; filePaths: readonly string[] }>>;

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

const openFolderDialog = (defaultPath?: string) => dialog.showOpenDialog({
  properties: ['openDirectory'], defaultPath: defaultPath ? dirname(defaultPath) : undefined,
});

const listProjects = async (registry: ProjectRegistryStore) => (await registry.readAll()).projects;

const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value;
};

const listFiles = async (registry: ProjectRegistryStore, pIdVal: unknown, optVal: unknown) => {
  const projectId = requiredString(pIdVal, 'Project id');
  const useGitignore = optVal && typeof optVal === 'object' && typeof (optVal as any).useGitignore === 'boolean'
    ? (optVal as any).useGitignore : undefined;
  const project = (await listProjects(registry)).find(item => item.id === projectId);
  if (!project) throw new Error('Project was not found.');
  const relativePaths = await listProjectFiles(project.rootPath, useGitignore);
  return Promise.all(relativePaths.map(async relativePath => ({ relativePath, size: await getProjectFileSize(project, relativePath) })));
};

const addProject = async (registry: ProjectRegistryStore, value: unknown) => {
  const rootPath = requiredString(value, 'Project path');
  const projects = [...await listProjects(registry), createProject(rootPath)];
  await registry.saveAll(projects);
  return projects;
};

const removeProject = async (registry: ProjectRegistryStore, value: unknown) => {
  const projectId = requiredString(value, 'Project id');
  const projects = (await listProjects(registry)).filter(project => project.id !== projectId);
  await registry.saveAll(projects);
  return projects;
};

const analyzeProjects = async (registry: ProjectRegistryStore, value: unknown) => new AnalyzeProjectsUseCase({
  projects: registry, ripgrep: new RipgrepClient(), gitMetadata: new GitMetadataClient(),
  fileContent: { canRead: canReadProjectFile, read: readProjectFile }, fileSize: { getSize: getProjectFileSize },
}).analyze(toAnalyzeInput(value));

const discoverFiles = async (registry: ProjectRegistryStore, value: unknown) => {
  const filePort = {
    list: async (project: Project) => {
      const relativePaths = await listProjectFiles(project.rootPath);
      return Promise.all(relativePaths.map(async relativePath => ({ relativePath, size: await getProjectFileSize(project, relativePath) })));
    },
  };
  return new DiscoverFilesUseCase({
    projects: registry, ripgrep: new RipgrepClient(), gitMetadata: new GitMetadataClient(),
    files: filePort,
    clipboard: { readText: () => Promise.resolve(clipboard.readText()) }, gitHistory: new GitHistoryReader(),
    fileSize: { getSize: getProjectFileSize }, fileContent: { read: readProjectFile, canRead: canReadProjectFile },
    dependencyScanner: new DependencyScanner(), docGraph: new DocGraphClient(),
    recommendations: {
      markdownLink: new MarkdownRecommendationClient({ read: readProjectFile, canRead: canReadProjectFile }, filePort, 'markdownLink'),
      nameHeading: new MarkdownRecommendationClient({ read: readProjectFile, canRead: canReadProjectFile }, filePort, 'nameHeading'),
      gitCoChange: new GitCoChangeClient(), directoryProximity: new DirectoryProximityClient(filePort),
    },
  }).discover(toDiscoverInput(value));
};

const generateOutput = async (registry: ProjectRegistryStore, value: unknown) => {
  const result = await new BuildDesktopContextUseCase({
    projects: registry, fileContent: { canRead: canReadProjectFile, read: readProjectFile }, formatter: new DesktopContextFormatter(),
  }).build(toBuildInput(value));
  return { preview: result.preview, warning: result.warnings.map(w => w.message).join('\n') || undefined, manifest: result.manifest };
};

const readFileContent = async (registry: ProjectRegistryStore, pId: unknown, relPath: unknown) => {
  const project = (await listProjects(registry)).find(item => item.id === requiredString(pId, 'Project id'));
  if (!project) throw new Error('Project was not found.');
  const content = await readProjectFile(project, requiredString(relPath, 'Relative path'));
  if (content === undefined) throw new Error('Unable to read file.');
  return content;
};

const copyOutput = (value: unknown) => clipboard.writeText(requiredString(value, 'Output'));

const defaultOutputFileDeps: OutputFileDependencies = {
  showSaveDialog: options => dialog.showSaveDialog(options as unknown as Parameters<typeof dialog.showSaveDialog>[0]),
  writeFile: (path, content) => writeFile(path, content, 'utf8'),
  now: () => new Date(),
};

export const saveOutput = async (value: unknown, deps = defaultOutputFileDeps) => {
  try {
    const request = toSaveOutputRequest(value);
    return await saveOutputFile(deps, request);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid save output request.') throw error;
    throw new Error('Unable to save the generated output.');
  }
};

const createProject = (rootPath: string): Project => {
  const resolvedPath = resolve(rootPath);
  return { id: randomUUID(), name: basename(resolvedPath), rootPath: resolvedPath };
};


