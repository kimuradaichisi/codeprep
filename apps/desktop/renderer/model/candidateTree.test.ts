import { describe, expect, it } from 'vitest';
import type { AnalyzedCandidate } from '../../../../src/features/desktop-core/application/ports';
import type { Project } from '../../../../src/features/desktop-core/domain/Project';
import { buildCandidateTree, descendantCandidateKeys, nodeCheckState, toggleTreeNode } from './candidateTree';

const projects: readonly Project[] = [
  { id: 'a', name: 'Alpha', rootPath: 'C:/alpha' },
  { id: 'b', name: 'Beta', rootPath: 'C:/beta' },
];
const candidate = (projectId: string, relativePath: string): AnalyzedCandidate =>
  ({ projectId, relativePath, reasons: ['rgMatch'], excluded: false, score: 1 });

describe('candidate tree', () => {
  it('builds nested project directories and files using normalized candidate keys', () => {
    const tree = buildCandidateTree([candidate('a', 'src\\ui\\App.tsx'), candidate('a', 'README.md')], projects);

    expect(tree[0]).toEqual({ id: 'project:a', kind: 'project', name: 'Alpha', size: 0, children: [
      { id: 'a:src', kind: 'directory', name: 'src', size: 0, children: [{ id: 'a:src/ui', kind: 'directory', name: 'ui', size: 0, children: [{ id: 'a:src/ui/App.tsx', kind: 'file', name: 'App.tsx', candidateKey: 'a:src/ui/App.tsx', children: [], size: undefined, packMode: undefined, reasons: ['rgMatch'], score: 1 }] }] },
      { id: 'a:README.md', kind: 'file', name: 'README.md', candidateKey: 'a:README.md', children: [], size: undefined, packMode: undefined, reasons: ['rgMatch'], score: 1 },
    ] });
  });

  it('uses registry project names and includes only projects with candidates', () => {
    const tree = buildCandidateTree([candidate('b', 'z.ts'), candidate('a', 'a.ts')], projects);

    expect(tree.map(node => [node.id, node.name])).toEqual([['project:a', 'Alpha'], ['project:b', 'Beta']]);
  });

  it('keeps registered projects visible before analysis', () => {
    expect(buildCandidateTree([], projects).map(node => node.name)).toEqual(['Alpha', 'Beta']);
  });

  it('reports checked and unchecked selection states', () => {
    const [project] = buildCandidateTree([candidate('a', 'a.ts'), candidate('a', 'b.ts')], projects);

    expect(nodeCheckState(project, [])).toBe('unchecked');
    expect(nodeCheckState(project, ['a:a.ts', 'a:b.ts'])).toBe('checked');
  });

  it('toggles only the selected directory subtree', () => {
    const [project] = buildCandidateTree([candidate('a', 'src/a.ts'), candidate('a', 'other/b.ts')], projects);
    const src = project.children.find(child => child.name === 'src');
    if (!src) throw new Error('src directory missing');

    expect(toggleTreeNode(project, src.id, [])).toEqual(['a:src/a.ts']);
    expect(toggleTreeNode(project, src.id, ['a:src/a.ts'])).toEqual([]);
  });

  it('orders directories before files lexically from unsorted candidates', () => {
    const candidates = [candidate('a', 'z.ts'), candidate('a', 'src/a.ts'), candidate('a', 'a.ts'), candidate('a', 'alpha/a.ts')];
    const [project] = buildCandidateTree(candidates, projects);

    expect(project.children.map(node => `${node.kind}:${node.name}`)).toEqual(['directory:alpha', 'directory:src', 'file:a.ts', 'file:z.ts']);
  });

  it('reports mixed selection and toggles all descendant leaves immutably', () => {
    const [project] = buildCandidateTree([candidate('a', 'src/a.ts'), candidate('a', 'src/b.ts')], projects);
    const selected = ['a:src/a.ts'];

    expect(nodeCheckState(project, selected)).toBe('mixed');
    expect(descendantCandidateKeys(project)).toEqual(['a:src/a.ts', 'a:src/b.ts']);
    expect(toggleTreeNode(project, project.id, selected)).toEqual(['a:src/a.ts', 'a:src/b.ts']);
    expect(selected).toEqual(['a:src/a.ts']);
    expect(toggleTreeNode(project, project.id, ['a:src/a.ts', 'a:src/b.ts'])).toEqual([]);
  });
});
