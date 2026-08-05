export const HelpContent = () => (
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
