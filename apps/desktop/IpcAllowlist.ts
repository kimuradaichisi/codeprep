import type { DesktopApi } from './DesktopApi';

export const desktopChannels = [
  'chooseProjectFolder', 'listProjectFiles', 'listProjects', 'addProject', 'removeProject', 'analyzeProjects', 'discoverFiles',
  'generateOutput', 'copyOutput',
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
  listProjectFiles: projectId => invokeAs(invoke, 'listProjectFiles', projectId),
  listProjects: () => invokeAs(invoke, 'listProjects'),
  addProject: rootPath => invokeAs(invoke, 'addProject', rootPath),
  removeProject: projectId => invokeAs(invoke, 'removeProject', projectId),
  analyzeProjects: input => invokeAs(invoke, 'analyzeProjects', input),
  discoverFiles: input => invokeAs(invoke, 'discoverFiles', input),
  generateOutput: input => invokeAs(invoke, 'generateOutput', input),
  copyOutput: text => invokeAs(invoke, 'copyOutput', text),
});

const isDesktopChannel = (value: string): value is DesktopChannel =>
  desktopChannels.includes(value as DesktopChannel);

const invokeAs = <Value>(
  invoke: IpcInvoker,
  channel: DesktopChannel,
  ...args: readonly unknown[]
): Promise<Value> => invoke(channel, ...args) as Promise<Value>;
