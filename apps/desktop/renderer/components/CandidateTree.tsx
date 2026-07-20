import type { ChangeEvent } from 'react';
import type { AnalyzedCandidate } from '../../../../src/features/desktop-core/application/ports';
import { isPackMode } from '../../../../src/features/desktop-core/domain/PackMode';
import type { CandidateTreeProps } from '../types';
import type { CandidateTreeNode as TreeNode } from '../model/candidateTree';
import { budgetSummary, candidateKey, selectedTokenTotal } from '../model/tokenBudget';
import { CandidateTreeNode } from './CandidateTreeNode';

const validLimit = (limit: number): number => Number.isFinite(limit) && limit > 0 ? limit : 1;
const validSelected = (selected: number, limit: number): number => Math.min(Math.max(Number.isFinite(selected) && selected > 0 ? selected : 0, 0), limit);
const packMode = (value: string) => isPackMode(value) ? value : undefined;

const BudgetBar = ({ candidates, selectedKeys, tokenLimit }: Pick<CandidateTreeProps, 'candidates' | 'selectedKeys' | 'tokenLimit'>) => {
  const selected = selectedTokenTotal(candidates ?? [], selectedKeys);
  const summary = budgetSummary(selected, tokenLimit);
  const max = validLimit(tokenLimit);
  const now = validSelected(selected, max);
  return <div className="budget-bar" role="progressbar" aria-label={`Selected token budget: ${summary.label}`} aria-valuemin={0} aria-valuemax={max} aria-valuenow={now} aria-valuetext={summary.over ? `${summary.label} (over budget)` : summary.label}>
    <div className={`budget-bar-fill${summary.over ? ' over' : ''}`} style={{ width: `${summary.ratio * 100}%` }} />
  </div>;
};

const SortHeader = ({ sortKey, setSortKey }: Pick<CandidateTreeProps, 'sortKey' | 'setSortKey'>) => {
  const button = (label: string, value: CandidateTreeProps['sortKey'], className: string) => <button className={`tree-sortable ${className}${sortKey === value ? ' active' : ''}`} type="button" aria-pressed={sortKey === value} onClick={() => setSortKey(value)}>{label}</button>;
  return <div className="tree-header-row">{button('Name', 'name', 'tree-header-name')}{button('Size', 'size', 'tree-header-size')}{button('Tokens', 'size', 'tree-header-tokens')}<span className="tree-header-mode">Mode</span></div>;
};

const candidateRowData = (candidate: AnalyzedCandidate, favorites: readonly string[]) => {
  const key = candidateKey(candidate.projectId, candidate.relativePath);
  return { key, isDep: candidate.reasons.includes('dependency'), isDocGraph: candidate.reasons.includes('docgraph'), isFav: favorites.includes(key), size: candidate.size === undefined ? '-' : candidate.size < 1024 ? `${candidate.size} B` : `${(candidate.size / 1024).toFixed(1)} KB`, tokens: candidate.size === undefined ? '-' : `${Math.ceil(candidate.size / 4)}`, tooltip: candidate.reasons.includes('docgraph') ? `DocGraph 関連度: ${Math.round(candidate.score * 100)}%` : undefined };
};

const fallbackNode = (candidate: AnalyzedCandidate, key: string): TreeNode => ({
  id: key, kind: 'file', name: candidate.relativePath.split(/[\\/]/).at(-1) ?? candidate.relativePath,
  candidateKey: key, children: [], size: candidate.size, packMode: candidate.packMode,
  reasons: candidate.reasons, score: candidate.score,
  recommendationReasons: candidate.recommendationReasons,
});

const CandidateRow = ({ candidate, selectedKeys, favorites, toggleTreeNode, viewFile, setFilePackMode, toggleFavorite }: Readonly<{
  candidate: AnalyzedCandidate; selectedKeys: readonly string[]; favorites: readonly string[]; toggleTreeNode: CandidateTreeProps['toggleTreeNode']; viewFile: CandidateTreeProps['viewFile']; setFilePackMode: CandidateTreeProps['setFilePackMode']; toggleFavorite: CandidateTreeProps['toggleFavorite'];
}>) => {
  const { key, isDep, isDocGraph, isFav, size, tokens, tooltip } = candidateRowData(candidate, favorites);
  const recommendationText = candidate.recommendationReasons?.map(reason => `${reason.source} ${Math.round(reason.score * 100)}%`).join(', ');
  const changeMode = (event: ChangeEvent<HTMLSelectElement>) => setFilePackMode(candidate.projectId, candidate.relativePath, packMode(event.target.value));
  return <li><div className={`tree-row${isDep ? ' suggested-dep' : ''}${isDocGraph ? ' suggested-docgraph' : ''}`}><div className="tree-node-info">
    <input type="checkbox" aria-label={`Include ${candidate.relativePath}`} checked={selectedKeys.includes(key)} onChange={() => toggleTreeNode(fallbackNode(candidate, key), key)} />
    <span className="tree-name" onDoubleClick={() => viewFile(candidate.projectId, candidate.relativePath)} style={{ cursor: 'pointer', userSelect: 'none' }}>{candidate.relativePath}</span>
    <button className={`fav-btn ${isFav ? 'active' : ''}`} type="button" aria-label={`${isFav ? 'Remove' : 'Add'} favorite ${candidate.relativePath}`} onClick={() => toggleFavorite(candidate.projectId, candidate.relativePath)} title="Favorite" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '11px', lineHeight: 1 }}>{isFav ? '★' : '☆'}</button>
    {isDep && <span className="dep-badge">Suggested</span>}{isDocGraph && <span className="dep-badge docgraph-badge" title={tooltip}>Related</span>}{recommendationText && <span className="dep-badge recommendation-badge" title={recommendationText}>Recommended</span>}
  </div><span className="tree-node-size">{size}</span><span className="tree-node-tokens">{tokens}</span><div className="tree-node-mode"><select value={candidate.packMode ?? ''} onChange={changeMode} aria-label={`Pack mode for ${candidate.relativePath}`}><option value="">Global</option><option value="full">Full</option><option value="skeleton">Skeleton</option></select></div></div></li>;
};

const TreeContent = ({ tree, candidates, selectedKeys, favorites, toggleTreeNode, viewFile, setFilePackMode, toggleFavorite }: Pick<CandidateTreeProps, 'tree' | 'candidates' | 'selectedKeys' | 'favorites' | 'toggleTreeNode' | 'viewFile' | 'setFilePackMode' | 'toggleFavorite'>) => {
  if (tree.length) return <ul className="tree-root">{tree.map(node => <CandidateTreeNode key={node.id} node={node} selectedKeys={selectedKeys} favorites={favorites} toggleTreeNode={toggleTreeNode} viewFile={viewFile} setFilePackMode={setFilePackMode} toggleFavorite={toggleFavorite} />)}</ul>;
  if (candidates?.length) return <ul className="tree-root">{candidates.map(candidate => <CandidateRow key={candidateKey(candidate.projectId, candidate.relativePath)} candidate={candidate} selectedKeys={selectedKeys} favorites={favorites} toggleTreeNode={toggleTreeNode} viewFile={viewFile} setFilePackMode={setFilePackMode} toggleFavorite={toggleFavorite} />)}</ul>;
  return <div className="empty-state"><strong>No candidates yet</strong><p>Search for a file or symbol to populate the Explorer.</p></div>;
};

export const CandidateTree = ({ tree, candidates = [], selectedKeys, tokenLimit, sortKey, setSortKey, favorites = [], favoritesOnly, toggleTreeNode, selectAll, clearAll, viewFile, setFilePackMode, setFavoritesOnly, toggleFavorite }: CandidateTreeProps) => {
  const summary = budgetSummary(selectedTokenTotal(candidates, selectedKeys), tokenLimit);
  const hasCandidates = tree.length > 0 || candidates.length > 0;
  return <section className="candidate-tree">
    <div className="pane-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div><p className="eyebrow" style={{ margin: 0 }}>REVIEW</p><h2 style={{ fontSize: '16px', margin: 0 }}>Candidates</h2></div>{(hasCandidates || favoritesOnly) && <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ffb700', cursor: 'pointer', userSelect: 'none' }}><input type="checkbox" checked={favoritesOnly} onChange={event => setFavoritesOnly(event.target.checked)} style={{ width: 'auto', margin: 0 }} />Favorites only</label>}</div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><button onClick={selectAll} style={{ background: 'none', border: 'none', color: '#76a9ff', cursor: 'pointer', padding: '2px 4px', fontSize: '11px' }}>Select All</button><span style={{ color: '#354255' }}>|</span><button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#ff7676', cursor: 'pointer', padding: '2px 4px', fontSize: '11px' }}>Clear All</button><span className="count" style={{ marginLeft: '6px', fontSize: '11px' }}>{selectedKeys.length} files</span><span className={`token-summary${summary.over ? ' over' : ''}`} aria-live="polite">{summary.over ? '⚠ ' : ''}{summary.label}</span></div>
    </div>
    {hasCandidates && <SortHeader sortKey={sortKey} setSortKey={setSortKey} />}
    {candidates.length > 0 && <BudgetBar candidates={candidates} selectedKeys={selectedKeys} tokenLimit={tokenLimit} />}
    <div className="tree-scroll"><TreeContent tree={tree} candidates={candidates} selectedKeys={selectedKeys} favorites={favorites} toggleTreeNode={toggleTreeNode} viewFile={viewFile} setFilePackMode={setFilePackMode} toggleFavorite={toggleFavorite} /></div>
  </section>;
};
