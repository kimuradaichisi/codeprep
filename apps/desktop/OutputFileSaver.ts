import type { ContextOutputFormat } from '../../src/features/repository-context/application/ports';
import type { SaveOutputRequest, SaveOutputResult } from './DesktopApi';

export type FileFilter = Readonly<{
  name: string;
  extensions: readonly string[];
}>;

export type SaveDialogOptions = Readonly<{
  title: string;
  defaultPath: string;
  filters: readonly FileFilter[];
}>;

export type SaveDialogResult = Readonly<{
  canceled: boolean;
  filePath?: string;
}>;

export type OutputFileDependencies = Readonly<{
  showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult>;
  writeFile(path: string, content: string): Promise<void>;
  now(): Date;
}>;

type FormatConfig = Readonly<{
  extension: string;
  filterName: string;
}>;

const formatDefinition = (format: ContextOutputFormat): FormatConfig => {
  if (format === 'xml') return { extension: 'xml', filterName: 'XML Files' };
  if (format === 'json') return { extension: 'json', filterName: 'JSON Files' };
  return { extension: 'md', filterName: 'Markdown Files' };
};

const pad2 = (value: number): string => value.toString().padStart(2, '0');

export const formatTimestamp = (date: Date): string => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

export const buildDefaultFileName = (format: ContextOutputFormat, date: Date): string => {
  const { extension } = formatDefinition(format);
  const timestamp = formatTimestamp(date);
  return `codeprep-context-${timestamp}.${extension}`;
};

export const buildSaveDialogOptions = (format: ContextOutputFormat, date: Date): SaveDialogOptions => {
  const { extension, filterName } = formatDefinition(format);
  const defaultPath = buildDefaultFileName(format, date);
  return {
    title: 'Save generated context',
    defaultPath,
    filters: [{ name: filterName, extensions: [extension] }],
  };
};

export const saveOutputFile = async (
  deps: OutputFileDependencies,
  request: SaveOutputRequest,
): Promise<SaveOutputResult> => {
  const options = buildSaveDialogOptions(request.format, deps.now());
  const result = await deps.showSaveDialog(options);
  if (result.canceled || !result.filePath) {
    return { status: 'cancelled' };
  }
  await deps.writeFile(result.filePath, request.content);
  return { status: 'saved', filePath: result.filePath };
};
