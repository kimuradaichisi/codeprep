import type { AnalyzedCandidate } from '../../../../src/features/repository-context/application/ports';
import type { Project } from '../../../../src/features/repository-context/domain/Project';
import type { CandidateReason } from '../../../../src/features/repository-context/domain/CandidateFile';
import type { PackMode } from '../../../../src/features/repository-context/domain/PackMode';
import type { RecommendationReason } from '../../../../src/features/repository-context/domain/Recommendation';
import { candidateKey } from './tokenBudget';
export type CandidateTreeNodeKind = 'project' | 'directory' | 'file';
export type CandidateTreeNode = Readonly<{
  id: string;
  kind: CandidateTreeNodeKind;
  name: string;
  candidateKey?: string;
  children: readonly CandidateTreeNode[];
  size?: number;
  packMode?: PackMode;
  reasons?: readonly CandidateReason[];
  score?: number;
  recommendationReasons?: readonly RecommendationReason[];
}>;
export type NodeCheckState = 'checked' | 'unchecked' | 'mixed'; export type TreeSort = 'name' | 'size';
type NormalizedCandidate = Readonly<{
  projectId: string;
  key: string;
  segments: readonly string[];
  size?: number;
  packMode?: PackMode;
  reasons: readonly CandidateReason[];
  score?: number;
  recommendationReasons?: readonly RecommendationReason[];
}>;
export const buildCandidateTree = (
  candidates: readonly AnalyzedCandidate[],
  projects: readonly Project[],
): readonly CandidateTreeNode[] =>
  projectRoots(candidates, projects).flatMap(project => {
    const projectCandidates = candidatesForProject(candidates, project.id);
    return [projectNode(project, projectCandidates)];
  });
const projectRoots = (candidates: readonly AnalyzedCandidate[], projects: readonly Project[]): readonly Project[] => {
  const known = new Set(projects.map(project => project.id));
  const missing = [...new Set(candidates.map(candidate => candidate.projectId))]
    .filter(projectId => !known.has(projectId))
    .map(projectId => ({ id: projectId, name: projectId, rootPath: '' }));
  return [...projects, ...missing];
};
export const descendantCandidateKeys = (node: CandidateTreeNode): readonly string[] =>
  node.candidateKey ? [node.candidateKey] : node.children.flatMap(descendantCandidateKeys);
export const nodeCheckState = (
  node: CandidateTreeNode,
  selected: readonly string[],
): NodeCheckState => checkState(descendantCandidateKeys(node), selected);
export const toggleTreeNode = (
  node: CandidateTreeNode,
  id: string,
  selected: readonly string[],
): readonly string[] => toggleKeys(descendantCandidateKeys(findNode(node, id) ?? node), selected);
const candidatesForProject = (
  candidates: readonly AnalyzedCandidate[],
  projectId: string,
): readonly NormalizedCandidate[] =>
  candidates.filter(candidate => candidate.projectId === projectId).map(normalizeCandidate);
const normalizeCandidate = (candidate: AnalyzedCandidate): NormalizedCandidate => {
  const relativePath = candidate.relativePath.replace(/\\/g, '/');
  return { projectId: candidate.projectId, key: candidateKey(candidate.projectId, relativePath), segments: relativePath.split('/'), size: candidate.size, packMode: candidate.packMode, reasons: candidate.reasons, score: candidate.score, recommendationReasons: candidate.recommendationReasons };
};
type TrieFolder = {
  dirs: Map<string, TrieFolder>;
  files: CandidateTreeNode[];
};

const createTrieFolder = (): TrieFolder => ({
  dirs: new Map(),
  files: [],
});

const insertCandidateToTrie = (root: TrieFolder, candidate: NormalizedCandidate): void => {
  let current = root;
  const dirSegments = candidate.segments.slice(0, -1);
  for (const seg of dirSegments) {
    let next = current.dirs.get(seg);
    if (!next) {
      next = createTrieFolder();
      current.dirs.set(seg, next);
    }
    current = next;
  }
  current.files.push(fileNode(candidate));
};

const trieToNodes = (
  folder: TrieFolder,
  projectId: string,
  parentSegments: readonly string[]
): readonly CandidateTreeNode[] => {
  const dirNames = [...folder.dirs.keys()].sort();
  const dirNodes = dirNames.map((name) => {
    const nextSegments = [...parentSegments, name];
    const subFolder = folder.dirs.get(name)!;
    const children = trieToNodes(subFolder, projectId, nextSegments);
    const size = children.reduce((sum, child) => sum + (child.size ?? 0), 0);
    return {
      id: `${projectId}:${nextSegments.join('/')}`,
      kind: 'directory' as const,
      name,
      children,
      size,
    };
  });
  const files = [...folder.files].sort(byName);
  return [...dirNodes, ...files];
};

const projectNode = (
  project: Project,
  candidates: readonly NormalizedCandidate[],
): CandidateTreeNode => {
  const trie = createTrieFolder();
  for (const candidate of candidates) {
    insertCandidateToTrie(trie, candidate);
  }
  const children = trieToNodes(trie, project.id, []);
  const size = children.reduce((sum, child) => sum + (child.size ?? 0), 0);
  return {
    id: `project:${project.id}`,
    kind: 'project',
    name: project.name,
    children,
    size,
  };
};

const fileNode = (candidate: NormalizedCandidate): CandidateTreeNode => ({
  id: candidate.key,
  kind: 'file',
  name: candidate.segments.at(-1) ?? '',
  candidateKey: candidate.key,
  children: [],
  size: candidate.size,
  packMode: candidate.packMode,
  reasons: candidate.reasons,
  score: candidate.score,
  recommendationReasons: candidate.recommendationReasons,
});

const byName = (left: CandidateTreeNode, right: CandidateTreeNode): number => left.name.localeCompare(right.name);
const bySize = (left: CandidateTreeNode, right: CandidateTreeNode): number => (right.size ?? 0) - (left.size ?? 0);
const byId = (left: CandidateTreeNode, right: CandidateTreeNode): number => left.id.localeCompare(right.id);

const checkState = (keys: readonly string[], selected: readonly string[]): NodeCheckState => {
  if (keys.length === 0) return 'unchecked';
  const selectedSet = new Set(selected);
  let count = 0;
  for (const key of keys) {
    if (selectedSet.has(key)) count++;
  }
  return count === 0 ? 'unchecked' : count === keys.length ? 'checked' : 'mixed';
};

const findNode = (node: CandidateTreeNode, id: string): CandidateTreeNode | undefined =>
  node.id === id ? node : node.children.map(child => findNode(child, id)).find(Boolean);
const toggleKeys = (keys: readonly string[], selected: readonly string[]): readonly string[] =>
  keys.some(key => !selected.includes(key)) ? [...selected, ...keys.filter(key => !selected.includes(key))] : selected.filter(key => !keys.includes(key));
export const sortCandidateTree = (nodes: readonly CandidateTreeNode[], sort: TreeSort): readonly CandidateTreeNode[] => [...nodes]
    .map(node => ({ ...node, children: sortCandidateTree(node.children, sort) }))
    .sort(treeComparator(sort));
const treeComparator = (sort: TreeSort) => (left: CandidateTreeNode, right: CandidateTreeNode): number => {
    if ((left.kind === 'file') !== (right.kind === 'file')) return left.kind === 'file' ? 1 : -1;
  if (sort === 'size') return bySize(left, right) || byName(left, right) || byId(left, right);
  return byName(left, right) || byId(left, right);
  };
