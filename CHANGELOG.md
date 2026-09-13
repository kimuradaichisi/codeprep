# Changelog

All notable changes to this project will be documented in this file.

## [0.8.12] - 2026-09-13
- feat(ir): Phase 7D-B Manual Composition / DI Wiring Analysis 実装および仕様策定（`docs/architecture/dependency-wiring-typescript.md`）
  - TypeScript リポジトリを対象に、明示的な `new` 式および Constructor Injection から依存配線関係（`BINDS_TO`, `INJECTS`）を静的解析・IR 統合する `DependencyWiringPort`（Application）および `TypeScriptWiringAdapter`（Infrastructure）を実装
  - Language Intelligence（`LanguageIntelligencePort`）と Wiring Analysis を完全分離し、動的 DI コンテナやフレームワーク依存を排除してゼロ推測・決定論的抽出を実現
  - `TypeScriptAnalysisSession` を導入し、同一セッション内で `ts.Program` / `TypeChecker` を再利用。重複ロードを回避し、Wiring 単体の全域解析時間をわずか 167ms（総合 7.0s）に最適化
  - `WiringRelationMapper` を新設し、抽出された配線事実を確信度 1.0 のエビデンス（`category: 'deterministic-ast'`, `analyzer: 'typescript-manual-composition'`）を持つ `RepositoryEdge` として IR へマッピング
  - CodePrep 自身の実コードによる統合テスト（`SelectionActionHandler.ts` における `WorkspacePathResolver BINDS_TO VSCodeWorkspacePathResolver`、`ClipboardSelectionUseCase INJECTS VSCodeWorkspacePathResolver`）および全域スモークテスト（全 138 件: `BINDS_TO` 51 件、`INJECTS` 87 件、unresolved 0 件）で動作実証
  - God-Class Killer Policy（150行/15行/複雑度5制限）を全 12 モジュールで完全遵守
- feat(ir): Phase 7D-A TypeScript Language Intelligence / Structural Relations 実装および仕様策定（`docs/architecture/language-intelligence-typescript.md`）
  - TypeScript リポジトリを対象に、構文・型定義に基づく言語構造関係（`REFERENCES`, `IMPLEMENTS`, `EXTENDS`）を決定論的に抽出・IR 統合する `LanguageIntelligencePort`（Application）およびインプロセス TypeScript Compiler API による `TypeScriptLanguageAdapter`（Infrastructure）を実装
  - 外部 LSP プロセスデーモンを排除し、Windows Native 環境での最高速・ゼロ外部プロセス依存・高信頼性を確保
  - `import` 文によるシンボル Alias（`SymbolFlags.Alias`）の再帰解決（`getAliasedSymbol`）を導入し、宣言先トップレベルシンボルへの正確な `references` 解決を実現
  - 全件走査による初期 IR 構築爆発を防ぐため、`CALLS`（Call Hierarchy）は Lazy / On-Demand クエリ候補として意図的に見送り（DEFER）を決定
  - `LanguageRelationMapper` を新設し、抽出された言語構造事実を確信度 1.0 の決定論的 AST エビデンス（`category: 'deterministic-ast'`）を持つ `RepositoryEdge` として IR へマッピング
  - CodePrep 自身の実コードによる統合テスト（`VSCodeWorkspacePathResolver IMPLEMENTS WorkspacePathResolver`, `ClipboardSelectionUseCase REFERENCES WorkspacePathResolver`）および実測スモークテスト（5ファイル・53 relations・2.1s）で動作実証
  - God-Class Killer Policy（150行/15行/複雑度5制限）を全 11 モジュールで完全遵守
- feat(ir): Phase 7C Existing Producers → Repository IR Mapping 実装および仕様策定（`docs/architecture/repository-ir-mapping.md`）
  - 既存の分析資産（`RepositoryIndex`, `StructuredKnowledgeIndex`, `DependencyScanner`, `GitCoChange`, `DocGraph`）を `RepositoryIR` グラフへ変換する In-Memory Mapper 群（`RepositoryIndexMapper`, `StructuredKnowledgeMapper`, `DependencyScannerMapper`, `DerivedRelationMapper`）を実装
  - 既存 Producer は一切変更せず、解析手法の精度・限界を忠実に `RepositoryEvidence`（`deterministic-ast`, `regex-pattern`, `git-history`, `rule-derived`）へ記録
  - 複数 Mapper を統合し一貫性のある `RepositoryIR` 集約を構築する純粋オーケストレータ `BuildRepositoryIRUseCase` を新設
  - 決定論的 Node ID（`node:<snapshot>:file:<path>`, `sym:<path>#<kind>:<name>:<line>`, `doc:<path>#L<line>`）および未解決ターゲットのノード捏造防止を保証
  - Directory Proximity の IR 除外判断（クエリ時ヒューリスティック）および SemanticIndex の直接埋め込み見送り（DEFER）方針を明文化
  - 包括的な単体・結合テスト（全 26 テスト PASS）および厳格な 150 行/15 行コード規約を完全遵守
- feat(ir): Phase 7B Repository IR Domain Model 最小実装および仕様策定（`docs/architecture/repository-ir-domain-model.md`）
  - リポジトリの構造と関係を言語非依存・タスク非依存で表現するグラフ中間表現（Repository IR）の Domain Contract を確立
  - コアエンティティ定義: `RepositoryNode`（File, Symbol, DocSection, Config, Test, EntryPoint 等）、`RepositoryEdge`（Contains, Calls, Implements, Extends, BindsTo, Injects, MayDispatchTo 等）、`RepositoryEvidence`（Provenance, Analyzer, Category, Confidence）、`RepositorySnapshot`
  - 事実情報（Fact: 観測された言語/配線構造）と導出関係（Derived: 複数事実の論理合成）を明確に分離し、`derivation.derivedFromEdgeIds` による出所追跡可能性を保証
  - LSP（Language Server Protocol）および DI（Dependency Injection / Framework wiring）を将来の Producer として統合可能な拡張受け口を整備
  - ドメイン不変条件（自己ループ禁止、同一スナップショット境界、ID一意性、確信度範囲等）の実装および包括的単体テスト（17 passed）を配備
- docs(analysis): Phase 7A 既存 Repository 分析能力の棚卸しと Self-Dogfooding 評価完了（`docs/analysis/repository-analysis-inventory.md`）
  - リポジトリ分析機能を「Repository Facts（事実情報）」「Derived Relations（導出関係）」「Task-Specific Projection（一時的射影）」の3層に体系化
  - 既存の分析・インデックス・推薦コンポーネント（Producer）19件を完全網羅した棚卸しテーブルおよび Mermaid パイプライン図を作成
  - 次期 Repository IR (Phase 7B) への再利用性評価、および欠落している構造関係（`CALLS`, `IMPLEMENTS`/`EXTENDS`, `TESTS`, `USES_CONFIG`, `READS/WRITES`）を特定
  - CodePrep CLI（`apps/cli/index.ts`）を用いた Initial Projection 評価（Self-Dogfooding）を実施し、ドキュメント・ログ汚染やキーワード抽出精度の課題、追加発見率（10%）を定量分析
- feat(cli): CLI / Make 経由の Self-Dogfooding 導入（AI エージェント向けリポジトリコンテキスト探索）
  - MCP サーバを介さずに Claude Code などの AI エージェントから CodePrep の Repository Context 機能を直接利用できる CLI Adapter（`apps/cli/`）および `npm run context` スクリプト、`Makefile` ラッパーを追加
  - 共有 Composition Factory（`RepositoryContextContainer`）を抽出し、CLI と MCP 間で同一の Application UseCase グラフ（`PrepareTaskContextUseCase`, `DiscoverEntryPointCandidatesUseCase`, `BuildTaskContextUseCase` 等）を再利用。CLI 専用の分析ロジック複製を完全排除
  - 出力契約として機械可読な JSON 形式（標準）および人間/エージェント直接閲覧用の Markdown 形式（`--format markdown`）をサポート。ログや診断メッセージはすべて `stderr` に分離し、`stdout` の純粋性を保証
  - Windows PowerShell / npm の引数解釈差異（フラグ消費）にも対応した堅牢な引数パーサーを実装
  - `CLAUDE.md` に CodePrep 自身を用いた Self-Dogfooding の利用ガイドラインを配備
- perf(selection): Clipboard Selection 高速化（Fast Path & Targeted Lookup への刷新）
  - `ClipboardSelectionUseCase` による `findFiles('**/*')` の全ファイル走査および各パスごとの総当たり走査（exact/suffix/segment match）を完全撤廃
  - `WorkspacePathResolver`（Application Port）および `VSCodeWorkspacePathResolver`（Infrastructure Adapter）を新設し、DDD境界と依存性注入（DI）を徹底
  - 明示的な相対パスおよび Windows/POSIX 絶対パスを直接存在確認（Direct Lookup）する Fast Path を実装。ドライブレターの大文字小文字差異やパストラバーサル防止にも完全対応
  - Fast Path で未解決のパス（basename / multi-segment）のみピンポイントで検索（`findFiles('**/' + candidate, exclude, 2)`）する Targeted Fallback を導入し、複数候補検出時は勝手な選択を防止
  - `WorkspaceExcludeProvider` を抽出し、`VSCodeWorkspaceRepository` との共通除外ポリシー（`DEFAULT_EXCLUDED_DIR_NAMES`, `SENSITIVE_EXCLUDED_PATTERNS`, `codeprep.exclude`, `.gitignore`）を統一

## [0.8.11] - 2026-09-09
- feat(desktop): Candidate Entry Points のアコーディオン開閉UI対応
  - `CandidateCardList.tsx`: 候補一覧ヘッダー（`CANDIDATE ENTRY POINTS (N)`）をクリックで開閉（折りたたみ/展開）可能にし、画面下部の「Build Context Pack」やプレビュー領域の視認性を劇的に向上
  - 単一カード描画責務を `CandidateCardItem.tsx` に分離し、150行/15行コード規約を厳格に遵守
  - 手動入力欄（Selected / Manual Entry Points）はアコーディオン下部に常時維持し、折りたたみ時も選択状態を素早く確認・編集可能化
- feat(desktop): Context Confidence（確信度サマリー）の日本語化・ユーザーアクション主導UIへの刷新
  - `ConfidenceSummary.tsx`: 英語の内部診断ログ（`Candidate scores are close`, `Structural support is weak` 等）を直感的な日本語タイトルと具体的なアクションガイダンス（例: 「単語一致のみで構造的根拠が弱いため、下の候補一覧から関係するファイルを直接チェックしてください」）に改善
  - Pack Strategy の選択肢説明も分かりやすい日本語（最小構成 / 標準構成 / 広め構成）に整理
  - 内部判定理由の内訳は `<details>` による折りたたみで確認可能にし、不要な画面占有を防止
- docs: Claude Code との連携公式ガイド（`docs/guides/claude-code-integration.md`）を追加
  - MCP（Model Context Protocol）による完全自動連携およびクリップボード連携の2通りの設定手順を網羅

## [0.8.10] - 2026-09-08
- feat(desktop): ノートPC向け画面レイアウト最適化 & アコーディオン・ペイン開閉機能
  - 条件入力部のアコーディオン化:
    - Search files: `SearchFormSection.tsx` を新設し、プリセット・レシピ・gitignore・検索入力エリアをワンクリックで 1 行サマリーへ折りたたみ可能にし、CandidateTree の表示高さを大幅確保
    - Task Context: `TaskContextInputArea.tsx` に折りたたみトグルを新設し、タスク目標バッジを表示しながら候補一覧（EntryPointCandidateList）の表示領域を最大化
  - 右ペイン（OutputPanel）開閉トグル（Hide / Show Output）:
    - `AppShell.tsx` ヘッダーに「▶ Hide Output / ◀ Show Output」ボタンを追加。右ペインを非表示にすることで中央ワークスペースを全幅表示でき、横幅の狭いノートPCでも快適な一覧性を実現
  - ContextPackViewer / OutputPanel のコピー操作性向上:
    - パックプレビュー領域の縦サイズをノートPC向けに拡張（min: 180px, max: 380px）
    - 上部タブ横に常時アクセス可能な「📋 Copy」ボタンを配備し、画面をスクロールせずワンクリックでコピー可能化
  - 既存全機能の完全保持:
    - 左サイドバー（Projects Drawer）、Search files（Preset / Recipe / Query / .gitignore / CandidateTree トークン予算バー・ソート・⭐お気に入り・個別 Pack mode・ファイルビューアモーダル）、Task Context、OutputPanel の全機能を 100% 維持
- feat(desktop): LLM 向け構造化プロンプトヘッダー（LLM Instructions / Context Metadata）の自動付与
  - `TaskContextPromptHeader.ts`: Task Context 出力時に、タスク目標（Goal）、適用戦略（Strategy）、主要エントリーポイント（スコア付き）、関連依存ファイル一覧、LLM 用指示文を自動前置
  - `DesktopSearchPromptHeader.ts`: 通常検索（Search files）出力時に、検索クエリ、プリセット、同梱ファイル一覧、LLM 用指示文を自動前置
- fix(desktop): Candidate Entry Points のチェックボックス幅肥大化不具合を修正
  - `desktop-base.css` の汎用 `input { width: 100% }` がチェックボックスに波及していた問題を修正し、`width: auto; min-width: 14px; flex-shrink: 0;` を明示
  - `CandidateCardList.tsx` および `EntryPointCandidateList.tsx` のチェックボックスに `width/height: 14px`, `flexShrink: 0` を適用し、ファイルパスやスコア情報が潰れずに完全に表示されるよう改善
- feat(desktop): LLM / Context 設定モーダル（SettingsModal）を新設
  - ヘッダー右上および左ツールバー最下部に「⚙ Settings」ボタンを配備
  - Embedding 設定（Ollama エンドポイント、モデル名、Embedding 次元数）および Ollama 接続テスト機能を実装（`llmSettings.ts`, `EmbeddingSection.tsx`）
  - Context パックのデフォルトトークン上限設定を集約
- feat(desktop): Task Context 画面に「Respect .gitignore」チェックボックスを追加
  - デフォルト有効（checked）として配置し、ビルド成果物や機密ファイル（`.env`, `*.key` 等）の自動除外状態を明示
- feat(desktop): アプリ内ヘルプ＆ガイドモーダル（HelpModal）を新設
  - ヘッダー右上および左ツールバーに「❓ Help」ボタンを配備
  - Task Context の 4 ステップ利用手順、ローカル LLM（Ollama）を使った Semantic 検索の始め方、.gitignore と機密保護の仕組みをタブ形式で分かりやすく解説
  - セマンティック設定から Settings モーダルへのダイレクト遷移をサポート
- feat(desktop): WorkspaceStatusHeader の操作性を向上
  - Semantic Index 未構築時に「⚙ Setup Ollama」ボタンを表示し、ワンクリックで設定可能化
  - 全インデックスを一括更新する「Sync / Refresh」ボタンをステータスバーにも配置
- docs: [`docs/guides/task-context-guide.md`](file:///D:/git/codeprep/docs/guides/task-context-guide.md) を作成
  - Task Context の概念、LLM プロンプト生成の流れ、ローカル Semantic 検索のセットアップ手順を網羅した公式ガイドを配備

## [0.8.9] - 2026-09-07
- feat: `.gitignore` 除外機能の全面対応およびデフォルト除外・機密ファイル保護の強化
  - `GitignoreMatcher`（`src/shared/filesystem/GitignoreMatcher.ts`）の実装: ディレクトリ指定（`venv/`）、ルート相対指定（`/build`）、ワイルドカード（`*`, `**`）、否定パターン（`!data/.gitkeep`）の解釈と、ディレクトリ走査時の早期プルーニング（不要サブディレクトリの再帰走査スキップ）を実現
  - 共通デフォルト除外（`DEFAULT_EXCLUDED_PATTERNS`, `DEFAULT_EXCLUDED_DIR_NAMES`）を策定: `.git`, `node_modules`, `dist`, `out`, `.next`, `build`, `.venv`, `venv`, `coverage`, `.mypy_cache`, `.pytest_cache`, `.ruff_cache`, `.turbo`, `.nuxt`, `.cache` などを自動除外
  - 機密ファイル自動除外（`SENSITIVE_EXCLUDED_PATTERNS`）の実装: `.env`, `.env.local`, `.env.production`, `.env.development`, `.env.test`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa`, `id_ed25519` を built-in で自動除外。一方で `.env.example`, `.env.sample`, `.env.template` は確実に保護・維持
  - Ignore 変更時の Index lifecycle 検証: `GitignoreIndexLifecycle.test.ts` を配備。`.gitignore` に対象ファイルが追加された場合に Repository / Structured / Semantic の 3 つすべての Index から即時除去され（特に Semantic Index に過去の embedding が残らない）、除外解除時には 3 つすべてに完全復帰することを実証
  - Parity Test（`ScannerExclusionParity.test.ts`）の追加: 同一 fixture 上で `ProjectFileTree`, `ProjectScannerClient`, `VSCodeWorkspaceRepository` の included/excluded 結果が完全一致することを検証
  - `ProjectFileTree.ts`（MCP ファイル一覧）および `ProjectScannerClient.ts`（リポジトリインデックス生成）を刷新: 探索・インデックス作成時に `.gitignore` を自動読み込みし、LLM コンテキストへのライブラリコード混入を防止
  - VSCode 拡張機能の設定項目 `codeprep.useGitignore`（デフォルト: `true`）を追加: `TreeConfigLoader.ts` および `VSCodeWorkspaceRepository.ts` を通じてツリービューおよびファイル検索除外（`DEFAULT_GLOBS` 含む）へシームレスに反映
  - 全品質ゲート（`npm run check`, `npm run desktop:test`, `npm run mcp:test`）を 100% 通過（BLOCKER = 0）
- feat: Phase 6E Project KAIROS × Sonnet Repository Exploration Compression — 外部大規模リポジトリ（`project-kairos`）において、強力なモデル（Claude Code Sonnet）を対象に CodePrep MCP の探索圧縮効果を A/B 実証
- feat: Search/Grep コールを 34 → 10（**-70.6% 削減**）、総ツールコールを 90 → 39（**-56.7% 削減**）、手動ドキュメント閲覧を 8 → 3（**-62.5% 削減**）、キャッシュトークンを 6.33M → 2.56M（**-59.5% 削減**）、総コストを $2.27 → $1.04（**-54.3% 削減・半減以下**）達成
- feat: 探索を大幅削減しながらも、Gold Facts 品質スコアが 55 点 → **70 点（+27.3% 向上）** へ伸長し、難関である Signal Check の形骸化トラップ（Gold 6）やレガシースクリプト（Gold 9）の特定を実証
- docs: [`docs/evaluations/phase-6e-kairos-sonnet-exploration.md`](file:///D:/git/codeprep/docs/evaluations/phase-6e-kairos-sonnet-exploration.md) を生成 — 全探索指標、品質スコア内訳、二重系統/MMTW/実弾手動運用の所見、H1〜H4全仮説検証結果を記録
- feat: Phase 6D Zero-LLM Fast Path & Context Delivery Optimization — Generative LLM を CodePrep 内部に追加せず（Zero-LLM 原則）、2-step MCP の Handshake 遅延および Post-pack Duplicate Read を削減する One-Shot ツール `codeprep_prepare_context` を実装

- feat: Gate 0 原因分解解析（`evaluation/agent-context/analyzeGate0.ts`）により、エージェント思考・ToolSearch に伴う Handshake 遅延（10.8s〜13.2s）と重複手動Read（2〜4件）の定量的実態を解明
- feat: `AutoPackDecision` および `PrepareTaskContextUseCase` を Clean Architecture / DDD で設計 — HIGH confidence 時は `AUTO_FAST_PACK`（完全展開済みヘッダー付与、`requiresSelection: false`）、MEDIUM/LOW 時は `MANUAL_SELECTION_REQUIRED`（候補・証拠のみ返却、`requiresSelection: true`）
- feat: ディレクトリ分散（`dirSpread > 1`）やスコア僅差を厳格に除外することで、False HIGH 0件（安全性 100%）を担保
- feat: 外部 MCP Client 向けに新ツール `codeprep_prepare_context` を公開し、既存 3 MCP ツールとの完全な下位互換性を維持
- test: `prepareContextTool.test.ts` および `McpIntegration.e2e.test.ts` を拡充、実 Agent (Haiku) による再評価 4 タスクで品質ゲート 100% 通過を実証
- docs: [`reports/phase-6d-zero-llm-fast-path-report.md`](file:///D:/git/codeprep/reports/phase-6d-zero-llm-fast-path-report.md) を生成 — Gate 0 解析、One-Shot 設計、False HIGH 安全性、Haiku 再評価結果、4層品質ゲート自己評価を記録
- feat: Phase 6C Haiku + CodePrep Context Efficiency Evaluation — 小型・低コスト外部 LLM（Claude Code Haiku: `claude-haiku-4-5-20251001`）による 6 タスク（12 トライアル）の A/B 比較評価を完走

- feat: 手動ファイル閲覧総数を 48 → 24 ファイル（**-50.0% 削減・完全半減**）、総所要時間を 892.6s → 708.5s（**-20.6% 短縮**）、総コストを $1.280 → $1.091（**-14.8% 削減**）、キャッシュ読み込みトークンを 6.99M → 4.82M（**-31.0% 削減**）達成
- feat: 複数レイヤー変更や未知語彙タスクにおいて小型モデル特有の「探索暴走（Exploration Cascade）」を CodePrep の構造化コンテキスト供給により完全に抑止し、全 12 トライアルで Quality Gate Pass 率 100% を実証
- feat: 評価ハーネス（`claudeTrialRunner.ts`, `parseClaudeTrace.ts`, `runHaikuEvaluation.ts`）を配備し、セッション完全隔離・パイプライン stdin・失敗分類分離（ENTRY_POINT_MISS / CONTEXT_GAP / MODEL_REASONING_LIMIT）を実装
- docs: [`reports/phase-6c-haiku-evaluation.md`](file:///D:/git/codeprep/reports/phase-6c-haiku-evaluation.md) を生成 — 目的、実験条件、サマリー表、カテゴリ別分析、失敗分類、LLM Residual、決定的改善機会（One-Shot Auto-Pack 等）を記録
- feat: Phase 6B Desktop Context Workflow — Task入力から候補探索・Structural Evidence・Context Confidence・Human Multi-select・Adaptive Pack生成・Manifest/Context Preview・Copyまでを一連の操作として完結する Desktop UI パイプラインを実装
- feat: Desktop と MCP で同一の Application UseCases（`BuildTaskContextUseCase`, `DiscoverEntryPointCandidatesUseCase`, `ContextConfidenceEvaluator`, `AdaptiveContextStrategy`）を共有し、UI独自探索ロジックやMCP loopbackを完全排除
- feat: Desktop UI コンポーネント群（`WorkspaceStatusHeader`, `TaskInputArea`, `ConfidenceSummary`, `CandidateCardList`, `ContextPackViewer`）を整備し、Discovery/Supportスコアの分離表示、Structural Evidenceの折りたたみ、大文字ステータスとDEGRADED警告、Ctrl+Enter誤実行防止を実装
- test: Desktop と MCP の同一結果を検証する Parity テスト（`DesktopMcpParity.test.ts`）および Task入力からCopyまでの一連操作を検証する E2E テスト（`TaskContextWorkflow.e2e.test.tsx`）を配備
- docs: [`reports/phase-6b-desktop-context-workflow-report.md`](file:///D:/git/codeprep/reports/phase-6b-desktop-context-workflow-report.md) を生成 — アーキテクチャ、UI構成、Parity検証、E2Eおよび手動UXウォークスルー観察結果を記録
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
