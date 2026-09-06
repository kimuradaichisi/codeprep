import { posix } from 'node:path';

const markdownExtensions = ['md', 'markdown', 'mdx'] as const;

export const normalizePath = (value: string): string => value.replace(/\\/g, '/');

export const normalizeAvailablePath = (value: string): string =>
  normalizePath(value).replace(/^\.\//, '');

export const isMarkdownPath = (path: string): boolean =>
  /\.(?:md|markdown|mdx)$/i.test(path);

export const resolveLinkTarget = (
  source: string,
  rawTarget: string | undefined,
  availablePaths: ReadonlySet<string>,
  allowExtensionless: boolean,
): string | undefined => {
  const target = resolveRelativePath(source, rawTarget);
  if (!target) return undefined;
  const candidate = findAvailableTarget(target, availablePaths, allowExtensionless);
  return candidate && !isSourcePath(source, candidate) ? candidate : undefined;
};

const resolveRelativePath = (source: string, rawTarget: string | undefined): string | undefined => {
  if (!rawTarget || isExternalTarget(rawTarget)) return undefined;
  try {
    const target = decodeURIComponent(rawTarget.split(/[?#]/, 1)[0] ?? '').replace(/\\/g, '/');
    const normalized = posix.normalize(posix.join(posix.dirname(normalizePath(source)), target));
    return isInsideProject(normalized) ? normalized : undefined;
  } catch {
    return undefined;
  }
};

const isExternalTarget = (target: string): boolean =>
  target.startsWith('#') || target.startsWith('/') || target.startsWith('//') ||
  /^[A-Za-z][A-Za-z\d+.-]*:/.test(target);

const isInsideProject = (path: string): boolean => path !== '..' && !path.startsWith('../');

const isSourcePath = (source: string, target: string): boolean =>
  normalizeAvailablePath(source) === normalizeAvailablePath(target);

const findAvailableTarget = (
  target: string,
  availablePaths: ReadonlySet<string>,
  allowExtensionless: boolean,
): string | undefined => {
  if (availablePaths.has(target)) return target;
  if (!allowExtensionless || posix.extname(target)) return undefined;
  return markdownExtensions.map(extension => `${target}.${extension}`)
    .find(candidate => availablePaths.has(candidate));
};