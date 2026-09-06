# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- feat: Markdown Section / Code Symbol Index (Phase 3B) を実装 — リポジトリ内コンテンツを意味単位（Markdown 見出しセクションおよび TypeScript/JavaScript コードシンボル）へ構造化した `StructuredKnowledgeIndex` 基盤を構築
- feat: `MarkdownSectionEntry` / `CodeSymbolEntry` / `StructuredKnowledgeIndex` ドメインモデルおよび決定論的 `entryId` 生成・ソート・バージョン（schemaVersion=1）管理
- feat: `MarkdownSectionExtractor` を実装 — コードフェンス状態管理・見出しスタック追跡・root content 抽出による Markdown セクション抽出
- feat: `TypeScriptSymbolExtractor` を実装 — TypeScript Compiler API を利用した クラス・インターフェース・関数・アロー関数・メソッド・型エイリアス・列挙型・定数・JSDoc コメントの抽出
- feat: `BuildStructuredKnowledgeIndexUseCase` / `RefreshStructuredKnowledgeIndexUseCase` を実装 — Phase 3A の `RepositoryIndexChangeSet` と連携し、unchanged ファイルの再パースを完全抑止する増分更新および障害復旧
- feat: `JsonStructuredKnowledgeIndexStore` / `NodeFsKnowledgeFileReader` を実装 — Atomic Write（一時ファイル+rename）による JSON 保存
- test: 初期構築・無変更増分・1ファイル変更・1ファイル削除・ストア破損リカバリの E2E ライフサイクルテストを追加
- feat: Workspace Repository Index Foundation (Phase 3A) を実装 — Workspace 単位のリポジトリインデックス基盤、増分更新、差分変更セット（added/modified/deleted/unchanged）を構築
- feat: `RepositoryIndex` / `RepositoryIndexEntry` / `RepositoryIndexMetadata` ドメインモデルおよび決定論的ソート・バージョン（schemaVersion=1）管理
- feat: `FileKindClassifier` を追加 — code, document, config, test, other の軽量ファイル種別自動分類
- feat: `BuildRepositoryIndexUseCase` / `RefreshRepositoryIndexUseCase` / `IndexEntryComparator` を追加 — ファイル変更のみ再ハッシュ化する増分更新最適化および破損/スキーマ不一致時の安全な再構築
- feat: `JsonRepositoryIndexStore` / `NodeCryptoFingerprintClient` / `ProjectScannerClient` を実装 — AppData 領域への Atomic Write（一時ファイル+rename）による安全な保存
- feat: CodePrep Desktop UI に「Repository Index」状態表示（READY/UPDATING/DEGRADED/NOT_INDEXED、総ファイル数、Refreshボタン）を統合
- test: E2E ライフサイクルテスト（初回構築・増分更新・修正検知・追加検知・削除検知・Workspace隔離）を追加
- feat: Task-driven Context Pack Phase 2 (Entry Point Candidate Discovery) を実装 — 自然言語 Task からリポジトリ内の Entry Point 候補を決定論的・説明可能な方法で抽出し、スコアリング・ランキング付きで提示する機能を追加
- feat: `TaskSearchTermExtractor` を追加 — Task 文字列から引用符句、コード識別子、英単語、日本語（漢字・カタカナ語）を決定論的に抽出し、ストップワードを除外
- feat: Entry Point 候補ソース群（`FilenameAndPathCandidateSource`, `TextCandidateSource`, `HeadingCandidateSource`, `SymbolCandidateSource`）を実装
- feat: `DiscoverEntryPointCandidatesUseCase` を追加 — 複数ソースからの候補探索、マージ、決定論的スコアリング（完全一致・部分一致・シンボル・見出し・テキスト一致）およびランキング付け
- feat: CodePrep Desktop UI に「Find Entry Points」機能を追加 — 候補一覧（スコア・理由バッジ・相対パス）の表示、チェックボックス選択、手動入力との併用に対応
- refactor: `DesktopHandlers.ts` の責任分離を行い、`DesktopAnalysisHandlers.ts` を新規抽出して 150行/15行のコーディング規約を遵守
- refactor: `apps/desktop/testUtils/mockDesktopApi.ts` を作成し、複数テストに散らばっていた `DesktopApi` モック定義を集約共通化
- chore: 変更ファイルのみを局所検査する `lint:standards:changed` および `lint:standards:file` スクリプトを追加
- docs: インターフェース変更時の一括同期プロトコルおよびメソッド長10行セーフティマージンを開発規約・実行契約書に追加
- feat: Task-driven Context Pack (Phase 1) を実装 — 自然言語 Task と明示 Entry Point から関連ファイル群を探索し、Role分類・優先順位付けされた Context Manifest (Markdown) を生成
- feat: `ContextRole` (target, repositoryRule, test, specification, dependency, supporting) と優先順位ソート・Budget 配分モデルを定義
- feat: `BuildTaskContextUseCase` を追加 — 探索・Role分類・重複排除・決定論的ソートを行い `ContextManifest` を構築
- feat: `formatContextManifest` による LLM 向け構造化 Markdown Context Manifest 出力フォーマッタを追加
- feat: CodePrep Desktop UI に「Task Context」モードを追加 — Task / Entry Point 入力および Context Pack 解析・出力を統合
- docs: `docs` 配下の過去の設計・マイルストーン・計画書を `docs/archive/` に退避し、AIコンテキスト汚染を防止
- docs: Gemini (Antigravity Agent) 向け実行契約書 (`GEMINI_EXECUTION_CONTRACT.md`, `GEMINI_EXECUTION_WORKFLOW.md`) を策定・参照連動
- docs: タスク作業完了時の `CHANGELOG.md` 記録およびピンポイントテスト優先（開発中）＋完了時一括品質ゲートの規約化
- chore: ピンポイント単体テスト実行用スクリプト (`test:file`, `test:changed`) を `package.json` に追加
- refactor: Repository Context 関連責務を整理し、Desktop UI 固有責務と再利用可能な Repository Context 機能 (`src/features/repository-context`) に分離

## [0.8.8] - 2026-08-05
- feat: CodePrep Desktop 版に「Save output」機能を追加 — 生成されたコンテキストをローカルファイル (Markdown / XML / JSON) として安全に保存可能に対応

## [0.8.7] - 2026-07-16
- docs: Desktop Windows executable releases now use `desktop-v*` tags and are uploaded from `dist-desktop/`
- docs: VSIX releases remain in the existing `v*` tag history; no further VSIX updates are planned

## [0.8.6] - 2026-07-16
- feat: DocGraph によるドキュメント関連度分析と Suggested 提案機能を追加
- feat: 設定に `Include related docs (DocGraph)` チェックボックスを追加し、手動チェックの連動に対応
- feat: docgraph 実行バイナリのパス解決（環境変数 `CODEPREP_DOCGRAPH_PATH`、アプリ同席 `docgraph.exe`、システム PATH）に対応
- fix: `CandidateTree.tsx` のアロー関数の閉じ忘れ括弧による構文エラーを修正
- chore: TypeScript の型定義（`WorkspaceState`, `CandidateTreeNode`, `FileScorer`）のエラーをすべて解消

## [0.8.5] - 2026-05-26
- feat: クリップボード監視の停止（クリップボード監視OFF機能）を追加 — UseCase 側で通知をガードし、完全に通知を停止できる設定に対応
- fix: ファイル件数表示のズレを修正 — 実処理結果を基に表示件数を算出するように変更
- fix: `PatchUseCase` の重複実装を削除し単一実装に統合（パース/プレビュー/適用ワークフローを安定化）
- test: `PatchUseCase` のユニットテストを追加/修正し通過確認（3 tests passed）
- security: パストラバーサル脆弱性を修正（`PatchUseCase` — OWASP A01）
- security: ReDoS 脆弱性を修正（`ExcludePattern`, `SelectionActionHandler` — OWASP A03）
- security: npm 依存チェーン脆弱性を解消（`diff`, `serialize-javascript` — OWASP A06）
- chore: デバッグログ（`console.log` / `console.debug`）を削除
- chore: `any` 型を排除し型安全性を強化（`treeGenerator`, `OutputCommands`, `i18n`）
- chore: `scratch/` を `.gitignore` に追加


## [0.8.2] - 2026-05-14
- chore: Bump version to 0.8.2
- feat: Add `Generate Directory Structure` command and `codeprep.generateStructure` button
- ux: Add "Clear Prompt" option to prompt selection (clears currently selected prompt)

## [0.7.5] - 2026-05-13
- feat: Add `Select Directories Only` action to selection menu (select parent directories only)
- feat: `codeprep.hideExcludedDirectories` setting — hide excluded dirs in file tree using `codeprep.exclude` and workspace `.gitignore`
- chore: Swap `gitMenu` and `applyAllPatches` order in view title bar
- docs: i18n and README updates for the new features

## [0.7.4] - 2026-05-13
- feat: Add `codeprep.hideExcludedDirectories` setting to hide excluded directories in the file tree
- feat: `FileTreeProvider` hides directories based on `codeprep.exclude` and workspace `.gitignore` when the setting is enabled
- fix: `VSCodeWorkspaceRepository` now respects `.gitignore` when collecting workspace files (prevents `.vscode-test` from being selected)
- test: Add unit tests for `.gitignore` handling and tree hiding behavior

## [0.7.3] - (previous)
- Initial release notes placeholder

## [0.8.0] - 2026-05-13
- chore: Bump version to 0.8.0
- docs: Update CHANGELOG for 0.8.0 release
- build: Package VSIX for 0.8.0
 - feat: Full i18n (NLS) conversion for user-facing strings
 - feat: Add context-menu commands to copy file paths (`codeprep.copyPathRelative`, `codeprep.copyPathAbsolute`)
 - feat: Use icons for copy actions and show hover/tooltips instead of long titles
 - feat: File tree improvements: respect `.gitignore`, hide excluded directories, single-click to open files
 - fix: Prevent `.gitignore`-excluded folders (e.g. `.vscode-test`) from being selected
 - fix: Make i18n helper robust (lazy-load `vscode.l10n`), replace dynamic requires with static imports where needed
 - test: Update tests and ensure full unit test suite passes
 - chore: Generated `codeprep-vscode-0.8.0.vsix`

## [0.8.1] - 2026-05-13
- fix: 全ユーザー向け文字列を追加で日本語化（QuickPick、設定、コマンドタイトルなどの未翻訳箇所を補完）
- feat: 拡張子で選択 (正規表現対応) を追加 — カンマ区切りで複数の正規表現を指定可能
- feat: 右クリックメニューでのパスコピーなどの微修正とi18nキーの同期
- test: 単体テスト（Vitest）全 198 テストを確認済み
