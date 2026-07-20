import type { SearchPanelProps } from '../types';
import { InlineNotice } from './InlineNotice';

export const SearchPanel = (props: SearchPanelProps) => (
  <div className="search-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
      <div><p className="eyebrow" style={{ margin: 0 }}>DISCOVERY</p><h2 style={{ fontSize: '18px', margin: 0 }}>Search files</h2></div>
    </div>
    <div className="search-controls-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1.2, minWidth: 0 }}>
        <span style={{ fontSize: '11px', color: '#9eafc8', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Preset:</span>
        <PresetSelect presetKind={props.presetKind} setPresetKind={props.setPresetKind} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '11px', color: '#9eafc8', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Recipe:</span>
        <RecipeSelect recipeKind={props.recipeKind} setRecipeKind={props.setRecipeKind} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#b7c6da', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', paddingLeft: '4px' }}>
        <input type="checkbox" checked={props.useGitignore} onChange={e => props.setUseGitignore(e.target.checked)} style={{ width: 'auto', margin: 0 }} />
        Respect gitignore
      </label>
    </div>
    <RecommendationSources recommendationSettings={props.recommendationSettings} setRecommendationSettings={props.setRecommendationSettings} />
    <SearchInputArea {...props} />
    <InlineNotice message={props.searchNotice} />
  </div>
);

const RecommendationSources = ({ recommendationSettings: settings, setRecommendationSettings: onChange }: Pick<SearchPanelProps, 'recommendationSettings' | 'setRecommendationSettings'>) => (
  <fieldset style={{ border: '1px solid #2c3747', padding: '6px 8px', margin: 0 }}>
    <legend style={{ color: '#9eafc8', fontSize: '11px', padding: '0 4px' }}>Related suggestions</legend>
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <SourceToggle label="Markdown links" checked={settings.markdownLink} onChange={value => onChange({ ...settings, markdownLink: value })} />
      <SourceToggle label="Name / heading" checked={settings.nameHeading} onChange={value => onChange({ ...settings, nameHeading: value })} />
      <SourceToggle label="Git co-change" checked={settings.gitCoChange} onChange={value => onChange({ ...settings, gitCoChange: value })} />
      <SourceToggle label="Nearby directory" checked={settings.directoryProximity} onChange={value => onChange({ ...settings, directoryProximity: value })} />
    </div>
  </fieldset>
);

const SourceToggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange(value: boolean): void }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#b7c6da', cursor: 'pointer' }}>
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} style={{ width: 'auto', margin: 0 }} />
    {label}
  </label>
);

const PresetSelect = ({ presetKind, setPresetKind }: Pick<SearchPanelProps, 'presetKind' | 'setPresetKind'>) => (
  <select id="scenario-preset" aria-label="Scenario Preset" value={presetKind} onChange={event => setPresetKind(event.target.value as SearchPanelProps['presetKind'])}>
    <option value="custom">Custom (カスタム)</option>
    <option value="initialShare">🌐 1. 0ベースの初回共有 (Initial Share)</option>
    <option value="debugFix">🐛 2. デバッグ・不具合解析 (Debug & Fix)</option>
    <option value="newFeature">🛠️ 3. 新機能の実装 (Implement Feature)</option>
  </select>
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
    return (
      <div className="button-row">
        <button className="primary-button" onClick={() => void props.analyze()}>Analyze</button>
        <button onClick={() => void props.clearSearch()} style={{ marginLeft: '8px' }}>Clear</button>
      </div>
    );
  }
  return (
    <div className="search-row">
      <input aria-label="Query" value={props.query} placeholder={placeholder(props.recipeKind)} onChange={event => props.setQuery(event.target.value)} />
      {props.recipeKind === 'text' && <ContextLinesInput value={props.contextLines} onChange={props.setContextLines} />}
      <button className="primary-button" disabled={!props.query.trim()} onClick={() => void props.analyze()}>Analyze</button>
      <button onClick={() => void props.clearSearch()} style={{ whiteSpace: 'nowrap' }}>Clear</button>
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

