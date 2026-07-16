import { useEffect, useRef, useState } from 'react';
import { nodeCheckState } from '../model/candidateTree';
import type { CandidateTreeNode as TreeNode } from '../model/candidateTree';
import type { CandidateTreeProps } from '../types';

export const CandidateTreeNode = ({ node, selectedKeys, favorites = [], toggleTreeNode, viewFile, setFilePackMode, toggleFavorite, depth = 0 }: Readonly<{
  node: TreeNode; selectedKeys: readonly string[]; favorites?: readonly string[]; toggleTreeNode: CandidateTreeProps['toggleTreeNode']; viewFile: CandidateTreeProps['viewFile']; setFilePackMode: CandidateTreeProps['setFilePackMode']; toggleFavorite: CandidateTreeProps['toggleFavorite']; depth?: number;
}>) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const checkbox = useRef<HTMLInputElement>(null);
  const state = nodeCheckState(node, selectedKeys);
  useEffect(() => { if (checkbox.current) checkbox.current.indeterminate = state === 'mixed'; }, [state]);

  const handleDoubleClick = () => {
    if (node.kind === 'file' && node.candidateKey) {
      const [pId, ...rest] = node.candidateKey.split(':');
      viewFile(pId, rest.join(':'));
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const sizeLabel = node.size !== undefined ? formatSize(node.size) : '-';
  const tokensLabel = node.size !== undefined ? `${Math.ceil(node.size / 4)}` : '-';
  const isDep = node.reasons?.includes('dependency');

  const handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (node.candidateKey) {
      const [pId, ...rest] = node.candidateKey.split(':');
      setFilePackMode(pId, rest.join(':'), event.target.value ? event.target.value as any : undefined);
    }
  };

  const isFav = node.candidateKey ? favorites.includes(node.candidateKey) : false;

  return <li className={`tree-node tree-${node.kind}`} style={{ paddingLeft: depth * 14 }}>
    <div className={`tree-row${isDep ? ' suggested-dep' : ''}`}>
      <div className="tree-node-info">
        {node.children.length > 0 && <button className="icon-button" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`} onClick={() => setExpanded(value => !value)}>{expanded ? '⌄' : '›'}</button>}
        <input ref={checkbox} type="checkbox" aria-label={`Include ${node.candidateKey?.split(':').slice(1).join(':') ?? node.name}`} checked={state === 'checked'} onChange={() => toggleTreeNode(node, node.id)} />
        <span className="tree-icon">{node.kind === 'file' ? '·' : '▾'}</span>
        <span className="tree-name" onDoubleClick={handleDoubleClick} style={{ cursor: node.kind === 'file' ? 'pointer' : 'default', userSelect: 'none' }}>{node.name}</span>
        {node.kind === 'file' && node.candidateKey && (
          <button
            className={`fav-btn ${isFav ? 'active' : ''}`}
            onClick={() => {
              if (node.candidateKey) {
                const [pId, ...rest] = node.candidateKey.split(':');
                toggleFavorite(pId, rest.join(':'));
              }
            }}
            title="Favorite"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '11px', lineHeight: 1 }}
          >
            {isFav ? '★' : '☆'}
          </button>
        )}
        {isDep && <span className="dep-badge">Suggested</span>}
      </div>
      <span className="tree-node-size">{sizeLabel}</span>
      <span className="tree-node-tokens">{tokensLabel}</span>
      <div className="tree-node-mode">
        {node.kind === 'file' && (
          <select value={node.packMode ?? ''} onChange={handleModeChange}>
            <option value="">Global</option>
            <option value="full">Full</option>
            <option value="skeleton">Skeleton</option>
          </select>
        )}
      </div>
    </div>
    {expanded && node.children.length > 0 && <ul>{node.children.map(child => <CandidateTreeNode key={child.id} node={child} selectedKeys={selectedKeys} favorites={favorites} toggleTreeNode={toggleTreeNode} viewFile={viewFile} setFilePackMode={setFilePackMode} toggleFavorite={toggleFavorite} depth={depth + 1} />)}</ul>}
  </li>;
};
