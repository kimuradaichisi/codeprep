import type { OutputPanelProps } from '../types';
import { InlineNotice } from './InlineNotice';

export const OutputPanel = (props: OutputPanelProps) => (
  <section>
    <div className="pane-heading"><div><p className="eyebrow">CONTEXT</p><h2>Output preview</h2></div></div>
    <OutputConfig {...props} />
    <OutputActions preview={props.preview} generateOutput={props.generateOutput} copyOutput={props.copyOutput} />
    <InlineNotice message={props.outputNotice} />
    <pre className="preview">{props.preview || 'Generated context will appear here.'}</pre>
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
  generateOutput,
  copyOutput
}: Pick<OutputPanelProps, 'preview' | 'generateOutput' | 'copyOutput'>) => (
  <div className="button-row">
    <button className="primary-button" onClick={() => void generateOutput()}>Generate output</button>
    <button disabled={!preview} onClick={() => void copyOutput()}>Copy output</button>
  </div>
);

