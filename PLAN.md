# CodePrep 開発ロードマップ & 実装プラン

本プロジェクトは「God-Class Killer」ポリシー（1ファイル150行/1メソッド15行制限）を遵守し、Feature-first DDD アーキテクチャを深化させながら、パフォーマンスとLLMコンテキストの品質を向上させます。

---

## 📅 フェーズ 1: パフォーマンス極大化 (Performance Optimization)
現在の数千ファイル規模での遅延を解消し、爆速な体験を提供します。

### 1.1 Grep 検索の ripgrep 移行
- [ ] `VSCodeSearchRepository` の実装を `vscode.executeTextSearch` (内蔵 ripgrep) に置換。
- [ ] 自前でのファイル読み込みループを廃止し、検索メモリ消費を削減。

### 1.2 Git 状態の非同期キャッシュ (GitWatcher 導入)
- [ ] `Infrastructure` 層に `GitWatcher` クラスを新設。
- [ ] `FileSystemWatcher` と連動し、Git ステータスをバックグラウンドで更新・保持。
- [ ] `UIController` / `FileTreeProvider` は `GitUtils` を直接呼ばず、このキャッシュを参照するように変更。

### 1.3 ファイルツリーの最適化
- [ ] `FileTreeProvider` の `isExcluded` ロジックを、正規表現の事前コンパイル方式に改善。
- [ ] 大規模フォルダ展開時の `fs.stat` 呼び出しを最小化。

---

## 🚀 フェーズ 2: 高度な LLM コンテキスト生成 (Advanced Features)
LLM がより理解しやすい、かつトークン効率の良い出力を実現します。

### 2.1 高精度トークンカウンター (A)
- [ ] `js-tiktoken` を導入。
- [ ] `TokenUseCase` に `gpt-4o`, `claude-3-5-sonnet` 等のモデル別計算ロジックを追加。

### 2.2 インテリジェント・プロンプト変数 (C)
- [ ] `PromptTemplate` に変数埋め込み機能（`{{language}}`, `{{datetime}}`, `{{tree}}`）を実装。
- [ ] `Application` 層に `PromptProcessor` を導入し、出力直前に変数置換を実行。

### 2.3 巨大ファイル・ガード (B)
- [ ] `OutputOptions` に `maxFileSizeKB` 設定を追加。
- [ ] 指定サイズを超えるファイルは自動的に「内容を省略し、構造のみ出力」するロジックを `OutputEngine` に追加。

---

## 🧠 フェーズ 3: スマート・セレクション (Smart Selection)
必要なファイルを「探す」手間をゼロに近づけます。

### 3.1 依存関係ベースのテスト解決 (D)
- [ ] `DependencyResolver` (Domain Service) を実装。
- [ ] ソース内の `import` 文を解析し、関連する実装・テストを自動的に芋づる式に選択する機能を `SelectionUseCase` に追加。

### 3.2 プリセット共有機能
- [ ] 現在の `workspaceState` への保存に加え、`.codeprep/presets.json` としてファイル保存・チーム共有できるリポジトリを実装。

---

## 🛠️ 実装のヒント (God-Class Killer 遵守のために)

### クラス分割の指針
- **150行を超えそうな場合**: 
    - 処理ロジックを `Domain Service` (例: `PromptProcessor`) へ切り出す。
    - インフラの実装を `Strategy` パターンで分割する。
- **15行を超えそうなメソッド**:
    - 条件分岐やループ内をプライベートメソッドに抽出。
    - `pipe` 形式の記述（例: `content.strip().replace().format()`）を意識する。

### テスト戦略
- すべての新機能に対し、`__tests__` ディレクトリ内に `vitest` によるカバレッジ100%のテストを同梱すること。

