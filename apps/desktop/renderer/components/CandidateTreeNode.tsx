import { useEffect, useRef, useState } from 'react';
import { nodeCheckState } from '../model/candidateTree';
import type { CandidateTreeNode as TreeNode } from '../model/candidateTree';
import type { CandidateTreeProps } from '../types';

export const CandidateTreeNode = ({ node, selectedKeys, toggleTreeNode, viewFile, depth = 0 }: Readonly<{
  node: TreeNode; selectedKeys: readonly string[]; toggleTreeNode: CandidateTreeProps['toggleTreeNode']; viewFile: CandidateTreeProps['viewFile']; depth?: number;
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

  return <li className={`tree-node tree-${node.kind}`} style={{ paddingLeft: depth * 14 }}>
    <div className="tree-row">
      <div className="tree-node-info">
        {node.children.length > 0 && <button className="icon-button" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`} onClick={() => setExpanded(value => !value)}>{expanded ? '⌄' : '›'}</button>}
        <input ref={checkbox} type="checkbox" aria-label={`Include ${node.candidateKey?.split(':').slice(1).join(':') ?? node.name}`} checked={state === 'checked'} onChange={() => toggleTreeNode(node, node.id)} />
        <span className="tree-icon">{node.kind === 'file' ? '·' : '▾'}</span>
        <span className="tree-name" onDoubleClick={handleDoubleClick} style={{ cursor: node.kind === 'file' ? 'pointer' : 'default', userSelect: 'none' }}>{node.name}</span>
      </div>
      <span className="tree-node-size">{sizeLabel}</span>
      <span className="tree-node-tokens">{tokensLabel}</span>
    </div>
    {expanded && node.children.length > 0 && <ul>{node.children.map(child => <CandidateTreeNode key={child.id} node={child} selectedKeys={selectedKeys} toggleTreeNode={toggleTreeNode} viewFile={viewFile} depth={depth + 1} />)}</ul>}
  </li>;
};
