import type { CandidateTreeProps } from '../types';
import { CandidateTreeNode } from './CandidateTreeNode';

export const CandidateTree = ({ tree, candidates = [], selectedKeys, toggleTreeNode, selectAll, clearAll, viewFile }: CandidateTreeProps) => <section className="candidate-tree">
  <div className="pane-heading">
    <div><p className="eyebrow">REVIEW</p><h2>Candidates</h2></div>
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button onClick={selectAll} style={{ background: 'none', border: 'none', color: '#76a9ff', cursor: 'pointer', padding: '2px 4px', fontSize: '11px' }}>Select All</button>
      <span style={{ color: '#354255' }}>|</span>
      <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#ff7676', cursor: 'pointer', padding: '2px 4px', fontSize: '11px' }}>Clear All</button>
      <span className="count" style={{ marginLeft: '8px' }}>{selectedKeys.length} selected</span>
    </div>
  </div>
  <div className="tree-scroll">
    {tree.length ? <ul className="tree-root">{tree.map(node => <CandidateTreeNode key={node.id} node={node} selectedKeys={selectedKeys} toggleTreeNode={toggleTreeNode} viewFile={viewFile} />)}</ul> : candidates.length ? <ul className="tree-root">{candidates.map(candidate => <li key={candidate.relativePath}><div className="tree-row"><input type="checkbox" aria-label={`Include ${candidate.relativePath}`} checked={selectedKeys.includes(`${candidate.projectId}:${candidate.relativePath}`)} onChange={() => undefined} /><span className="tree-name" onDoubleClick={() => viewFile(candidate.projectId, candidate.relativePath)} style={{ cursor: 'pointer', userSelect: 'none' }}>{candidate.relativePath}</span>{candidate.size !== undefined && <span style={{ fontSize: '10px', color: '#4f5e75', marginLeft: '6px', userSelect: 'none' }}>({candidate.size < 1024 ? `${candidate.size} B` : `${(candidate.size / 1024).toFixed(1)} KB`} / {Math.ceil(candidate.size / 4)} tokens)</span>}</div></li>)}</ul> : <div className="empty-state"><strong>No candidates yet</strong><p>Search for a file or symbol to populate the Explorer.</p></div>}
  </div>
</section>;
