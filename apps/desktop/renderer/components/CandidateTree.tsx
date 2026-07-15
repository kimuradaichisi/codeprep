import type { CandidateTreeProps } from '../types';
import { CandidateTreeNode } from './CandidateTreeNode';

export const CandidateTree = ({ tree, candidates = [], selectedKeys, toggleTreeNode, selectAll, clearAll, viewFile, setFilePackMode }: CandidateTreeProps) => <section className="candidate-tree">
  <div className="pane-heading">
    <div><p className="eyebrow">REVIEW</p><h2>Candidates</h2></div>
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button onClick={selectAll} style={{ background: 'none', border: 'none', color: '#76a9ff', cursor: 'pointer', padding: '2px 4px', fontSize: '11px' }}>Select All</button>
      <span style={{ color: '#354255' }}>|</span>
      <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#ff7676', cursor: 'pointer', padding: '2px 4px', fontSize: '11px' }}>Clear All</button>
      <span className="count" style={{ marginLeft: '8px' }}>{selectedKeys.length} selected</span>
    </div>
  </div>
  {(tree.length > 0 || candidates.length > 0) && (
    <div className="tree-header-row">
      <span className="tree-header-name">Name</span>
      <span className="tree-header-size">Size</span>
      <span className="tree-header-tokens">Tokens</span>
      <span className="tree-header-mode">Mode</span>
    </div>
  )}
  <div className="tree-scroll">
    {tree.length ? (
      <ul className="tree-root">{tree.map(node => <CandidateTreeNode key={node.id} node={node} selectedKeys={selectedKeys} toggleTreeNode={toggleTreeNode} viewFile={viewFile} setFilePackMode={setFilePackMode} />)}</ul>
    ) : candidates.length ? (
      <ul className="tree-root">{candidates.map(candidate => {
        const sizeLabel = candidate.size !== undefined ? (candidate.size < 1024 ? `${candidate.size} B` : `${(candidate.size / 1024).toFixed(1)} KB`) : '-';
        const tokensLabel = candidate.size !== undefined ? `${Math.ceil(candidate.size / 4)}` : '-';
        const isDep = candidate.reasons.includes('dependency');
        return <li key={candidate.relativePath}>
          <div className={`tree-row${isDep ? ' suggested-dep' : ''}`}>
            <div className="tree-node-info">
              <input type="checkbox" aria-label={`Include ${candidate.relativePath}`} checked={selectedKeys.includes(`${candidate.projectId}:${candidate.relativePath}`)} onChange={() => undefined} />
              <span className="tree-name" onDoubleClick={() => viewFile(candidate.projectId, candidate.relativePath)} style={{ cursor: 'pointer', userSelect: 'none' }}>{candidate.relativePath}</span>
              {isDep && <span className="dep-badge">Suggested</span>}
            </div>
            <span className="tree-node-size">{sizeLabel}</span>
            <span className="tree-node-tokens">{tokensLabel}</span>
            <div className="tree-node-mode">
              <select value={candidate.packMode ?? ''} onChange={e => setFilePackMode(candidate.projectId, candidate.relativePath, e.target.value ? e.target.value as any : undefined)}>
                <option value="">Global</option>
                <option value="full">Full</option>
                <option value="skeleton">Skeleton</option>
              </select>
            </div>
          </div>
        </li>;
      })}</ul>
    ) : (
      <div className="empty-state"><strong>No candidates yet</strong><p>Search for a file or symbol to populate the Explorer.</p></div>
    )}
  </div>
</section>;
