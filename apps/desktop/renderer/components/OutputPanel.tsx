import type { OutputPanelProps } from '../types';
import { InlineNotice } from './InlineNotice';

export const OutputPanel = ({ format, preview, outputNotice, setFormat, generateOutput, copyOutput }: OutputPanelProps) => <section>
  <div className="pane-heading"><div><p className="eyebrow">CONTEXT</p><h2>Output preview</h2></div></div>
  <label className="field-label" htmlFor="output-format">Format</label>
  <select id="output-format" value={format} onChange={event => setFormat(event.target.value as OutputPanelProps['format'])}><option value="markdown">Markdown</option><option value="xml">XML</option><option value="json">JSON</option></select>
  <div className="button-row"><button className="primary-button" onClick={() => void generateOutput()}>Generate output</button><button disabled={!preview} onClick={() => void copyOutput()}>Copy output</button></div>
  <InlineNotice message={outputNotice} /><pre className="preview">{preview || 'Generated context will appear here.'}</pre>
</section>;
