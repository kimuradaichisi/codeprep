import type { SearchPanelProps } from '../types';
import { InlineNotice } from './InlineNotice';

export const SearchPanel = ({ recipeKind, query, searchNotice, setRecipeKind, setQuery, analyze }: SearchPanelProps) => <div className="search-panel">
  <div><p className="eyebrow">DISCOVERY</p><h2>Search files</h2></div>
  <label className="field-label" htmlFor="search-recipe">Search recipe</label>
  <select id="search-recipe" aria-label="Search recipe" value={recipeKind} onChange={event => setRecipeKind(event.target.value as SearchPanelProps['recipeKind'])}>
    <option value="text">Text</option><option value="gitDiff">Git diff</option><option value="gitCommit">Git commit</option><option value="clipboardPaths">Clipboard paths</option><option value="extension">Extension</option><option value="directory">Directory</option>
  </select>
  {needsInput(recipeKind) && <div className="search-row"><input aria-label="Query" value={query} placeholder={placeholder(recipeKind)} onChange={event => setQuery(event.target.value)} /><button className="primary-button" disabled={!query.trim()} onClick={() => void analyze()}>Analyze</button></div>}
  {!needsInput(recipeKind) && <div className="button-row"><button className="primary-button" onClick={() => void analyze()}>Analyze</button></div>}
  <InlineNotice message={searchNotice} />
</div>;

const needsInput = (kind: SearchPanelProps['recipeKind']): boolean =>
  kind !== 'gitDiff' && kind !== 'clipboardPaths';

const placeholder = (kind: SearchPanelProps['recipeKind']): string =>
  kind === 'extension' ? '.ts, .tsx' : kind === 'directory' ? 'src/features' : kind === 'gitCommit' ? 'HEAD~1' : 'e.g. authentication';
