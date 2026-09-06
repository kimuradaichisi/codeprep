import { basename, resolve, dirname, join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { clipboard, dialog, ipcMain } from 'electron';
import type { Project } from '../../src/features/repository-context/domain/Project';
import { ProjectRegistryStore } from '../../src/features/repository-context/infrastructure/filesystem/ProjectRegistryStore';
import { readProjectFile, getProjectFileSize } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileContentReader';
import { listProjectFiles } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileTree';
import { toSaveOutputRequest } from './DesktopRequestParser';
import { saveOutputFile, type OutputFileDependencies } from './OutputFileSaver';
import { handleBuildTaskContext } from './TaskContextHandler';
import { handleDiscoverEntryPointCandidates } from './EntryPointDiscoveryHandler';
import {
  handleAnalyzeProjects,
  handleDiscoverFiles,
  handleGenerateOutput,
} from './DesktopAnalysisHandlers';

import {
  handleGetRepositoryIndexStatus,
  handleRefreshRepositoryIndex,
} from './RepositoryIndexHandler';

export const registerDesktopHandlers = (registryPath: string): void => {
  const registry = new ProjectRegistryStore(registryPath);
  const indexesDir = join(dirname(registryPath), 'indexes');
  ipcMain.handle('chooseProjectFolder', createChooseProjectFolderHandler(openFolderDialog));
  ipcMain.handle('listProjectFiles', (_e, pId: unknown, opt: unknown) => listFiles(registry, pId, opt));
  ipcMain.handle('listProjects', () => listProjects(registry));
  ipcMain.handle('addProject', (_e, value: unknown) => addProject(registry, value));
  ipcMain.handle('removeProject', (_e, value: unknown) => removeProject(registry, value));
  ipcMain.handle('analyzeProjects', (_e, value: unknown) => handleAnalyzeProjects(registry, value));
  ipcMain.handle('discoverFiles', (_e, value: unknown) => handleDiscoverFiles(registry, value));
  ipcMain.handle('generateOutput', (_e, value: unknown) => handleGenerateOutput(registry, value));
  ipcMain.handle('copyOutput', (_e, value: unknown) => copyOutput(value));
  ipcMain.handle('saveOutput', (_e, value: unknown) => saveOutput(value));
  ipcMain.handle('readFileContent', (_e, pId: unknown, rel: unknown) => readFileContent(registry, pId, rel));
  ipcMain.handle('buildTaskContext', (_e, value: unknown) => handleBuildTaskContext(registry, value));
  ipcMain.handle('discoverEntryPointCandidates', (_e, val: unknown) => handleDiscoverEntryPointCandidates(registry, val));
  ipcMain.handle('getRepositoryIndexStatus', (_e, wsId: unknown) => handleGetRepositoryIndexStatus(indexesDir, wsId));
  ipcMain.handle('refreshRepositoryIndex', (_e, wsId: unknown) => handleRefreshRepositoryIndex(registry, indexesDir, wsId));
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
  const useGitignore = optVal && typeof optVal === 'object' && typeof (optVal as { useGitignore?: unknown }).useGitignore === 'boolean'
    ? (optVal as { useGitignore?: boolean }).useGitignore : undefined;
  const project = (await listProjects(registry)).find(item => item.id === projectId);
  if (!project) throw new Error('Project was not found.');
  const relativePaths = await listProjectFiles(project.rootPath, useGitignore);
  return Promise.all(relativePaths.map(async rel => ({ relativePath: rel, size: await getProjectFileSize(project, rel) })));
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
