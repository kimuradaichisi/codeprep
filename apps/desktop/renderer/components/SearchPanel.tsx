import type { SearchPanelProps } from '../types';
import { InlineNotice } from './InlineNotice';

export const SearchPanel = (props: SearchPanelProps) => (
  <div className="search-panel">
    <div><p className="eyebrow">DISCOVERY</p><h2>Search files</h2></div>
    <label className="field-label" htmlFor="search-recipe">Search recipe</label>
    <RecipeSelect recipeKind={props.recipeKind} setRecipeKind={props.setRecipeKind} />
    <SearchInputArea {...props} />
    <InlineNotice message={props.searchNotice} />
  </div>
);

const RecipeSelect = ({ recipeKind, setRecipeKind }: Pick<SearchPanelProps, 'recipeKind' | 'setRecipeKind'>) => (
  <select id="search-recipe" aria-label="Search recipe" value={recipeKind} onChange={event => setRecipeKind(event.target.value as SearchPanelProps['recipeKind'])}>
    <option value="text">Text</option>
    <option value="gitDiff">Git diff</option>
    <option value="gitCommit">Git commit</option>
    <option value="clipboardPaths">Clipboard paths</option>
    <option value="extension">Extension</option>
    <option value="directory">Directory</option>
  </select>
);

const SearchInputArea = (props: SearchPanelProps) => {
  if (!needsInput(props.recipeKind)) {
    return <div className="button-row"><button className="primary-button" onClick={() => void props.analyze()}>Analyze</button></div>;
  }
  return (
    <div className="search-row">
      <input aria-label="Query" value={props.query} placeholder={placeholder(props.recipeKind)} onChange={event => props.setQuery(event.target.value)} />
      {props.recipeKind === 'text' && <ContextLinesInput value={props.contextLines} onChange={props.setContextLines} />}
      <button className="primary-button" disabled={!props.query.trim()} onClick={() => void props.analyze()}>Analyze</button>
    </div>
  );
};

const ContextLinesInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <input
    type="number"
    aria-label="Context lines"
    value={value}
    min={0}
    max={50}
    onChange={event => onChange(Number(event.target.value))}
    style={{ width: '60px' }}
  />
);

const needsInput = (kind: SearchPanelProps['recipeKind']): boolean =>
  kind !== 'gitDiff' && kind !== 'clipboardPaths';

const placeholder = (kind: SearchPanelProps['recipeKind']): string =>
  kind === 'extension' ? '.ts, .tsx' : kind === 'directory' ? 'src/features' : kind === 'gitCommit' ? 'HEAD~1' : 'e.g. authentication';

