import type { OutputPanelProps } from '../types';
import { InlineNotice } from './InlineNotice';

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
        <OutputActions preview={props.preview} generateOutput={props.generateOutput} copyOutput={props.copyOutput} />
        <InlineNotice message={props.outputNotice} />
        <pre className="preview" style={{ flex: 1, margin: '14px 0 0' }}>{props.preview || 'Generated context will appear here.'}</pre>
      </div>
    ) : (
      <HelpContent />
    )}
  </section>
);

const HelpContent = () => (
  <div className="help-scroll" style={{ flex: 1, overflow: 'auto', paddingRight: '4px' }}>
    <div className="help-section" style={{ marginBottom: '18px' }}>
      <h3 style={{ fontSize: '14px', margin: '0 0 6px', color: '#76a9ff' }}>📖 CodePrep とは？</h3>
      <p style={{ fontSize: '12px', margin: 0, lineHeight: '1.5', color: '#b7c6da' }}>
        CodePrep は、ローカルのソースコードから AI (LLM) への入力用コンテキストを、最もトークン効率良く、かつ安全に組み立ててコピペするための開発支援ツールです。
      </p>
    </div>
    <div className="help-section" style={{ marginBottom: '18px' }}>
      <h3 style={{ fontSize: '14px', margin: '0 0 6px', color: '#76a9ff' }}>🚀 基本的な使い方</h3>
      <ol style={{ fontSize: '12px', margin: 0, paddingLeft: '18px', lineHeight: '1.6', color: '#b7c6da' }}>
        <li><strong>プロジェクトを追加:</strong> 左側の「Projects」から、作業対象のフォルダを選択します。</li>
        <li><strong>ファイルを選択:</strong> 中央の「Search files」に入力して「Analyze」を実行し、AIに見せたいファイルを選びます。</li>
        <li><strong>コンテキスト生成:</strong> 右下の「Generate output」でテキストを作成し、「Copy output」でコピーしてAIに渡します。</li>
      </ol>
    </div>
    <div className="help-section" style={{ marginBottom: '18px' }}>
      <h3 style={{ fontSize: '14px', margin: '0 0 6px', color: '#76a9ff' }}>🩹 パッチ（修正）の適用方法</h3>
      <p style={{ fontSize: '12px', margin: '0 0 6px', lineHeight: '1.5', color: '#b7c6da' }}>
        AIがコードの修正案（Markdownコードブロック等）を提示した際、そのテキストをクリップボードにコピーした状態で、CodePrep で「スマートパッチをプレビュー」を実行することで、ワンクリックで安全に変更（マージ）を適用できます。
      </p>
      <ul style={{ fontSize: '12px', margin: 0, paddingLeft: '18px', lineHeight: '1.5', color: '#8ea2bd' }}>
        <li>自動マージの精度を高めるため、変更の無い部分は <code>// ... existing code ...</code> 等のコメントを用いて省略し、その前後に1〜2行の既存コード（アンカー）を含めさせてください。</li>
      </ul>
    </div>
    <div className="help-section" style={{ marginBottom: '18px' }}>
      <h3 style={{ fontSize: '14px', margin: '0 0 6px', color: '#76a9ff' }}>💡 トークンを節約するテクニック</h3>
      <ul style={{ fontSize: '12px', margin: 0, paddingLeft: '18px', lineHeight: '1.6', color: '#b7c6da' }}>
        <li><strong>Skeleton モード:</strong> クラスや関数のロジック内容を隠し、定義構造シグネチャのみを出力します。</li>
        <li><strong>インクリメンタルコピー:</strong> 前回コピーされた内容からの差分のみを出力します（VSCode版限定）。</li>
        <li><strong>依存関係の自動含め:</strong> インポート先の型・クラス定義を自動で検出してパッケージに含めます。</li>
      </ul>
    </div>
  </div>
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
  generateOutput,
  copyOutput
}: Pick<OutputPanelProps, 'preview' | 'generateOutput' | 'copyOutput'>) => (
  <div className="button-row">
    <button className="primary-button" onClick={() => void generateOutput()}>Generate output</button>
    <button disabled={!preview} onClick={() => void copyOutput()}>Copy output</button>
  </div>
);

