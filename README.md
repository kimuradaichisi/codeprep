# 📦 CodePrep for VSCode

**CodePrep** は、ワークスペース内のコードベースを効率的に抽出し、ChatGPT、Claude、GitHub Copilot などの LLM（大規模言語モデル）に渡すための最適なコンテキスト（プロンプト）を生成する強力なVSCode拡張機能です。

ファイルツリーからの直感的な選択だけでなく、**AI 生成コードの安全な自動適用（Patch & Heal）**や、Gitの変更履歴からの自動選択など、開発者のワークフローに完全に溶け込むように設計されています。

## ✨ Key Features (主な機能)

- 🌳 **直感的なツリー選択**: 専用サイドバーからファイル/フォルダをチェックボックスで選択。
- 🩹 **Autonomous Patch & Heal**: AI が生成した（一部が省略された）コードをクリップボードから読み取り、既存コードとインテリジェントにマージ。VSCode の Diff エディタで確認しながら安全に適用できます。
- 🔍 **Git Diff セレクション**: 変更されたファイルと、それに関連するテストファイルをワンクリックで抽出。
 - 📁 **ディレクトリのみ選択**: ファイル一覧から親ディレクトリのみを抽出して選択できます（プロジェクト構成を要約するときに便利です）。
- 📊 **トークン数リアルタイム計算**: 選択ファイルの推定トークン数をステータスバーに表示し、上限超過を警告。
- 📝 **選べる出力フォーマット**: `Markdown` (デフォルト), `XML`, `JSON` に対応。
- 🤖 **カスタムプロンプト & 自動注入**: 「Code Review」「Refactor」などの指示を管理。また、パッチを当てやすい形式で回答させる指示をプロンプトに自動付与できます。
- 🌐 **DocGraph 関連提案 (Desktop 限定)**: 設計書（Markdown）等を選択した際、プロジェクト内の DocGraph ナレッジグラフ（`.docgraph/graph.db`）を元に、関連ドキュメントを `Related` バッジ（緑色）とともに自動的に Suggested 候補として提案します。
- 🌍 **多言語対応 (i18n)**: UI は日本語と英語の両方に完全対応。

## 🚀 Usage (使い方)

### Desktop MVP

Electron desktop MVP requires [ripgrep (`rg`)](https://github.com/BurntSushi/ripgrep) to be installed and available on `PATH`. Run `npm run desktop:dev` to build and start the desktop application.

#### Desktop 版の配布

Windows 用の Desktop exe は GitHub Releases から配布します。Desktop 版のリリースには `desktop-v*` タグを使用します。

```powershell
git tag desktop-v0.8.7
git push origin desktop-v0.8.7
```

ローカルで exe を作成する場合は `npm run desktop:package` を実行してください。`npm run desktop:build` はアプリのバンドルのみを更新し、exe は作成しません。生成物は `dist-desktop/CodePrepDesktop.exe` です。

VSIX の既存リリースには `v*` タグを使用していましたが、今後の VSIX 更新は予定していません。

#### 🌐 DocGraph 連携 (Desktop 限定)

Desktop アプリで右ペインの `Include related docs (DocGraph)` を有効にすると、設計書ファイル（`.md`）を選択した際に関連ドキュメントが自動的に Suggested としてツリーに追加されます。
`docgraph` 実行ファイルのパスは、以下の順序で自動解決されます：
1. 環境変数 `CODEPREP_DOCGRAPH_PATH`
2. アプリの実行バイナリと同ディレクトリの `docgraph.exe`（または `docgraph`）
3. システム環境変数 `PATH` の `docgraph`

**プロンプト生成フロー:**
1. アクティビティバーから **CodePrep** アイコンをクリックします。
2. ツリービューでLLMに渡したいファイルにチェックを入れます。
3. `Select Prompt` アイコンから、追加の指示（例: "Patch Mode"）を選択します。
4. `Generate & Copy` ボタンを実行すると、内容がクリップボードにコピーされ、エディタで開かれます。

**パッチ適用フロー (AI 回答の反映):**
1. AI が出力した1つ、または複数のコードブロック（パス指定と `// ... existing code ...` を含む Markdown）をまとめてコピーします。
2. CodePrep ツリー右上の **「＋（プラス）」アイコン (Preview Patch from Clipboard)** をクリックします。
3. 検出されたすべてのファイルの Diff エディタが独立したタブで開くので、内容を確認して右上の **「反映（Apply）」** ボタンを押して完了です。

## ⚙️ Extension Settings (設定項目)

### 🩹 パッチ & ヒーリング設定
| 設定キー                              | デフォルト値 | 説明                                                                         |
| ------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| `codeprep.alwaysAddPatchInstructions` | `true`       | プロンプト生成時、常にパッチ適用用のフォーマット指示を末尾に自動付与します。 |

### 🎨 UI & 出力設定
| 設定キー                     | デフォルト値 | 説明                                                           |
| ---------------------------- | ------------ | -------------------------------------------------------------- |
| `codeprep.outputFormat`      | `"markdown"` | 出力形式。`"markdown"`, `"xml"`, `"json"`                      |
| `codeprep.openAfterGenerate` | `true`       | 生成完了後に、内容を新しいエディタで開きます。                 |
| `codeprep.visibleButtons`    | `[...]`      | ツリービュー上部に表示するアイコンボタンをカスタマイズします。 |

## ⌨️ Commands (コマンド一覧)

- `CodePrep: Preview Patch from Clipboard` - クリップボードの内容を解析してパッチをプレビュー
- `CodePrep: Apply Patch` - プレビュー中の変更をファイルに反映
- `CodePrep: Open Settings` - 設定画面を開く
- `CodePrep: Select All` / `Clear All` - すべて選択 / クリア
- `CodePrep: Select Prompt` - 挿入するカスタムプロンプトの選択
- `CodePrep: Generate & Copy` - パックを生成し、クリップボードコピーとエディタ展開を行う

---

## 🆕 What's New (最新の更新)

ご要望いただいた追加機能の概要と、Gitコミットメッセージをまとめました。

---

## 🏗️ Architecture & Development Standards (開発者向け)

本プロジェクトは、厳格な **DDD（ドメイン駆動設計）** と **「God-Class Killer」ポリシー** に基づいて構築されています。
詳細はリポジトリ内の `AGENTS.md` をご参照ください。

## 🤖 AI-assisted Development

This project was developed primarily with AI coding assistance.

Most of the implementation was generated with AI tools, then reviewed, adjusted, and tested by the maintainer before publication. The project is provided as-is, without warranty. Please review the code, behavior, and license compatibility carefully before using it in production environments.

日本語: 本プロジェクトは主にAIコーディング支援を用いて開発されました。実装の多くはAIにより生成され、メンテナーが確認・修正・テストを行っています。利用は自己責任でお願いします。

## 🙏 Acknowledgements

CodePrep is inspired by the general idea of preparing repository context for LLMs, as popularized by tools such as Repomix. CodePrep is an independent project and is not affiliated with Repomix.

## ⚠️ Safety

CodePrep does not send your source code to external AI services by itself. Generated context is copied to your clipboard or opened locally in VSCode. If you paste that content into a browser-based AI tool, the handling of that content is governed by the AI service you choose to use.

AI-generated patches are not applied silently. CodePrep previews detected changes in VSCode diff editors before they are applied. Please review all generated content and code changes carefully before applying them.

## 📜 Disclaimer

AI-generated code may be incorrect, incomplete, insecure, or incompatible with your project. CodePrep provides context generation, patch parsing, confidence hints, and diff previews, but it does not guarantee correctness or safety of AI-generated changes. You are responsible for reviewing and validating all changes before applying them.

