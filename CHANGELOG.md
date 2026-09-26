# Changelog

All notable changes to this project will be documented in this file.

## [0.8.22] - 2026-09-26
- feat(cli): Phase 7M-B Installable CLI + Agent-Native Discovery
  - **Installable CLI (npm pack / tarball 配布 & PATH からの実行)**:
    - `dist-cli/index.js`: esbuild によるスタンドアロン Node.js バンドル（minify適用により 3.5MB、起動時間 < 800ms）。
    - `package.json`: `bin: { codeprep: "./dist-cli/index.js" }`, `files` を厳選（7ファイル、tarball 2.3MB）、`engines: { node: ">=22.0.0" }`。
    - グローバルインストールおよびクリーン再インストール（uninstall -> install -> run）の成立性を検証。
  - **CWD Independence (外部リポジトリからの完全独立実行)**:
    - 外部の任意ディレクトリ（Small TS, Medium React, Non-TS Python）から `codeprep` を直接呼び出し、リポジトリ探索およびコンテキスト生成が正常に動作することを保証。
  - **Agent-Native Discovery & Root Help の強化**:
    - `codeprep --help`: AI エージェントが最初に読んだ際に直感的に進める「What CodePrep does」「Typical flow」「Discover all commands」を整備。
    - `codeprep --version`: `codeprep 0.8.22` を正式Contractとして出力。`--json` での `{ version: "0.8.22" }` 出力に対応。
    - `docs/integration/agent-bootstrap.md`: エージェント向け最小 Bootstrap 指針（3行プロンプト）および推奨実行フローを整備。
    - `docs/guides/install-cli.md`: インストール・検証・アンインストールガイドを整備。
  - **Knowledge Bootstrapping & リカバリー契約**:
    - `--strategy knowledge` 指定時にデータベースが存在しない場合、`KNOWLEDGE_MISSING` (exit code: 3) と実在するコマンドによる回復指針（`suggestedAction`）を構造化返却。
  - **パッケージ検証自動化 & 総合評価**:
    - `scripts/verify-installed-cli.ts`: npm pack 生成、tarball 検査、外部 CWD 実行、dev/installed 間の Semantic Parity 100% の自動検証ゲートを配備。
    - `scripts/evaluate-cli-distribution.ts`: 外部リポジトリ 3 種での検証、各コマンドの高速起動（平均 700〜850ms）、エージェント自己発見シミュレーション（無効コマンド 0 件で有用コンテキスト取得）を実証。

## [0.8.21] - 2026-09-26
- feat(cli): Phase 7M-A CLI Agent UX Hardening + Canonical Command Catalog
  - **CLI Taxonomy の体系化 & Canonical Command Catalog (SSoT) 導入**:
    - `CANONICAL_COMMAND_CATALOG`: 全 CLI コマンド仕様（オプション、終了コード、入出力形式、使用例、MCP対応、共有UseCase）を Single Source of Truth として定義。
    - `codeprep commands --json`: AI エージェントが実行時に利用可能なコマンド群を機械可読 JSON で自律探索可能に。
    - `codeprep commands`: 人間向けに整形されたコマンド一覧テーブルを表示。
  - **ドキュメント自動生成 & 乖離検知 (Zero Documentation Drift)**:
    - `docs/reference/cli-reference.md`: Catalog よりコマンドリファレンスおよびエージェント向け推奨フローを完全自動生成。
    - `npm run cli:docs` (生成) および `npm run cli:docs:check` (差分検証ゲート) を新設。
  - **Agent 向け入出力契約 (Agent-oriented Output Contract)**:
    - stdout: 成功結果のみ（純粋な JSON または Markdown）を出力し、進捗ログや警告の混入を厳禁化。
    - stderr: 診断・進捗（`[codeprep-cli]`）およびエラー（`[codeprep-cli:error]`）のみに完全分離。
    - 終了コードの標準化: `CLI_EXIT_CODES` (0: SUCCESS, 1: UNEXPECTED_FAILURE, 2: INVALID_ARGUMENTS, 3: KNOWLEDGE_MISSING, 4: KNOWLEDGE_STALE, 5: REPOSITORY_UNAVAILABLE, 6: ENTITY_NOT_FOUND)。
    - 構造化エラーレスポンス: JSON モード時、`{ schemaVersion: 1, ok: false, error: { code, message, suggestedAction } }` を stdout へ出力。
  - **Non-interactive / パイプライン連携 / オプション拡張**:
    - `--stdin`: 標準入力からタスク文字列を直接流し込むシェルパイプラインに対応。
    - `--quiet`: stderr の非必須ログ出力を抑制。
    - `--output`: ファイルへの直接保存に対応。
  - **CLI / MCP 100% Semantic Parity & 既存 CLI 後方互換性**:
    - `status`: MCP `codeprep_workspace_status` と同一の判定ロジックを共有。
    - `context pack`: MCP `codeprep_build_context_pack` と同一のコンテキスト生成ユースケースを共有。
    - 既存の `npm run context -- --task "..."` 呼び出しおよび各種フラグ（`--goal`, `--file`, `--symbol` 等）を `context prepare` のエイリアスとして 100% 後方互換維持。

## [0.8.20] - 2026-09-21
- feat(desktop): ウィンドウサイズ最大化・バージョン表示・重複走査根絶・Related suggestionsデフォルトOFF
  - **画面サイズへの自動フィット・ウィンドウ最大化**:
    - `main.ts`: 起動時に `window.maximize()` を実行しディスプレイ全体を有効活用。初期サイズを 1400x900、最小サイズを 1000x700 に拡大。
    - `desktop-layout.css`: 複数プロジェクト登録時に一覧が窮屈だった `.project-list` の `max-height` を 80px から 240px に拡張し、サイドバー（`.projects-drawer`）の幅も 320px に拡大。
  - **画面タイトルおよびヘッダーへのバージョン表示**:
    - ウィンドウタイトルに `CodePrep Desktop v0.8.20` を設定（OSタイトルバー）。
    - アプリ画面ヘッダー（`AppShell.tsx`）にもバージョンバッジ（`v0.8.20`）を表示し、実行中のバージョンを一目で把握可能に改善。
  - **プロジェクト走査の重複・再走査の完全根絶（files foundチラつき解消）**:
    - `saveProject`: プロジェクト追加時、既存プロジェクトの再走査を完全スキップし、新規追加プロジェクトのみを単一走査して候補一覧にマージする方式に最適化。
    - `deleteProject`: 削除時に全プロジェクトを再走査していた無駄を撤廃し、メモリ上の候補から即座にフィルタ除外。
    - `fileCandidates`: 複数プロジェクト走査時の並行 IPC 衝突を解消するため直列実行化。
  - **Related suggestions のデフォルト全チェック解除**:
    - `defaultRecommendationSettings`: `markdownLink`, `nameHeading`, `gitCoChange`, `directoryProximity` の全 4 項目をデフォルト `false`（OFF）に変更。不要な関連ファイルが自動選択されないよう改善。

## [0.8.19] - 2026-09-21
- fix(desktop): `listProjectFiles` の AbortSignal / options 参照エラー（TypeError: Cannot read properties of undefined）の解消
  - **ローカルコントローラによる `activeScanController` 競合・NULL 参照の完全防止**:
    - `DesktopHandlers.ts`: 複数プロジェクト同時走査や走査完了時にグローバル変数 `activeScanController` が `undefined` にクリアされた際、後続の `fetchFileSizes` で `activeScanController.signal` を参照して `TypeError: Cannot read properties of undefined (reading 'signal')` が発生し、ツリーが `no candidates yet` になる問題を修正。
    - 関数スコープの不変なローカル `controller` を参照する設計に改修し、確実に有効な `controller.signal` を渡すよう堅牢化。
  - **`resolveOptions` の安全化**:
    - `ProjectFileTree.ts`: `options` に `undefined` や `null` が渡された場合でも安全に `{ useGitignore: true }` を補完するようガードを追加。

## [0.8.18] - 2026-09-21
- perf(scan): Git リポジトリ走査における `git ls-files` 高速パスの実装
  - **Git リポジトリでの一括取得（ファイル走査を 0.25 秒に短縮）**:
    - `GitLsFilesScanner`: プロジェクト直下に `.git` が存在する場合、C言語レベルで高速動作する `git ls-files -c -o --exclude-standard` を利用して全ファイル一覧（Tracked＋Untracked）を一度のコマンド実行で一括取得する高速パスを新設。
    - 従来の数千回に及ぶ `readdir` およびファイルシステム探索を丸ごとスキップし、走査コストをミリ秒単位（2,860 ファイル規模でも約 0.25 秒）に圧縮。
  - **安全なオプションと環境互換性**:
    - `-c core.quotepath=false`: 日本語や特殊文字を含むファイル名がエスケープされず正常に扱えるよう設定。
    - `-c safe.directory=*`: WSL UNC（`\\wsl.localhost\...`）や別ユーザー所有リポジトリでの dubious ownership による Git エラーを回避。
  - **安全なフォールバック設計**:
    - `.git` が存在しないフォルダ、Git 未導入環境、`useGitignore: false` 設定時、またはコマンド失敗時は即座に従来のディレクトリ Walk 処理へフォールバックし、既存動作を 100% 保証。

## [0.8.17] - 2026-09-21
- perf(desktop): WSL UNC パス（ネットワークフォルダ）でのファイル走査・サイズ取得の大幅高速化
  - **`realpath` 重複呼び出しの完全撤廃（RPC 5,700回削減）**:
    - `ProjectFileContentReader`: 従来 `getProjectFileSize` で 1 ファイルあたり `realpath(rootPath)` と `realpath(path)` の計 2 回の重いネットワーク UNC RPC を実行していた（2,860 ファイルで約 5,720 回）のを撤廃。
    - 文字列境界チェック `resolveProjectFile` ＋ `stat` のみに改修し、WSL/ネットワークフォルダへの RPC を 1 ファイル 1 回の `stat` に削減。
  - **ファイルサイズ一括取得の並行度制御（Concurrency Worker Pool）**:
    - `DesktopHandlers.ts`: 従来全走査ファイルに対して `Promise.all` で一斉に RPC を発行していたのを、concurrency: 32 の制御されたワーカープール方式に刷新。Windows UNC / WSL 9P サーバーのソケット・バッファ詰まりによるタイムアウト・ハングを解消。
    - サイズ取得ループ内でも `activeScanController.signal` による即時中断（Cancel）を検知。
  - **パス計算の O(1) 連結化と再帰・シンボリックリンクガード**:
    - `ProjectFileTree.ts`: 各ファイルで `relative(context.root, full)` という重い UNC パス解析文字列処理を行っていたのを親ノードからの `${currentRel}/${entry.name}` 連結（O(1)）に最適化。
    - `entry.isSymbolicLink()` のスキップにより、無限循環や別ドライブ脱出によるハングを防止。
    - 最大深度ガード（depth > 30）およびパーミッションエラー保護（`readSafeEntries`）を導入。

## [0.8.16] - 2026-09-21
- fix(desktop): 大規模プロジェクト・WSL環境でのファイル走査最適化、進捗表示、および中断（Cancel）機能の追加
  - **不要ディレクトリの即時スキップによる走査爆発防止**:
    - `ProjectFileTree`: `node_modules` や `.git` などの `DEFAULT_EXCLUDED_DIR_NAMES` に一致するディレクトリを、相対パスマッチに頼らずディレクトリエントリ名単体で即座に O(1) スキップするよう修正。WSL / UNC パス等での相対パス不整合による `node_modules` 再帰潜入（20,000ファイル化）を根本解消。
  - **Candidate ツリー構築の O(N) Trie 高速化**:
    - `candidateTree.ts`: 階層ごとの全候補総当たり（O(N²)・1億回ループ）によりメインスレッドが完全停止・フリーズしていた問題を解決。1パスの Trie 木（Map 構造）構築アルゴリズムに刷新し、20,000 ファイルでも 30ms 程度で瞬時にツリーを描画可能に最適化。
  - **Choose ボタンのダイアログ中ローディング誤表示の修正**:
    - `ProjectPanel`: フォルダ選択ダイアログ表示中は「走査中」にせず、フォルダが実際に決定されて追加処理が開始された時のみ走査中インジケーターを表示するよう修正。
  - **走査ファイル数進捗（Progress）表示**:
    - 走査中に検出されたファイル数をリアルタイムに取得し、「プロジェクトを走査しています... (〇〇 files found)」と表示。
  - **走査中断（Cancel / Stop）機能の実装**:
    - 走査中にインジケーター内に「Cancel」ボタンを配置。ユーザーが途中で走査を中断できるよう、Renderer および Main プロセス（`AbortSignal` / `cancelScanProjectFiles` IPC）に即時中断処理を導入。
  - **デスクトップ起動時ローディング表示と二重起動防止**:
    - `index.html`: JS/React ロード前から即座に画面中央に CodePrep ロゴと「デスクトップを起動しています...」スピナーを描画するインラインスプラッシュ画面を組み込み、起動中のフィードバックを即座に提供。
    - `main.ts`: `backgroundColor: '#1e1e1e'` を設定し起動時の白いチラつきを排除。
    - `main.ts`: `app.requestSingleInstanceLock()` を導入し、起動待ち時のアイコン連打による多重起動を防止（2重目のプロセスは終了し、既存ウィンドウを自動フォアグラウンド化）。
    - `refreshProjects`: 起動時の登録プロジェクト走査中にもインジケーターを表示し、バックグラウンド読み込みを可視化。

## [0.8.15] - 2026-09-21
- perf(tree): リモートディレクトリ走査のアルゴリズム最適化およびローディングスピナー（Loading Spinner）の追加
  - **ローディングスピナー追加**:
    - `vscode.window.withProgress`（`location: { viewId: 'codeprep.fileTree' }`）により、ツリーデータ取得中に VSCode ネイティブの進行スピナー/プログレスバーを表示
    - `FileNode.createLoadingNode`: `isLoading` フラグおよび `ThemeIcon('loading~spin')` アイコンによるローディングスピナー表示をサポート
    - `treeView.message`: ロード中の状態メッセージ（「読み込み中...」）の表示と完了後の自動消去に対応
  - **アルゴリズム刷新・高速化**:
    - `DirectoryCache`: ディレクトリ走査結果のインメモリキャッシュを導入し、リモート環境での重複ファイルシステムアクセスを削減
    - **親相対パス継承による O(1) パス解決**: 子ノード構築時に親ノードの `relativePath` を直接継承することで、`path.relative` と正規化処理の多重呼び出しを完全排除
    - **不要遅延の撤廃**: 起動時および手動リフレッシュ（`codeprep.refreshTree`）時の多重 `setTimeout`（1000ms）を排除し、`refreshImmediate` による即時ロードを実現
  - **Desktop ProjectPanel ローディング化**:
    - `Add` ボタン: プロジェクト追加処理中に「`Adding...`」およびインラインスピナーを表示し、ボタンを `disabled` にして二重送信を防止
    - `Choose` ボタン: フォルダ選択〜プロジェクト追加処理中もボタンを `disabled` に制御
    - 走査インジケーター: プロジェクト登録およびファイル走査中に「プロジェクトを走査しています...」のバナーとスピナーを表示

## Phase 7L-A
- feat(context): Phase 7L-A Context Request / Context Projection Foundation 実装（`docs/architecture/context-request-projection.md`）
  - 「単一Taskのパッキングツール」から「Work Context Compiler」への拡張基盤を構築
  - **Domain 層**:
    - `ContextIntent`: 意図の宣言的定義（`change`, `review`, `understand`, `impact`, `investigate`, `document`, `test`）
    - `ContextAnchor`: 起点情報の宣言（`file`, `symbol`, `text`, `directory`, `git-diff`）
    - `ContextScope`: 探索境界の宣言（`auto`, `file`, `directory`, `feature`, `repository`）
    - `ContextRequest`: 仕事の意図と制約を包括する不変オブジェクト
    - `ContextProjection`: Intent に応じた構造化射影モデル（`RequestSummary`, `ProjectionEntry`, `ProjectionEvidence`, `ProjectionExclusion`, `ProjectionMetrics`）
  - **Application 層**:
    - `QueryInputCompiler`: `ContextRequest` を IR 検索・スコープフィルタ・バジェットオーバーライドへ安全に変換・正規化
    - `ChangeContextProjectionPolicy`: `ContextPackV2` から `ContextProjection` へのロール判定（`primary-target`, `supporting`, `test`, `doc`）、アンカー寄与追跡、スコープ外除外記録
    - `PrepareContextProjectionUseCase`: リクエストからパイプラインを実行し `projection` と `contextPackV2` を同時生成
  - **Adapters & 後方互換性**:
    - CLI (`apps/cli`): `--goal`, `--intent`, `--file`, `--symbol`, `--scope`, `--projection` をサポート。従来の `--task` は自動的に Legacy Task Request へ変換され完全互換
    - MCP (`apps/mcp`): `codeprep_prepare_context` 入力スキーマを拡張し、`projection: true` 時の `ContextProjection` 出力をサポート
    - Desktop (`apps/desktop`): `TaskContextPackV2Handler` を `PrepareContextProjectionUseCase` 経由へ移行し、`contextProjection` を追加。UI/IPC との完全互換を維持
  - **成果と検証**:
    - **Desktop / CLI / MCP Semantic Parity**: **100.0%**
    - **5 必須シナリオ（Goal only, File Anchor, Symbol Anchor, Directory Scope, Legacy task）**: 全 PASS
    - 全体テスト・品質ゲートすべて PASS

## [0.8.14] - 2026-09-20
- fix(wsl): Remote WSL および WSL UNC パスにおけるファイルツリー・パス解決の不具合修正

  - **Remote WSL URI 透過対応**: VSCode Remote WSL 接続時（`vscode-remote://` スキーム環境下）に `vscode.Uri.file` の決め打ちによりローカルファイルシステムが誤参照され、ファイルツリーが表示されない（空になる）問題を根本解消
    - `VSCodeFileSystem`: `rootUri` に基づくリモート URI 解決機構（`resolveUri`）を実装し、リモート接続環境下でも透過的なディレクトリ走査・ファイル読み書きを実現
    - `FileNode`: `uri` オプションをサポートし、リモート URI を保持することでファイルツリーのアイコン表示およびファイルオープン操作が正常に動作するよう修正
    - `FileTreeProvider`: `FileTreeOptions` を通じた `rootUri` サポートを追加し、リモート URI ベースの `RelativePattern` によるファイルシステム監視とツリーノード構築を実現
    - `VSCodeWorkspaceRepository`: `rootUri` および `vscode.workspace.asRelativePath` による確実な相対パス解決を実装
    - `VSCodeWorkspacePathResolver`: リモート URI を用いたファイル存在確認および fallback 検索に対応
  - **WSL パス相互解決・抽出強化**:
    - `pathMatchUtils`: WSL UNC パス（`//wsl$/...`, `//wsl.localhost/...`）と Linux POSIX パス（`/home/...`）の相互プレフィックス解決・照合を実装
    - `ClipboardPathExtractor` / `ClipboardSelectionUseCase`: `$` 記号や UNC パス形式（`\\wsl$\...`）に対応し、WSL パスをクリップボードから正常に検出・選択可能に改善
    - `CommandRegistry`: リモート URI の相対パス取得および `extractFsPath` を強化

## Phase 7K-A
- feat(desktop): Phase 7K-A Desktop Context Pack v2 Integration / Knowledge Strategy 統合（`docs/architecture/desktop-context-pack-v2-integration.md`）

  - 既存のコードベース探索・パッキング UX および下位互換性を完全に維持したまま、Desktop UI (`apps/desktop`) に Knowledge Graph Strategy (`strategy: 'knowledge'`) および Context Pack v2 を統合
  - **Single Source of Truth**: UI 専用の再実装を排除し、コアアプリケーション層の `createPrepareContextPackV2UseCase` を直接利用して Desktop / CLI / MCP の完全な振る舞いの一致を保証
  - **UI / Renderer 拡張**:
    - `WorkspaceStatusHeader`: Knowledge DB (v2) の稼働状態（`ready`, `missing`, `stale`, `dirty`）および警告メッセージを表示
    - `ConfidenceSummary`: パッキング戦略選択肢に `Knowledge Graph (v2)` を追加
    - `TaskContextInputArea`: Knowledge Strategy 選択時は自動探索により Entry Point 入力なしでも `Prepare Context (v2)` がワンクリックで実行可能な UX を実現
    - `ContextPackViewer`: タブ切替（`Markdown`, `Working Set`, `Code`, `JSON`）、Scope / Budget / Compression などの Metrics バー、およびマルチフォーマット（Pack, Markdown, JSON）コピーを実装
    - `ContextPackWorkingSetView` (新規): `CORE`, `SUPPORTING`, `RECALL_RESERVE` のグルーピング、スコア・トークン・粒度・選定理由・行範囲の展開表示
  - **Backend / IPC 拡張**:
    - `DesktopApi`: `DesktopPackStrategy`, `contextPackV2`, `knowledgeDbStatus`, `budget`, `explicitPaths` の型拡張
    - `TaskContextRequestParser`: `strategy: 'knowledge'` パース対応
    - `TaskContextPackV2Handler` (新規): 最新 snapshot ID 解決と v2 生成バックエンドオーケストレーション
    - `KnowledgeStatusResolver` (新規): SQLite 知識ストアと Git リビジョン照合による同期ステータス判定
  - **共通層フォーマッタ**:
    - `ContextPackV2Formatter` (新規): Context Pack v2 を Markdown および プロンプト用テキスト（行範囲・粒度明記）に構造化整形するロジックを集約し、CLI / Desktop 間で再利用
  - **検証と実測成果**:
    - **Desktop / CLI / MCP Semantic Parity**: **100.0%** （`DesktopKnowledgeParity.test.ts`）
    - **実リポジトリ Dogfooding (3 Tasks)**:
      - Task A (Narrow): Latency 1,364ms, Tokens 3,958, Compression 74.2%, Core 3
      - Task B (Cross-layer): Latency 1,541ms, Tokens 4,450, Compression 79.5%, Core 3
      - Task C (Docs+Impl): Latency 3,275ms, Tokens 6,022, Compression 62.5%, Core 4
      - 平均 Latency 2,060ms, 平均トークン 4,810 tokens, 平均選択ファイル数 8.3
    - **下位互換性**: 既存の探索・パッキング UX および全テストスイート（全 28 テストファイル、159 テスト）すべて PASS、Legacy 回帰なし（0%）
    - 品質ゲート（`npm run check`, `npm run desktop:test`, `npm run cli:test`, `npm run mcp:test`, `npm run lint:standards:changed`）すべて PASS
- feat(ir): Phase 7J-A Deterministic Query Expansion / Seed Recall Improvement 実装および Closeout 修正（`docs/architecture/deterministic-query-expansion.md`）
  - 外部 LLM / Vector DB を一切使わず、ローカルの SQLite IR 知識ストアから決定論的語彙インデックス（`RepositoryVocabularyIndex`）をメモリ上に構築・キャッシュする機構を実装
  - キャメルケース・ケバブケース・ASCII/CJK境界・拡張子除去を行う `IdentifierNormalizer`、英語屈折変化を正規化する `QueryMorphology`、2〜3トークンの連語照合を行う `PhraseMatcher` を導入
  - 語族照合（Term-Family Matching）・複合識別子展開（Compound Identifier Matching）・形態素展開をパイプライン化した `DeterministicQueryExpander` を実装し、タスク文から高精度な展開クエリ群を自動生成
  - `SeedScorer` において完全一致・前方一致・ファイル名一致・見出し一致、展開手法ボーナス、非本番減点、曖昧語ペナルティ（Ambiguity Penalty）を統合した精密スコアリングを導入
  - **Downstream Regression の解消（Closeout 修正）**:
    - **問題の特定**: Query Expansion による Subgraph Recall 向上（77.4%）の一方で、下流の Working Set Selection においてスコア 1.000 の高信頼度シード（TASK-01 の `RepositoryIndexMapper`, `StructuredKnowledgeMapper` 等）が Supporting 最低優先度（priority 7）に転落し、Supporting 枠超過で切り捨てられていた優先度逆転バグを特定
    - **モジュール粒度スコープ判定の適正化**: `AdaptiveBudgetResolver` の feature 抽出粒度を `features/<feature>/<layer>` へ細分化し、`TaskScopeClassifier` において多数の高信頼度シード（>=3）が複数モジュール（>=2）に跨る協調修正タスクが過剰に NARROW（上限5ファイル）に縮退する問題を解消
    - **シード優先度の多層保護**: `CandidateClassifier` において超高スコア（>=0.95）シードを CORE（priority 2）に昇格させ、Supporting に回るシードも priority 2.5 で dependency (3) や test (4) より上位で保護
  - Golden Set (7 Tasks) 最終実測成果：
    - **Hit@5**: 71.4% $\to$ **100.0%** (+28.6pt 向上、全タスクが Top 5 に到達)
    - **Hit@10**: 85.7% $\to$ **100.0%** (+14.3pt 向上)
    - **Subgraph Recall@10**: 61.9% $\to$ **77.4%** (+15.5pt 向上)
    - **Subgraph MRR**: 0.620 $\to$ **0.809** (+0.189 向上)
    - **TASK-01 Must-Have Recall**: 25.0% $\to$ **75.0%** (+50.0pt 大幅改善、シード・Mapper 脱落を完全解消)
    - **Context Pack Must-Have Recall**: Phase 7I-A Baseline 72.6% $\to$ **77.4%** (+4.8pt 純増、中間回帰 65.5% から完全回復)
    - **平均クエリ処理時間**: **174.6ms** (Baseline 133ms に対し 1.31倍、許容上限2倍以内)
    - **平均トークン数**: 9,828 $\to$ **4,227 tokens** (-57.0% 削減、圧縮率 71.0%)
    - **CLI / MCP Semantic Parity**: **100.0%** を完全維持
  - Holdout Set (5 Tasks) 汎化性能・Cold/Warm 計測：
    - **Cold Query Duration (初回インデックス構築込み)**: **509.5ms**
    - **Avg Warm Query Duration**: **317.3ms**
    - **Avg Seeds Recall@10**: **80.0%**
    - **Avg Subgraph Recall@10**: **80.0%**
    - **Avg Context Pack Recall**: **80.0%** (5タスク中 4タスクで 100% 達成)
    - **HOLDOUT-05 (Docs中心) 分析**: ドキュメント間の参照関係（`DOC_RELATION`）不足によりグラフ展開でドロップする課題を特定、Phase 7J-B へ DEFER
  - BLOCKER = 0, Final Verify (check, desktop:test, cli:test, mcp:test, standards:changed) PASS を確認

## [Unreleased] - Phase 7I-A
- feat(context-pack): Phase 7I-A Adaptive Working Set Budget / Context Pack Right-Sizing 実装および仕様策定（`docs/architecture/adaptive-working-set-budget.md`）
  - Task の構造的スコープ（**NARROW / STANDARD / BROAD**）と知識グラフ特徴量（主要モジュール集中度 `dominantFeatureRatio`、トップスコア、シード数など）に応じて Working Set 予算枠（ファイル数・トークン数・Recall Reserve枠）を動的に決定する `TaskScopeClassifier`、`AdaptiveBudgetPolicy`、および `AdaptiveBudgetResolver` を実装
  - 決定根拠を透明化・説明可能にする `AdaptiveBudgetDecision` DTO（`source`, `scope`, `budget`, `signals`, `reasons`）を導入し、CLI Markdown 出力および MCP 構造化レスポンス（`metrics.budgetDecision`）へ統合
  - ユーザー明示指定の最優先（`Explicit Budget Override > Adaptive Budget`）を保証し、`budget` や `tokenLimit` が指定された場合は明示値を優先しつつ、未指定時は自動的に適正枠を解決
  - スコープ連動の早期終了（**Stop Selection Early**）を `WorkingSetBudgetApplier` に実装：CORE ノード（優先度 1〜2）を確実に保護した上で、限界効用逓減（Diminishing Returns: スコア急落・低関連度ノード）を検知して不要な SUPPORTING ファイルの詰め込みを早期打ち切り
  - スコープに応じた Recall Reserve 枠の可変化（Narrow: 1, Standard: 2, Broad: 3）を導入し、上位精度と広範リコールのバランスを最適化
  - CLI / MCP Semantic Parity 100% 一致を完全維持（オラクルテスト `CliMcpParity.test.ts`）
  - Golden Set (7 Tasks) 実測において、**Must-Have Recall 72.6% $\to$ 72.6% (完全維持)** を達成しつつ、**平均ファイル数を 9.6 $\to$ 6.4 ファイル (-33.3% 削減)**、**平均トークン数を 9,828 $\to$ 6,450 トークン (-34.4% 削減)**、**圧縮率を 68.4% $\to$ 77.3% (+8.9pt 向上)** へと大幅な Right-Sizing を実現
    - NARROW (5 tasks): 平均 9.4 $\to$ 5.0 ファイル (-46.8%), Recall 76.7% 維持
    - STANDARD (1 task): 平均 10.0 $\to$ 8.0 ファイル (-20.0%), Recall 25.0% 維持
    - BROAD (1 task): 平均 10.0 $\to$ 12.0 ファイル (+20.0%), Recall 100.0% 維持
  - Agent Dogfooding (3 Tasks) において、前フェーズの課題であった **上限到達率（Pack Cap Hit Rate）100% $\to$ 67.0% への解消** を達成し、着手前閲覧ファイル数 1 ファイル、手動検索 0 回、初手編集 9.8 秒 (5.5倍 高速化) の高効率を完全維持
  - Dev-Harness（`repositoryEval.ts`, `reportBuilder.ts`）に `AdaptiveBudget` 比較評価テーブルおよび `unusedRecommendationRatio` メトリクス出力を統合
  - コード規約（最大 300 行 / 30 行 / 複雑度 5 制限）を全モジュールで完全遵守

## [Unreleased] - Phase 7H-B
- feat(mcp): Phase 7H-B Context Pack v2 → MCP / Agent Consumption Integration 実装および仕様策定（`docs/architecture/context-pack-v2-agent-integration.md`, `docs/guides/agent-quickstart.md`）
  - Context Pack v2（Working Set: CORE / SUPPORTING / RECALL_RESERVE）を外部 AI コーディングエージェント（Claude, Codex, Gemini 等）が直接取得・消費できる MCP ツール `codeprep_prepare_context`（`strategy="knowledge"`）を統合
  - CLI と MCP で同一の Application UseCase（`PrepareContextPackV2UseCase`）を唯一のオーケストレーション元とする単一ソースオブトゥルース設計を確立し、同一タスク・同一バジェットにおける **CLI / MCP Semantic Parity 100% 一致** を実現（オラクルテスト `CliMcpParity.test.ts`）
  - MCP 入力スキーマに `strategy` (`fast` / `standard` / `knowledge`), `budget` (`maxFiles`, `maxTokens`), `explicitPaths` を追加し、既存の引数や呼び出しとの完全な後方互換性（Legacy compatibility）を維持
  - Machine-readable structured output（`schemaVersion: "2"`, `workingSet`, `context`, `excluded`, `metrics`）により、エージェントが「何を最初に読むか」「なぜ含まれるか」「どこまで読めばよいか」「何が予算都合で除外されたか」を即座に判断可能に
  - ナレッジベースの不整合（DB不存在時の actionable error、Snapshot revision不一致時の stale 警告、Dirty Working Tree 警告、破損DBエラー、No Seed フォールバック）を安全にハンドリングするヘルスチェックポート連携を実装
  - `SYMBOL_RANGE` 5件（interface, class, method, function, type）および `DOC_SECTION` 3件（H1, H2, code fence 混在）の抽出境界精度と安全な `FULL_FILE` フォールバックをオラクルテスト `GranularityValidationOracle.test.ts` で実証
  - 3 つの典型タスク（単一 UseCase 変更、Port/Adapter/DI 跨ぎ、Docs + 実装跨ぎ）での Agent Dogfooding 実測を実施：
    - 着手前閲覧ファイル数: 平均 8.0 $\to$ **1.3 ファイル (-83.8% 削減)**
    - 手動検索回数: 平均 3.7 $\to$ **0.0 回 (-100% 削減)**
    - 初回編集着手時間: 平均 54.0 秒 $\to$ **9.8 秒 (5.5倍 高速化)**
    - Changed but not recommended: **0 件 (漏れゼロ)**
    - Recall Reserve 活用: Task C で `docs/mcp.md` を救出しドキュメント変更漏れを防止
    - Pack Saturation (Cap Hit Rate): **33.3%**（上限張り付き傾向を解消）
  - Dev-Harness（`repositoryEval.ts`, `reportBuilder.ts`）に `AgentConsumptionEvaluator` を統合し、`npm run dev:eval -- --phase 7h-b` による客観的実測評価レポート生成を自動化
  - 第三者向けクイックスタートガイド（`docs/guides/agent-quickstart.md`）および問題起点・実測値に基づく `README.md` の更新を実施
  - コード規約（最大 300 行 / 30 行 / 複雑度 5 制限）を全モジュールで完全遵守

## [Unreleased] - Phase 7H-A
- feat(context-pack): Phase 7H-A Relevant Subgraph → Working Set → Context Pack v2 実装および仕様策定（`docs/architecture/context-pack-v2.md`）
  - Relevant Subgraph の広範な探索空間から、AI Coding Agent が作業開始できる最小十分な Working Set を決定論的に選択・圧縮する `WorkingSetSelector` および `PrepareContextPackV2UseCase` を実装
  - 3-Tier モデル（**CORE** / **SUPPORTING** / **RECALL_RESERVE**）を導入し、Graph Query の高い上位精度（MRR 0.714）を維持したまま、旧 Candidate Discovery が強かった広範な Recall を確実に回復
  - トークン・ファイル・ノード・バイト数を制約する決定論的 LLM 非依存の `WorkingSetBudget` モデルを定義し、超過理由（`budgetExceeded`, `lowerPriority`, `duplicateCoverage`, `weakEvidence`）を明示
  - ファイル・シンボル重複排除（Deduplication）とシンボルレンジマージ、および安全なフォールバック機構（`FULL_FILE`, `SYMBOL_RANGE`, `DOC_SECTION`, `METADATA_ONLY`）を備えた `DefaultSourceExtractor` を実装
  - ノード種別・エッジ関係・パス規則から機械的にコンテキストロールを割り当てる `RoleAssigner`（`target`, `dependency`, `test`, `architecture`, `specification`, `supporting`）を実装
  - `ContextPackV2` 契約（`schemaVersion: "2"`, `workingSet`, `context`, `excluded`, `metrics`）を策定し、Included / Excluded の完全な説明可能性（Explainability）を保証
  - CLI（`apps/cli`）に `--strategy knowledge` オプションおよび Context Pack v2 の JSON / Markdown アダプター出力を統合（Windows npm 環境下での引数崩れに対する耐性処理を含む）
  - Golden Set (7 Tasks) 自動評価器 `ContextPackV2Evaluator` を新設し、Dev-Harness（`repositoryEval.ts`, `reportBuilder.ts`）に統合
  - Golden Set 実測において、Must-Have Recall **59.5% $\to$ 72.6% (+13.1%向上)**、平均ファイル数 9.6 ファイル、平均トークン数 9,772、圧縮率 68.4% を達成
  - コード規約（最大 300 行 / 30 行 / 複雑度 5 制限）を全モジュールで完全遵守

## [0.8.13] - 2026-09-13
- feat(ir): Phase 7G Task Query / Relevant Subgraph 実装および仕様策定（`docs/architecture/task-relevant-subgraph-query.md`）
  - Task 文字列から Seed Discovery $\to$ Repository Knowledge Graph $\to$ Relation-aware Bounded Traversal $\to$ Relevant Subgraph $\to$ Ranked Relevant Nodes を生成する `QueryRelevantSubgraphUseCase` を実装
  - Task 文字列から明示パス・ファイル名・シンボル識別子・見出しキーワードを段階的に特定する `SeedResolver`、および SQLite Knowledge Store からの高速ノード検索 `findNodes(filter)` を実装
  - リレーションごとの優先度・最大 Fanout・確信度閾値・距離減衰を制御し、無制限探索を防ぐ `RelationTraversalPolicy` を策定（AST/型/DI 等の決定的関係を最優先、10,000 件以上の `CO_CHANGED_WITH` エッジを厳格プルーニング）
  - 優先度キューを用いた Bounded Best-First Traversal により、循環参照や巨大グラフ爆発を防ぎつつ関連サブグラフを抽出する `GraphTraversalEngine` を実装
  - エビデンス品質重み付け（AST/型 1.0、Wiring 0.95、Import 0.85、Git 0.50、Cross-ref 0.60、Fuzzy 0.30）と理由集約（Explanation: `seed:*`, `edge:*`）を伴う `EvidenceQualityScorer` および `RelevantNodeRanker` を実装
  - Gate 0 BLOCKER であった `StructuredKnowledge`（シンボル 2,278 件、ドキュメント節点 836 件）の未連携を `ProductionRepositoryKnowledgeBuilder` に統合・解消し、全 3,829 Nodes / 18,932 Edges（全 9 Relation Type: `contains`, `depends-on`, `references`, `implements`, `extends`, `binds_to`, `injects`, `co-changed-with`, `doc-relation`）の Production IR 基盤を確立
  - `IRInvalidator` をマルチアナライザー（`structured-knowledge` 内のシンボル・節点）対応に拡張し、全 9 種別で **Incremental Refresh == Full Rebuild（Oracle Match PASS、Dangling Edge = 0）** の完全一致を維持
  - 7 カテゴリの代表シナリオを網羅した Golden Set（`evaluation/task-query-golden-set.json`）および自動評価器 `TaskQueryEvaluator` を新設し、Dev-Harness（`repositoryEval.ts`, `reportBuilder.ts`）に統合
  - Baseline Comparison（Candidate Only vs Graph Query）において、**MRR 0.439 $\to$ 0.714 (+62.6%向上)**、**Hit@5 57.1% $\to$ 71.4% (+14.3%向上)** を実証
  - Phase 7B / 7C 追跡 Golden Task において、従来の docs 偏重が完全に解消され、構造リレーション（`injects`, `references` 等）を根拠とした実装 Node が Top 10 中 8 件を占める劇的改善を達成
  - 平均探索時間 **124.4ms**、全 10,424 件の `CO_CHANGED_WITH` エッジのうちフロンティア検討された 643 件すべてを安全にプルーニング（ノイズ混入 0 件）
  - コード規約（最大 300 行 / 30 行 / 複雑度 5 制限）を全モジュールで完全遵守

## [0.8.12] - 2026-09-13
- feat(ir): Phase 7F Git Revision Based Incremental Refresh / Producer-aware Invalidation 実装および仕様策定（`docs/architecture/repository-knowledge-refresh.md`）
  - Git revision の差分（ChangeSet）を起点に、Producer ごとの波及範囲（`FILE_LOCAL`, `DEPENDENT_CLOSURE`, `PRODUCER_FULL`, `FULL_REBUILD`）を安全に決定論的解決し、Full Rebuild を回避して正確な新しい Stable Snapshot を生成する `RefreshRepositoryKnowledgeUseCase` を実装
  - Application 層と Git CLI を隔離する `RepositoryRevisionPort` および `GitCliRevisionAdapter`（`diff --name-status -M`, `status --porcelain`, `rev-parse HEAD`）を実装
  - 前回のグラフ構造から 1-Hop の波及先（Incoming `DEPENDS_ON`, `REFERENCES`, `IMPLEMENTS`, `EXTENDS`）を安全側に探索する `ImpactResolver`、およびコンパイラ設定変更（`tsconfig.json` 等）の検知による自動 Full Fallback を導入
  - 変更・削除・リネーム旧パス由来の事実および再解析対象 Producer のエビデンスを決定論的に除外し、Dangling Edge を 100% 排除する `IRInvalidator` を実装（`typescript-compiler` 等のアナライザー識別子整合性を完全同期）
  - 新旧 Snapshot 間で Node / Edge ID および Snapshot ID の Cross-snapshot 違反を防ぎ、安全に ID リバインドとアトミックマージを行う `IRSnapshotAssembler` を実装
  - 同一リビジョン時の無駄な再解析を排除する `NO_OP` Fast Path（所要時間 < 5ms）、および未コミット変更の混入を防ぐ Dirty Working Tree Policy（`DIRTY_WORKTREE` 拒絶）を導入
  - テスト環境および Fixture による検証を実施し、Scenario A（No Change / NO_OP）、B（Add）、C（Modify）、D（Delete）、E（Rename）の全シナリオで **Incremental Refresh == Full Rebuild（Node / Edge / Evidence / Relation counts 100% 完全一致）** の Correctness Oracle を実証
  - Production 相当の全 8 Producer を一元化する `ProductionRepositoryKnowledgeBuilder` を新設し、テスト・ハーネス間の二重実装を解消
  - Production-equivalent Git Fixture を用いた `ProductionIncrementalRefreshOracle.test.ts` を配備し、全 8 種の Relation Type（`depends-on`, `references`, `implements`, `extends`, `binds_to`, `injects`, `co-changed-with`, `doc-relation`）すべてにおいて **Incremental Refresh == Full Rebuild（Oracle Match PASS、Dangling Edge = 0、Clean Revision での No-op PASS）** を実証
  - 実リポジトリ全域での評価アダプター `RepositoryRefreshEvaluator` および Dev-Harness（`repositoryEval.ts`）を `ProductionRepositoryKnowledgeBuilder` に統一し、全 8 種別 654 Nodes / 15,460 Edges での評価を機械化
  - コード規約（最大 300 行 / 30 行 / 複雑度 5 制限）を全モジュールで完全遵守
- feat(dev-harness): Phase 7E.5 Development Harness / Agent-Neutral Mechanized Workflow 実装および標準化（`docs/development/development-harness.md`）
  - エージェント非依存・決定論的な開発運用ハーネススクリプト群（`scripts/dev-harness/`）を新設し、npm scripts（`dev:phase:start`, `dev:verify`, `dev:verify:fast`, `dev:verify:final`, `dev:eval`, `dev:phase:finish`）として統合
  - プロジェクト標準開発実行規約（`.agents/MECHANIZED_DEVELOPMENT_WORKFLOW.md`）を策定し、Claude / Gemini / Codex / 人間を問わず同一の実行フロー・検査・証跡記録を保証
  - 変更ファイル分類（`changedFiles.ts`）、ピンポイント規約＋コンパイル＋局所テストの高速検査（`verify.ts --mode fast`）、および全域品質ゲート一括検査（`verify.ts --mode final`）を自動化
  - Known Paths Golden Set（`evaluation/repository-known-paths.json`）照合および SQLite Repository Knowledge Store を活用した全域評価（`repositoryEval.ts`）を機械化
  - 機械的集計（Factual）とエージェント・人間による設計判断（BLOCKER / SHOULD FIX / DEFER）の境界を明確に分離したフェーズ完了レポート自動生成（`phaseFinish.ts`, `reportBuilder.ts`）を実現
  - `TypeScriptInheritanceAnalyzer` における `implements` 関係のシンボル Alias 未解決による drop 不具合を解消し、Known Paths Golden Set 3/3 PASS（全 41 件の `implements` 関係を正常検出）を達成
  - コード規約（最大 300 行 / 30 行 / 複雑度 5 制限）を全ハーネススクリプトで完全遵守
- feat(ir): Phase 7E SQLite Repository Knowledge Store / Snapshot Persistence 実装および仕様策定（`docs/architecture/repository-knowledge-store.md`）
  - In-Memory Repository IR を再生成可能な派生インデックスとして高速永続化・復元する `RepositoryKnowledgeStore`（Application Port）および Node.js 22 内蔵 `node:sqlite` を用いた `SqliteRepositoryKnowledgeStore`（Infrastructure Adapter）を実装
  - ゼロ外部依存・ACID 保証・単一ファイル管理（`.codeprep/repository-knowledge.db`）およびテスト用の超高速インメモリモード（`:memory:`）を両立
  - リレーショナル正規化列（`snapshot_id`, `node_id`, `path`, `source_node_id`, `target_node_id`, `relation_type` 等のインデックス列）と拡張属性用 JSON 列を分離設計し、型安全性と将来の拡張性を担保
  - 単一トランザクションによる Atomic Write（失敗時の完全ロールバック保証）および Snapshot / Node / Edge / Evidence の 100% 完全復元（Round-trip Fidelity）を実証
  - ユースケースオーケストレータ `BuildRepositoryKnowledgeUseCase` および世代管理・旧スナップショット CASCADE 削除対応の `RebuildRepositoryKnowledgeUseCase` を新設
  - 実リポジトリ全域を対象とした Production 相当の統合 Smoke テスト（`SqliteRepositoryKnowledgeStoreProductionSmoke.test.ts`）を新設し、全 8 種の Relation Type（`references`, `implements`, `extends`, `binds_to`, `injects`, `depends-on`, `co-changed-with`, `doc-relation`）すべてにおいて Save前 = Load後 の完全一致（15,000 件以上のエッジで欠落ゼロ）を実証
  - `DerivedRelationMapper` における同一ペアのエッジ ID 重複排除処理を実装
  - コード規約（最大 300 行 / 30 行 / 複雑度 5 制限）を完全遵守
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
