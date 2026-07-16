import type { CandidateTreeProps } from '../types';
import { CandidateTreeNode } from './CandidateTreeNode';

export const CandidateTree = ({ tree, candidates = [], selectedKeys, favorites = [], favoritesOnly, toggleTreeNode, selectAll, clearAll, viewFile, setFilePackMode, setFavoritesOnly, toggleFavorite }: CandidateTreeProps) => (
  <section className="candidate-tree">
    <div className="pane-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div><p className="eyebrow" style={{ margin: 0 }}>REVIEW</p><h2 style={{ fontSize: '16px', margin: 0 }}>Candidates</h2></div>
        {(tree.length > 0 || candidates.length > 0 || favoritesOnly) && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ffb700', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={favoritesOnly} onChange={e => setFavoritesOnly(e.target.checked)} style={{ width: 'auto', margin: 0 }} />
            Favorites only
          </label>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button onClick={selectAll} style={{ background: 'none', border: 'none', color: '#76a9ff', cursor: 'pointer', padding: '2px 4px', fontSize: '11px' }}>Select All</button>
        <span style={{ color: '#354255' }}>|</span>
        <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#ff7676', cursor: 'pointer', padding: '2px 4px', fontSize: '11px' }}>Clear All</button>
        <span className="count" style={{ marginLeft: '6px', fontSize: '11px' }}>{selectedKeys.length} selected</span>
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
        <ul className="tree-root">{tree.map(node => <CandidateTreeNode key={node.id} node={node} selectedKeys={selectedKeys} favorites={favorites} toggleTreeNode={toggleTreeNode} viewFile={viewFile} setFilePackMode={setFilePackMode} toggleFavorite={toggleFavorite} />)}</ul>
    ) : candidates.length ? (
      <ul className="tree-root">{candidates.map(candidate => {
        const sizeLabel = candidate.size !== undefined ? (candidate.size < 1024 ? `${candidate.size} B` : `${(candidate.size / 1024).toFixed(1)} KB`) : '-';
        const tokensLabel = candidate.size !== undefined ? `${Math.ceil(candidate.size / 4)}` : '-';
        const isDep = candidate.reasons.includes('dependency');
        const isDocGraph = candidate.reasons.includes('docgraph');
        const isFav = favorites.includes(`${candidate.projectId}:${candidate.relativePath}`);
        const tooltipText = isDocGraph ? `DocGraph 関連度: ${Math.round(candidate.score * 100)}%` : undefined;
        return <li key={candidate.relativePath}>
          <div className={`tree-row${isDep ? ' suggested-dep' : ''}${isDocGraph ? ' suggested-docgraph' : ''}`}>
            <div className="tree-node-info">
              <input type="checkbox" aria-label={`Include ${candidate.relativePath}`} checked={selectedKeys.includes(`${candidate.projectId}:${candidate.relativePath}`)} onChange={() => undefined} />
              <span className="tree-name" onDoubleClick={() => viewFile(candidate.projectId, candidate.relativePath)} style={{ cursor: 'pointer', userSelect: 'none' }}>{candidate.relativePath}</span>
              <button
                className={`fav-btn ${isFav ? 'active' : ''}`}
                onClick={() => toggleFavorite(candidate.projectId, candidate.relativePath)}
                title="Favorite"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '11px', lineHeight: 1 }}
              >
                {isFav ? '★' : '☆'}
              </button>
              {isDep && <span className="dep-badge">Suggested</span>}
              {isDocGraph && <span className="dep-badge docgraph-badge" title={tooltipText}>Related</span>}
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
</section>
);
