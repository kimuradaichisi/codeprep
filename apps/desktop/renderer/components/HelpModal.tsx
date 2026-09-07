// apps/desktop/renderer/components/HelpModal.tsx
import React, { useState } from 'react';
import {
  helpOverlayStyle,
  helpModalStyle,
  helpHeaderStyle,
  helpBodyStyle,
  helpCardStyle,
  stepBadgeStyle,
} from './helpStyles';

type Tab = 'workflow' | 'semantic' | 'gitignore';

type Props = Readonly<{
  isOpen: boolean;
  onClose(): void;
  onOpenSettings?(): void;
}>;

export const HelpModal: React.FC<Props> = ({ isOpen, onClose, onOpenSettings }) => {
  const [activeTab, setActiveTab] = useState<Tab>('workflow');
  if (!isOpen) return null;

  return (
    <div style={helpOverlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={helpModalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={helpHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>❓</span>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>CodePrep Help & Guide</h3>
          </div>
          <button onClick={onClose} aria-label="Close help modal" style={{ border: 'none', background: 'transparent', color: '#999', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--vscode-widget-border, #333)', padding: '0 16px' }}>
          <TabButton active={activeTab === 'workflow'} onClick={() => setActiveTab('workflow')} label="Task Context 使い方" />
          <TabButton active={activeTab === 'semantic'} onClick={() => setActiveTab('semantic')} label="LLM (Semantic) 検索" />
          <TabButton active={activeTab === 'gitignore'} onClick={() => setActiveTab('gitignore')} label=".gitignore と機密保護" />
        </div>
        <div style={helpBodyStyle}>
          {activeTab === 'workflow' && <WorkflowHelpSection />}
          {activeTab === 'semantic' && <SemanticHelpSection onOpenSettings={onOpenSettings} onClose={onClose} />}
          {activeTab === 'gitignore' && <GitignoreHelpSection />}
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick(): void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 12px',
      fontSize: '11px',
      background: 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
      color: active ? 'var(--vscode-editor-foreground, #fff)' : 'var(--vscode-descriptionForeground, #888)',
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
    }}
  >
    {label}
  </button>
);

const WorkflowHelpSection: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <div style={{ fontSize: '11px', color: '#9eafc8' }}>
      Task Context は、指示文から最適なファイルと依存関係を抽出し、LLM（Claude Code, Cursor 等）用のプロンプトをワンクリック生成する機能です。
    </div>
    <StepRow step="1" title="タスクを入力" desc="Task Description にやりたい作業を日本語または英語で入力します。" />
    <StepRow step="2" title="Find Context をクリック" desc="Ripgrep・シンボル定義・AST解析により候補ファイル（20件）と確信度を算出します。" />
    <StepRow step="3" title="候補ファイルを確認・調整" desc="一覧のチェックボックスで対象ファイルを取捨選択します（ファイルプレビューも可能）。" />
    <StepRow step="4" title="Build & Copy Context Pack" desc="構造化パックを生成し、「Copy Pack」でクリップボードにコピーして LLM に貼り付けます。" />
  </div>
);

const StepRow: React.FC<{ step: string; title: string; desc: string }> = ({ step, title, desc }) => (
  <div style={helpCardStyle}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={stepBadgeStyle}>{step}</span>
      <strong style={{ fontSize: '12px' }}>{title}</strong>
    </div>
    <div style={{ fontSize: '11px', color: '#9eafc8', paddingLeft: '28px' }}>{desc}</div>
  </div>
);

const SemanticHelpSection: React.FC<{ onOpenSettings?(): void; onClose(): void }> = ({ onOpenSettings, onClose }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <div style={{ fontSize: '11px', color: '#9eafc8' }}>
      ローカル Embedding（Ollama）を使って、単語が直接一致しない曖昧なニュアンスもベクトル類似度で抽出できます（外部LLM送信なし・完全ローカル）。
    </div>
    <div style={helpCardStyle}>
      <strong>1. Ollama の起動とモデルダウンロード</strong>
      <code style={{ background: '#111', padding: '4px 6px', borderRadius: '3px', fontSize: '10px', color: '#4ade80' }}>
        ollama pull nomic-embed-text
      </code>
    </div>
    <div style={helpCardStyle}>
      <strong>2. Settings で接続確認</strong>
      <span style={{ fontSize: '11px', color: '#9eafc8' }}>エンドポイント（デフォルト: http://127.0.0.1:11434）を設定し Test Connection を実行します。</span>
      {onOpenSettings && (
        <button className="primary-button" onClick={() => { onClose(); onOpenSettings(); }} style={{ alignSelf: 'flex-start', padding: '2px 8px', fontSize: '10px', marginTop: '4px' }}>
          ⚙ Open Settings
        </button>
      )}
    </div>
    <div style={helpCardStyle}>
      <strong>3. Index の Refresh</strong>
      <span style={{ fontSize: '11px', color: '#9eafc8' }}>プロジェクト一覧またはヘッダーの「Refresh」を押すとベクトルインデックスが自動作成されます。</span>
    </div>
  </div>
);

const GitignoreHelpSection: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <div style={helpCardStyle}>
      <strong>🛡️ .gitignore による自動除外</strong>
      <span style={{ fontSize: '11px', color: '#9eafc8' }}>「Respect .gitignore」にチェックを入れると、リポジトリの .gitignore に記載されたビルド成果物やライブラリファイルを自動で除外します。</span>
    </div>
    <div style={helpCardStyle}>
      <strong>🔒 機密ファイルのビルトイン保護</strong>
      <span style={{ fontSize: '11px', color: '#9eafc8' }}>.gitignore の設定有無にかかわらず、.env, *.pem, *.key, id_rsa などの機密ファイルは自動除外されます（.env.example 等は保持）。</span>
    </div>
  </div>
);
