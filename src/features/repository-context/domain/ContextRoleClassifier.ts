import type { CandidateReason } from './CandidateFile';
import type { ContextRole } from './ContextRole';

export interface RoleClassificationInput {
  relativePath: string;
  entryPoints: readonly string[];
  candidateReasons?: readonly CandidateReason[];
}

export const classifyContextRole = (input: RoleClassificationInput): ContextRole => {
  const normPath = normalizePath(input.relativePath);
  if (isTarget(normPath, input.entryPoints)) return 'target';
  if (isRepositoryRule(normPath)) return 'repositoryRule';
  if (isTestFile(normPath)) return 'test';
  if (isArchitecture(normPath)) return 'architecture';
  if (isSpecification(normPath)) return 'specification';
  if (isDependency(input.candidateReasons)) return 'dependency';
  return 'supporting';
};

const normalizePath = (p: string): string => p.replace(/\\/g, '/').replace(/^\/+/, '');

const isTarget = (path: string, entryPoints: readonly string[]): boolean =>
  entryPoints.some(ep => normalizePath(ep).toLowerCase() === path.toLowerCase());

const isRepositoryRule = (path: string): boolean => {
  const base = path.split('/').pop()?.toLowerCase() ?? '';
  return ['agents.md', 'claude.md', 'gemini.md', 'rules.md'].includes(base);
};

const isTestFile = (path: string): boolean => {
  const lower = path.toLowerCase();
  if (lower.includes('/__tests__/') || lower.startsWith('__tests__/')) return true;
  return /\.(test|spec)\.[a-z0-9]+$/i.test(lower);
};

const isArchitecture = (path: string): boolean => {
  const lower = path.toLowerCase();
  return lower.includes('architecture') && (lower.endsWith('.md') || lower.endsWith('.markdown'));
};

const isSpecification = (path: string): boolean => {
  const lower = path.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt');
};

const isDependency = (reasons?: readonly CandidateReason[]): boolean =>
  Boolean(reasons && reasons.includes('dependency'));
