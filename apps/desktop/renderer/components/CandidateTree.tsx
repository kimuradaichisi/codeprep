import type { CandidateTreeProps } from '../types';
import { CandidateTreeNode } from './CandidateTreeNode';

export const CandidateTree = ({ tree, candidates = [], selectedKeys, toggleTreeNode }: CandidateTreeProps) => <section className="candidate-tree">
  <div className="pane-heading"><div><p className="eyebrow">REVIEW</p><h2>Candidates</h2></div><span className="count">{selectedKeys.length} selected</span></div>
  <div className="tree-scroll">
    {tree.length ? <ul className="tree-root">{tree.map(node => <CandidateTreeNode key={node.id} node={node} selectedKeys={selectedKeys} toggleTreeNode={toggleTreeNode} />)}</ul> : candidates.length ? <ul className="tree-root">{candidates.map(candidate => <li key={candidate.relativePath}><div className="tree-row"><input type="checkbox" aria-label={`Include ${candidate.relativePath}`} checked={selectedKeys.includes(`${candidate.projectId}:${candidate.relativePath}`)} onChange={() => undefined} /><span className="tree-name">{candidate.relativePath}</span></div></li>)}</ul> : <div className="empty-state"><strong>No candidates yet</strong><p>Search for a file or symbol to populate the Explorer.</p></div>}
  </div>
</section>;
