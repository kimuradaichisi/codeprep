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
        <OutputActions preview={props.preview} isSaving={props.isSaving} isGenerating={props.isGenerating} generateOutput={props.generateOutput} copyOutput={props.copyOutput} saveOutput={props.saveOutput} />
        <InlineNotice message={props.outputNotice} />
        <pre className="preview" style={{ flex: 1, margin: '14px 0 0' }}>{props.preview || 'Generated context will appear here.'}</pre>
      </div>
    ) : (
      <HelpContent />
    )}
  </section>
);

const OutputConfig = (props: OutputPanelProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
    <div style={{ display: 'flex', gap: '8px' }}>
      <div style={{ flex: 1 }}>
        <label className="field-label" htmlFor="output-format" style={{ margin: '2px 0 2px' }}>Format</label>
        <select id="output-format" value={props.format} onChange={event => props.setFormat(event.target.value as OutputPanelProps['format'])}>
          <option value="markdown">Markdown</option>
          <option value="xml">XML</option>
          <option value="json">JSON</option>
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <label className="field-label" htmlFor="pack-mode" style={{ margin: '2px 0 2px' }}>Pack mode</label>
        <select id="pack-mode" value={props.packMode} onChange={event => props.setPackMode(event.target.value as OutputPanelProps['packMode'])}>
          <option value="full">Full content</option>
          <option value="skeleton">Skeleton</option>
          <option value="directoryTree">Directory tree</option>
          <option value="diffOnly">Diff only</option>
          <option value="matchedSnippets">Matched snippets</option>
        </select>
      </div>
      <div style={{ width: '90px' }}>
        <label className="field-label" htmlFor="token-limit" style={{ margin: '2px 0 2px' }}>Tokens</label>
        <input id="token-limit" type="number" min="1" value={props.tokenLimit} onChange={event => props.setTokenLimit(Number(event.target.value))} />
      </div>
    </div>
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: '#9eafc8' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
        <input id="include-deps" type="checkbox" checked={props.includeDependencies} onChange={event => props.setIncludeDependencies(event.target.checked)} />
        Deps
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
        <input id="include-related-docs" type="checkbox" checked={props.includeRelatedDocs} onChange={event => props.setIncludeRelatedDocs(event.target.checked)} />
        Docs
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
        <input id="auto-optimize" type="checkbox" checked={props.autoOptimize} onChange={event => props.setAutoOptimize(event.target.checked)} />
        Auto-optimize
      </label>
    </div>
  </div>
);

const OutputActions = ({
  preview,
  isSaving,
  isGenerating,
  generateOutput,
  copyOutput,
  saveOutput,
}: Pick<OutputPanelProps, 'preview' | 'isSaving' | 'isGenerating' | 'generateOutput' | 'copyOutput' | 'saveOutput'>) => (
  <div className="button-row">
    <button type="button" className="primary-button" disabled={isGenerating} onClick={() => void generateOutput()}>
      {isGenerating ? 'Generating...' : 'Generate output'}
    </button>
    <button type="button" disabled={!preview || isGenerating} onClick={() => void copyOutput()}>Copy output</button>
    <button type="button" disabled={!preview || isSaving || isGenerating} onClick={() => void saveOutput()}>
      {isSaving ? 'Saving...' : 'Save output'}
    </button>
  </div>
);


