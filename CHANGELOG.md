# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- feat: Phase 6A Context Confidence & Adaptive Pack Support — 探索結果と Native Evidence の収束度から作業開始地点の確からしさを評価する決定論的 `ContextConfidenceEvaluator`（Zero Generative LLM）を実装
- feat: Adaptive Pack 戦略（HIGH: Fast Pack 2-4ファイル / MEDIUM: Standard Pack 4-8ファイル / LOW: Expanded Pack 8-15ファイル）を実装し、コンテキストの過不足を自動最適化（明示的 override もサポート）
- feat: MCP ツール `codeprep_discover_entry_points` に `confidence` / `suggestedPackStrategy` を追加し、`codeprep_build_context_pack` に `strategy` パラメータを追加
- feat: Desktop UI に `ConfidenceBadge` および Strategy セレクター（Auto / Fast / Standard / Expanded）を追加、ユーザーの Human Selection を最優先維持
- feat: Phase 5B 実トレース（全8タスク）を用いたオフラインシミュレーション（`scripts/simulate-phase5b-confidence.ts`）を実施し、不確実タスクにおける False HIGH 0件 (0/8, 0.0%) を実証
- feat: 外部 Consumer として Claude Code Haiku (`claude-haiku-4-5-20251001`) の第一級サポートを追加（`scripts/claude-haiku.ts` / `.mjs`、`npm run claude:haiku`、`CLAUDE.md`）
- docs: [`reports/phase-6a-context-confidence-report.md`](file:///D:/git/codeprep/reports/phase-6a-context-confidence-report.md) を生成 — 決定論的信頼度モデル、適応パック仕様、シミュレーション結果、品質ゲート通過を記録
- feat: Phase 5B Real Agent A/B Evaluation (Cost Correction & Full Run) — 評価モデルを高コストな GPT-5.6 Sol から **GPT-5.6 Luna (high reasoning effort)** へ切り替え、8 タスク（計16 trials）のプライマリ評価を完走
- docs: 従来の GPT-5.6 Sol による予備試行データを `PRELIMINARY / EXCLUDED_FROM_PRIMARY_ANALYSIS` として隔離・マークし、[`reports/phase-5b-preliminary-sol.md`](file:///D:/git/codeprep/reports/phase-5b-preliminary-sol.md) に記録
- feat: ポーリングループ（Schedule/Get-Process）を完全撤廃し、1試行完了ごとの即時ディスク永続化、4タスク中間チェックポイント算出、および Reactive Wakeup 運用へ刷新
- feat: [`reports/phase-5b-agent-evaluation.md`](file:///D:/git/codeprep/reports/phase-5b-agent-evaluation.md) を生成 — エントリポイント特定率が Baseline (62.5%) に対し CodePrep は **100% (8/8)** を達成、大規模探索タスク（TASK-01, 05, 07）で初動探索が 27〜67% 削減、品質ゲート通過率 88% (7/8) を実証
- docs: confirm order/refund workflow exists only in MCP synthetic fixtures; no production settlement service found
- test: cover DocGraphClient fallback when the external docgraph command is unavailable
- docs: MCP Context Pack の tokenLimit 既定値 40000 と最小値 1000 を実装仕様に同期して明記
- feat: `ContextBudget` にシステムトークン用の予約枠を追加し、推定トークンとの合計で予算内判定を行うよう対応
- test: candidate supportScore がカテゴリ上限到達時に maxCategoryScore で打ち止めになる境界テストを追加
- feat: MCP Tool Surface & External Agent Integration (Phase 5A) を実装 — Claude / Coding Agent / 外部 MCP Client から CodePrep の候補探索・Native Evidence・Context Pack パイプラインを利用可能な stdio transport MCP サーバー（`@modelcontextprotocol/sdk`）を構築
- feat: `codeprep_workspace_status` ツールを実装 — Workspace バインド状態、Repository / Knowledge / Semantic 各インデックスの準備状態（ready/missing/degraded/error）および診断情報を取得
- feat: `codeprep_discover_entry_points` ツールを実装 — タスク指示文からの決定論的・セマンティック候補探索および Native Structural Evidence（依存関係・テスト・共変更など）が付与された候補一覧を提供（Embedding未接続時は degraded 診断を付与し deterministic 継続）
- feat: `codeprep_build_context_pack` ツールを実装 — Caller / Human が選択した Entry Points を明示入力として受け取り、トークン予算有界な Context Pack（Manifest + フォーマット済みコード）を生成
- feat: Path Security（ディレクトリ脱出防止・絶対パス拒絶・`fs.realpath` による symlink/junction 実体境界検証）および Read-Only 実行境界を徹底
- feat: Production Launch Bundle (`npm run mcp:build` / `dist-mcp/index.js`) を整備し、JSON-RPC プロトコルへの余分な出力ゼロ（0 byte stdout contamination）を実証
- fix: Windows 環境において `RipgrepClient` が stdin 入力待ちでハングする現象を防止するため、`spawn` オプションに `stdio: ['ignore', 'pipe', 'pipe']` を明示指定
- feat: `docs/mcp.md` ドキュメントを追加し、Claude Desktop や MCP クライアントとの接続設定・Tool 仕様・Production Launch コマンドを解説
- feat: `npm run mcp`, `npm run mcp:build`, `npm run mcp:test` スクリプトを追加
- feat: Native Context Evidence & Candidate Quality (Phase 4) を実装 — 外部 CLI 依存（RepoScout/WSL）を排し、CodePrep 内部の構造情報（Dependency, Related Test, Git Co-change, Directory Proximity, Markdown Link, Symbol Support）を用いて「なぜこの Candidate を見るべきか」の客観的 Evidence を付与
- feat: `CandidateEvidence` / `CandidateEvidenceBundle` / `EnrichedEntryPointCandidate` ドメインモデルおよび決定論的 `supportScore`（重みテーブル・カテゴリ別Cap・最大100点）計算ロジックを実装
- feat: `CollectCandidateEvidenceUseCase` / `EnrichEntryPointCandidatesUseCase` を実装 — Top-N 候補に対する限定深掘り、重複排除・決定論的ソート、および障害時の Graceful Degradation（スコア維持・候補温存）
- feat: `expandContextFromEvidence` による Evidence 起点の関連コンテキスト展開ヘルパーを実装し、既存 Context Pack パイプライン（Role分類・Budget管理）へ接続
- feat: Context Manifest (Markdown) 出力に `## Candidate Evidence` セクションを追加し、LLM 向けに客観的根拠を提示
- feat: CodePrep Desktop UI に `Support: X pts` バッジおよび折りたたみ可能な Structural Evidence 詳細表示を統合
- refactor: `useDesktopWorkspace.ts` (478行) を状態管理・アクション群（`workspaceState`, `workspaceDocGraph`, `workspacePresets`, `workspaceProjectActions`, `workspaceTaskActions`）にモジュール分割し、規約（150行/15行）に適合
- feat: Real Embedding Calibration & Evaluation (Phase 3C-EVAL) — 実ローカル Ollama (`nomic-embed-text`) と実 CodePrep リポジトリを用いた 20問の Golden Set による Semantic Search 評価・較正ハーネス (`npm run eval:semantic`) を実装
- feat: `EntryPointCandidateScorer` および `DiscoverEntryPointCandidatesUseCase` に `customWeights` パラメータを追加し、外部からのスコア重み動的較正に対応
- refactor: `scripts/check-standards.ts` の `git status` パースを修正し、変更ファイルの正確な規約チェックに対応
- feat: Semantic Index / Semantic Entry Point Candidate Source (Phase 3C) を実装 — Structured Knowledge Index の意味単位に Embedding を付与し、自然言語 Task からの類似度検索（Cosine Similarity）による Entry Point 候補抽出を統合
- feat: `EmbeddingVector` ドメインモデルを `Float32Array` として定義し、バリデーションおよび決定論的 Cosine Similarity 計算（次元不一致例外・ゼロベクトル対応）を実装
- feat: `HttpEmbeddingAdapter` を実装 — Production runtime 用の実 EmbeddingPort Adapter（ローカル優先・設定注入・Ollama/HTTP API 連携）
- feat: `JsonSemanticIndexStore` にて `Float32Array` ↔ `number[]` の明示的シリアライズ/デシリアライズおよび Load境界での NaN/Infinity/次元不一致の厳格バリデーションを実装
- test: Persistence round-trip（Save → Load → Search の結果同一性）および異常値拒否テストを追加
- feat: `SemanticIndexEntry` / `SemanticIndex` ドメインモデルおよび決定論的ソート・バージョン（schemaVersion=1）管理
- feat: `EmbeddingTextBuilder` を実装 — Markdown見出しパス、シンボル情報、JSDoc/コメント、コード断片を決定論的テキストへフォーマット
- feat: `BuildSemanticIndexUseCase` / `RefreshSemanticIndexUseCase` / `SemanticSearchUseCase` を実装 — Structured Knowledge の差分更新と連携した増分 Embedding 生成・セマンティック類似度検索
- feat: `SemanticEntryPointCandidateSource` を実装 — Task 類似度検索による Entry Point 候補（reason: 'semanticMatch'）の生成とファイル単位集約（max score）
- feat: CodePrep Desktop UI に「Semantic: READY」サブステータス表示を統合し、Provider unavailable 時の Graceful Degradation（Semantic = DEGRADED かつ deterministic 継続）を実現
- test: 実 `HttpEmbeddingAdapter` とローカル HTTP サーバーを用いた 15問の Golden Set 再評価（Deterministic Only: Top5=93.3%, Recall@10=66.7% → Hybrid: Top5=100.0%, Recall@10=93.3%）を追加
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
