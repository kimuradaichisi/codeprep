import type { AnalyzedCandidate } from '../../../../src/features/desktop-core/application/ports';
import type { Project } from '../../../../src/features/desktop-core/domain/Project';

export type CandidateTreeNodeKind = 'project' | 'directory' | 'file';
export type CandidateTreeNode = Readonly<{
  id: string;
  kind: CandidateTreeNodeKind;
  name: string;
  candidateKey?: string;
  children: readonly CandidateTreeNode[];
  size?: number;
}>;
export type NodeCheckState = 'checked' | 'unchecked' | 'mixed';

type NormalizedCandidate = Readonly<{
  projectId: string;
  key: string;
  segments: readonly string[];
  size?: number;
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
  return { projectId: candidate.projectId, key: `${candidate.projectId}:${relativePath}`, segments: relativePath.split('/'), size: candidate.size };
};

const projectNode = (
  project: Project,
  candidates: readonly NormalizedCandidate[],
): CandidateTreeNode => ({
  id: `project:${project.id}`,
  kind: 'project',
  name: project.name,
  children: childNodes(candidates, project.id, []),
});

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

const directoryNode = (
  candidates: readonly NormalizedCandidate[],
  projectId: string,
  parent: readonly string[],
  name: string,
): CandidateTreeNode => ({
  id: `${projectId}:${[...parent, name].join('/')}`,
  kind: 'directory',
  name,
  children: childNodes(candidates, projectId, [...parent, name]),
});

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
});

const byName = (left: CandidateTreeNode, right: CandidateTreeNode): number => left.name.localeCompare(right.name);

const checkState = (keys: readonly string[], selected: readonly string[]): NodeCheckState => {
  const selectedCount = keys.filter(key => selected.includes(key)).length;
  if (selectedCount === 0) return 'unchecked';
  return selectedCount === keys.length ? 'checked' : 'mixed';
};

const findNode = (node: CandidateTreeNode, id: string): CandidateTreeNode | undefined => {
  if (node.id === id) return node;
  return node.children.map(child => findNode(child, id)).find(Boolean);
};

const toggleKeys = (keys: readonly string[], selected: readonly string[]): readonly string[] =>
  keys.some(key => !selected.includes(key)) ? [...selected, ...keys.filter(key => !selected.includes(key))] : selected.filter(key => !keys.includes(key));
