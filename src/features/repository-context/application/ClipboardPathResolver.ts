// src/features/repository-context/application/ClipboardPathResolver.ts
import { createCandidateFile } from '../domain/CandidateFile';
import type { Project } from '../domain/Project';
import type { AnalyzedCandidate, AnalysisWarning, DiscoverFilesPorts } from './ports';

export type ResolvedClipboardPaths = Readonly<{
  candidates: readonly AnalyzedCandidate[];
  warnings: readonly AnalysisWarning[];
}>;

type FileInfo = Readonly<{ relativePath: string; size: number }>;

export class ClipboardPathResolver {
  constructor(private readonly ports: Pick<DiscoverFilesPorts, 'clipboard' | 'files'>) {}

  async resolve(projects: readonly Project[]): Promise<ResolvedClipboardPaths> {
    const text = await this.ports.clipboard.readText();
    const paths = extractCandidatePaths(text);
    const candidates: AnalyzedCandidate[] = [];
    const unmatched: string[] = [];

    for (const path of paths) {
      const resolved = await this.resolveSinglePath(path, projects);
      if (resolved.length > 0) candidates.push(...resolved);
      else unmatched.push(path);
    }
    return {
      candidates: dedupeCandidates(candidates),
      warnings: unmatched.length > 0 ? [outsideWarning(projects[0], unmatched)] : [],
    };
  }

  private async resolveSinglePath(path: string, projects: readonly Project[]): Promise<readonly AnalyzedCandidate[]> {
    for (const project of projects) {
      const files = await this.ports.files.list(project);
      const matched = resolveFilesForPath(path, files, project.id);
      if (matched.length > 0) return matched;
    }
    return [];
  }
}

export const extractCandidatePaths = (text: string): readonly string[] => {
  const lines = text.split(/\r?\n/).map(cleanPath).filter(Boolean);
  const regex = /(?:[a-zA-Z]:[\\/]|(?:\.\/|\/))?[a-zA-Z0-9_.\-@]+(?:[\\/][a-zA-Z0-9_.\-@]+)*(?:\.[a-zA-Z0-9]+)?/g;
  const matches = (text.match(regex) || []).map(cleanPath).filter(Boolean);
  return Array.from(new Set([...lines, ...matches]));
};

const cleanPath = (raw: string): string =>
  raw.trim()
    .replace(/^[-*•\d.)\s]+/, '')
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/:\d+(?::\d+)?$/, '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .trim();

const resolveFilesForPath = (path: string, files: readonly FileInfo[], projectId: string): readonly AnalyzedCandidate[] => {
  const norm = path.toLowerCase().replace(/^\/+/, '');
  const fileCandidate = matchSingleFile(norm, files, projectId);
  if (fileCandidate) return [fileCandidate];

  const dirFiles = matchDirectoryFiles(norm, files);
  return dirFiles.map(f => ({
    ...createCandidateFile(projectId, f.relativePath, ['clipboardPath'], undefined, f.size),
    score: 0,
  }));
};

const matchSingleFile = (norm: string, files: readonly FileInfo[], projectId: string): AnalyzedCandidate | undefined => {
  const exact = files.find(f => f.relativePath.toLowerCase() === norm);
  if (exact) return toCandidate(projectId, exact);

  const suffix = files.filter(f => {
    const rel = f.relativePath.toLowerCase();
    return rel.endsWith('/' + norm) || rel === norm || norm.endsWith('/' + rel) || norm.endsWith(rel);
  });
  if (suffix.length === 1) return toCandidate(projectId, suffix[0]);

  const segments = norm.split('/');
  if (segments.length >= 2) {
    const best = bestSegmentMatch(segments, files);
    if (best) return toCandidate(projectId, best);
  }
  return undefined;
};

const matchDirectoryFiles = (norm: string, files: readonly FileInfo[]): readonly FileInfo[] => {
  const prefixMatches = files.filter(f => {
    const rel = f.relativePath.toLowerCase();
    return rel === norm || rel.startsWith(norm + '/');
  });
  if (prefixMatches.length > 0) return prefixMatches;

  return files.filter(f => {
    const rel = f.relativePath.toLowerCase();
    return rel.includes('/' + norm + '/') || rel.endsWith('/' + norm);
  });
};

const toCandidate = (projectId: string, file: FileInfo): AnalyzedCandidate => ({
  ...createCandidateFile(projectId, file.relativePath, ['clipboardPath'], undefined, file.size),
  score: 0,
});

const bestSegmentMatch = (segments: readonly string[], files: readonly FileInfo[]): FileInfo | undefined => {
  let best: FileInfo | undefined;
  let max = 0;
  for (const f of files) {
    const matchCount = countMatchingSegments(segments, f.relativePath.toLowerCase().split('/'));
    if (matchCount >= 2 && matchCount > max) {
      max = matchCount;
      best = f;
    } else if (matchCount >= 2 && matchCount === max) {
      best = undefined;
    }
  }
  return best;
};

const countMatchingSegments = (clip: readonly string[], rel: readonly string[]): number => {
  let count = 0;
  const min = Math.min(clip.length, rel.length);
  for (let i = 1; i <= min; i++) {
    if (clip[clip.length - i] === rel[rel.length - i]) count++;
    else break;
  }
  return count;
};

const dedupeCandidates = (candidates: readonly AnalyzedCandidate[]): readonly AnalyzedCandidate[] => {
  const seen = new Set<string>();
  return candidates.filter(c => {
    const key = `${c.projectId}:${c.relativePath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const outsideWarning = (project: Project | undefined, unmatched: readonly string[]): AnalysisWarning => ({
  kind: 'outsideProject',
  projectId: project?.id ?? 'workspace',
  message: `Unresolved: ${unmatched.join(', ')}`,
});
