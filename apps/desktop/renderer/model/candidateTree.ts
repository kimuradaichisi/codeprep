import type { AnalyzedCandidate } from '../../../../src/features/desktop-core/application/ports';
import type { Project } from '../../../../src/features/desktop-core/domain/Project';
import type { CandidateReason } from '../../../../src/features/desktop-core/domain/CandidateFile';
import type { PackMode } from '../../../../src/features/desktop-core/domain/PackMode';
import type { RecommendationReason } from '../../../../src/features/desktop-core/domain/Recommendation';
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
const projectNode = (
  project: Project,
  candidates: readonly NormalizedCandidate[],
): CandidateTreeNode => {
  const children = childNodes(candidates, project.id, []);
  const size = children.reduce((sum, child) => sum + (child.size ?? 0), 0);
  return {
    id: `project:${project.id}`,
    kind: 'project',
    name: project.name,
    children,
    size,
  };
};
const childNodes = (
  candidates: readonly NormalizedCandidate[],
  projectId: string,
  parent: readonly string[],
): readonly CandidateTreeNode[] => [...directoryNodes(candidates, projectId, parent), ...fileNodes(candidates, parent)];
const directoryNodes = (
  candidates: readonly NormalizedCandidate[],
  projectId: string,
  parent: readonly string[],
): readonly CandidateTreeNode[] => uniqueDirectoryNames(candidates, parent).map(name => directoryNode(candidates, projectId, parent, name));
const uniqueDirectoryNames = (
  candidates: readonly NormalizedCandidate[],
  parent: readonly string[],
): readonly string[] => [...new Set(candidates.flatMap(candidate => directoryName(candidate, parent)))].sort();
const directoryName = (candidate: NormalizedCandidate, parent: readonly string[]): readonly string[] =>
  candidate.segments.length > parent.length + 1 && matchesParent(candidate, parent) ? [candidate.segments[parent.length]] : [];
const directoryContents = (candidates: readonly NormalizedCandidate[], projectId: string, parent: readonly string[], name: string): readonly [readonly CandidateTreeNode[], number] => { const children = childNodes(candidates, projectId, [...parent, name]);
  return [children, children.reduce((sum, child) => sum + (child.size ?? 0), 0)];
};
const directoryNode = (
  candidates: readonly NormalizedCandidate[],
  projectId: string,
  parent: readonly string[],
  name: string,
): CandidateTreeNode => {
  const [children, size] = directoryContents(candidates, projectId, parent, name);
  return {
    id: `${projectId}:${[...parent, name].join('/')}`,
    kind: 'directory',
    name,
    children,
    size,
  };
};
const fileNodes = (
  candidates: readonly NormalizedCandidate[],
  parent: readonly string[],
): readonly CandidateTreeNode[] => candidates.filter(candidate => isDirectFile(candidate, parent)).map(fileNode).sort(byName);
const isDirectFile = (candidate: NormalizedCandidate, parent: readonly string[]): boolean =>
  candidate.segments.length === parent.length + 1 && matchesParent(candidate, parent);
const matchesParent = (candidate: NormalizedCandidate, parent: readonly string[]): boolean =>
  parent.every((segment, index) => candidate.segments[index] === segment);
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
  const selectedCount = keys.filter(key => selected.includes(key)).length;
  return selectedCount === 0 ? 'unchecked' : selectedCount === keys.length ? 'checked' : 'mixed';
};
const findNode = (node: CandidateTreeNode, id: string): CandidateTreeNode | undefined => node.id === id ? node : node.children.map(child => findNode(child, id)).find(Boolean);
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
