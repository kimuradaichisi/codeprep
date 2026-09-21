import type { DesktopApi } from './DesktopApi';

export const desktopChannels = [
  'chooseProjectFolder', 'listProjectFiles', 'listProjects', 'addProject', 'removeProject', 'analyzeProjects', 'discoverFiles',
  'generateOutput', 'copyOutput', 'saveOutput', 'readFileContent', 'buildTaskContext', 'discoverEntryPointCandidates',
  'getRepositoryIndexStatus', 'refreshRepositoryIndex',
  'cancelScanProjectFiles', 'getScanProgress',
] as const;

export type DesktopChannel = (typeof desktopChannels)[number];

export type IpcInvoker = (
  channel: string,
  ...args: readonly unknown[]
) => Promise<unknown>;

export const createSafeIpcInvoker = (invoke: IpcInvoker): IpcInvoker =>
  (channel, ...args) => isDesktopChannel(channel)
    ? invoke(channel, ...args)
    : Promise.reject(new Error('Unsupported IPC channel.'));

export const createDesktopApi = (invoke: IpcInvoker): DesktopApi => ({
  chooseProjectFolder: () => invokeAs(invoke, 'chooseProjectFolder'),
  listProjectFiles: (projectId, options) => invokeAs(invoke, 'listProjectFiles', projectId, options),
  listProjects: () => invokeAs(invoke, 'listProjects'),
  addProject: rootPath => invokeAs(invoke, 'addProject', rootPath),
  removeProject: projectId => invokeAs(invoke, 'removeProject', projectId),
  analyzeProjects: input => invokeAs(invoke, 'analyzeProjects', input),
  discoverFiles: input => invokeAs(invoke, 'discoverFiles', input),
  generateOutput: input => invokeAs(invoke, 'generateOutput', input),
  copyOutput: text => invokeAs(invoke, 'copyOutput', text),
  saveOutput: request => invokeAs(invoke, 'saveOutput', request),
  readFileContent: (projectId, relativePath) => invokeAs(invoke, 'readFileContent', projectId, relativePath),
  buildTaskContext: request => invokeAs(invoke, 'buildTaskContext', request),
  discoverEntryPointCandidates: request => invokeAs(invoke, 'discoverEntryPointCandidates', request),
  getRepositoryIndexStatus: workspaceId => invokeAs(invoke, 'getRepositoryIndexStatus', workspaceId),
  refreshRepositoryIndex: workspaceId => invokeAs(invoke, 'refreshRepositoryIndex', workspaceId),
  cancelScanProjectFiles: () => invokeAs(invoke, 'cancelScanProjectFiles'),
  getScanProgress: () => invokeAs(invoke, 'getScanProgress'),
});

const isDesktopChannel = (value: string): value is DesktopChannel =>
  desktopChannels.includes(value as DesktopChannel);

const invokeAs = <Value>(
  invoke: IpcInvoker,
  channel: DesktopChannel,
  ...args: readonly unknown[]
): Promise<Value> => invoke(channel, ...args) as Promise<Value>;

