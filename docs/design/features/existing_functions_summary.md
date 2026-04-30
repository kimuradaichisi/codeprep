# CodePrep: 現行機能サマリー

本ドキュメントは、CodePrep (v0.1.0) に実装されている全機能の動作仕様とUI配置をまとめたものである。

## 1. コア機能一覧

### A. ファイル選択管理 (SelectionService)
- **Select All (`codeprep.selectAll`)**:
  - **挙動**: ワークスペース内の全ファイル（`codeprep.exclude` 設定を除く）を選択状態にする。
  - **ロジック**: `vscode.workspace.findFiles` を使用。
- **Clear All (`codeprep.clearAll`)**:
  - **挙動**: 選択状態をすべて解除する。
- **Invert Selection (`codeprep.invertSelection`)**:
  - **挙動**: 現在の選択状態を反転させる。
- **Add to CodePrep (`codeprep.addToSelection`)**:
  - **挙動**: エクスプローラーのコンテキストメニューから特定のファイルを個別に追加。

### B. Git連携 (GitUtils / SelectionService)
- **Select Modified Files (`codeprep.selectGitDiff`)**:
  - **挙動**: Gitで変更がある（staged/unstaged）ファイルのみを自動選択。
  - **ロジック**: `git status --porcelain` の解析。

### C. プリセット管理 (SelectionService)
- **Save Preset (`codeprep.savePreset`)**:
  - **挙動**: 現在のファイル選択リストに名前を付けて保存。
  - **保存先**: `vscode.Memento` (WorkspaceState)。
- **Load Preset (`codeprep.loadPreset`)**:
  - **挙動**: 保存済みプリセットを読み込み、現在の選択状態を復元。
  - **バリデーション**: 読み込み時にファイルの存在確認と除外設定の再適用を実施。

### D. プロンプト管理 (PromptService)
- **Select Prompt (`codeprep.selectPrompt`)**:
  - **挙動**: `codeprep.customPrompts` 設定から事前定義されたプロンプトを選択。
  - **用途**: 生成される出力の先頭に付与される。

### E. パック生成 (CommandService / Engines)
- **Generate & Copy (`codeprep.generate`)**:
  - **挙動**: 選択されたファイルを1つのテキストにまとめ、クリップボードにコピー。
  - **エンジン**:
    - **Native**: JSによる高速な直接読み込み・結合。トークン数推定値の表示。
    - **CLI**: `npx codeprep` の呼び出し（現在はプレースホルダー）。

## 2. 現状のUI配置

| 配置場所 | コマンド | アイコン |
| :--- | :--- | :--- |
| **Explorer Tree Title** | Select All | `$(check-all)` |
| | Select Modified Files | `$(git-compare)` |
| | Select Prompt | `$(comment-discussion)` |
| | Clear All | `$(clear-all)` |
| **Tree Item (Inline)** | Generate & Copy | `$(run)` |
| **Explorer Context** | Add to CodePrep | (なし) |

## 3. 現在の設定項目 (Configuration)

- `codeprep.exclude`: 除外パターンの配列。
- `codeprep.customPrompts`: ラベルとプロンプト内容のキーバリューペア。
- `codeprep.outputFormat`: markdown, xml, json。
- `codeprep.useNativeEngine`: Nativeエンジン使用フラグ。

## 4. 課題
- 多くの機能（Save/Load Preset, Invert Selection）がタイトルバーに配置されておらず、発見性が低い。
- タイトルバーのボタン表示数制限（VSCode仕様で最大約6個）により、全機能を並べることができない。