import { useEffect, useRef, useState } from 'react';
import { nodeCheckState } from '../model/candidateTree';
import type { CandidateTreeNode as TreeNode } from '../model/candidateTree';
import type { CandidateTreeProps } from '../types';

export const CandidateTreeNode = ({ node, selectedKeys, toggleTreeNode, depth = 0 }: Readonly<{
  node: TreeNode; selectedKeys: readonly string[]; toggleTreeNode: CandidateTreeProps['toggleTreeNode']; depth?: number;
}>) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const checkbox = useRef<HTMLInputElement>(null);
  const state = nodeCheckState(node, selectedKeys);
  useEffect(() => { if (checkbox.current) checkbox.current.indeterminate = state === 'mixed'; }, [state]);
  return <li className={`tree-node tree-${node.kind}`} style={{ paddingLeft: depth * 14 }}>
    <div className="tree-row">{node.children.length > 0 && <button className="icon-button" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`} onClick={() => setExpanded(value => !value)}>{expanded ? '⌄' : '›'}</button>}
      <input ref={checkbox} type="checkbox" aria-label={`Include ${node.candidateKey?.split(':').slice(1).join(':') ?? node.name}`} checked={state === 'checked'} onChange={() => toggleTreeNode(node, node.id)} />
      <span className="tree-icon">{node.kind === 'file' ? '·' : '▾'}</span><span className="tree-name">{node.name}</span>
    </div>
    {expanded && node.children.length > 0 && <ul>{node.children.map(child => <CandidateTreeNode key={child.id} node={child} selectedKeys={selectedKeys} toggleTreeNode={toggleTreeNode} depth={depth + 1} />)}</ul>}
  </li>;
};
