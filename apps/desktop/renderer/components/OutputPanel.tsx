import type { OutputPanelProps } from '../types';
import { InlineNotice } from './InlineNotice';
import { HelpContent } from './OutputHelp';

export const OutputPanel = (props: OutputPanelProps) => (
  <section style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
    <div className="pane-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div><p className="eyebrow">CONTEXT</p><h2>Output</h2></div>
      <div className="tab-buttons" style={{ display: 'flex', gap: '4px' }}>
        <button className={props.activeTab === 'preview' ? 'active-tab' : 'inactive-tab'} onClick={() => props.setActiveTab('preview')} style={{ padding: '4px 8px', fontSize: '11px', background: props.activeTab === 'preview' ? '#2463c7' : '#202938', borderColor: props.activeTab === 'preview' ? '#3e7ddd' : '#354255' }}>Preview</button>
        <button className={props.activeTab === 'help' ? 'active-tab' : 'inactive-tab'} onClick={() => props.setActiveTab('help')} style={{ padding: '4px 8px', fontSize: '11px', background: props.activeTab === 'help' ? '#2463c7' : '#202938', borderColor: props.activeTab === 'help' ? '#3e7ddd' : '#354255' }}>Help</button>
      </div>
    </div>
    {props.activeTab === 'preview' ? (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <OutputConfig {...props} />
        <OutputActions preview={props.preview} isSaving={props.isSaving} generateOutput={props.generateOutput} copyOutput={props.copyOutput} saveOutput={props.saveOutput} />
        <InlineNotice message={props.outputNotice} />
        <pre className="preview" style={{ flex: 1, margin: '14px 0 0' }}>{props.preview || 'Generated context will appear here.'}</pre>
      </div>
    ) : (
      <HelpContent />
    )}
  </section>
);

const OutputConfig = (props: OutputPanelProps) => (
  <>
    <label className="field-label" htmlFor="output-format">Format</label>
    <select id="output-format" value={props.format} onChange={event => props.setFormat(event.target.value as OutputPanelProps['format'])}>
      <option value="markdown">Markdown</option>
      <option value="xml">XML</option>
      <option value="json">JSON</option>
    </select>
    <label className="field-label" htmlFor="pack-mode">Pack mode</label>
    <select id="pack-mode" value={props.packMode} onChange={event => props.setPackMode(event.target.value as OutputPanelProps['packMode'])}>
      <option value="full">Full content</option>
      <option value="skeleton">Skeleton</option>
      <option value="directoryTree">Directory tree</option>
      <option value="diffOnly">Diff only</option>
      <option value="matchedSnippets">Matched snippets</option>
    </select>
    <label className="field-label" htmlFor="token-limit">Token limit</label>
    <input id="token-limit" type="number" min="1" value={props.tokenLimit} onChange={event => props.setTokenLimit(Number(event.target.value))} />
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '18px 0 6px' }}>
      <input
        id="include-deps"
        type="checkbox"
        style={{ width: 'auto', margin: 0 }}
        checked={props.includeDependencies}
        onChange={event => props.setIncludeDependencies(event.target.checked)}
      />
      <label htmlFor="include-deps" style={{ color: '#9eafc8', fontSize: '12px', cursor: 'pointer' }}>
        Include dependencies
      </label>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0 6px' }}>
      <input
        id="include-related-docs"
        type="checkbox"
        style={{ width: 'auto', margin: 0 }}
        checked={props.includeRelatedDocs}
        onChange={event => props.setIncludeRelatedDocs(event.target.checked)}
      />
      <label htmlFor="include-related-docs" style={{ color: '#9eafc8', fontSize: '12px', cursor: 'pointer' }}>
        Include related docs (DocGraph)
      </label>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0 6px' }}>
      <input
        id="auto-optimize"
        type="checkbox"
        style={{ width: 'auto', margin: 0 }}
        checked={props.autoOptimize}
        onChange={event => props.setAutoOptimize(event.target.checked)}
      />
      <label htmlFor="auto-optimize" style={{ color: '#9eafc8', fontSize: '12px', cursor: 'pointer' }}>
        Auto-optimize by budget
      </label>
    </div>
  </>
);

const OutputActions = ({
  preview,
  isSaving,
  generateOutput,
  copyOutput,
  saveOutput,
}: Pick<OutputPanelProps, 'preview' | 'isSaving' | 'generateOutput' | 'copyOutput' | 'saveOutput'>) => (
  <div className="button-row">
    <button type="button" className="primary-button" onClick={() => void generateOutput()}>Generate output</button>
    <button type="button" disabled={!preview} onClick={() => void copyOutput()}>Copy output</button>
    <button type="button" disabled={!preview || isSaving} onClick={() => void saveOutput()}>
      {isSaving ? 'Saving...' : 'Save output'}
    </button>
  </div>
);


