# Repository Context Feature

## Responsibility
Repository 内から AI に渡す Context 候補を探索・推薦・評価・構成するための独立した再利用可能機能。
Desktop UI や Electron などの表示層・基盤技術から分離され、今後の CLI、Task-driven Context Pack、MCP 連携などの基盤となります。

## Architecture & Layering
```
domain/
  CandidateFile, ContextBudget, FileScorer, PackMode, Project,
  Recommendation, SearchRecipe, SourceExcerpt
application/
  AnalysisResultBuilder, AnalyzeProjectsUseCase, BuildDesktopContextUseCase,
  ClipboardPathResolver, DesktopOutputBuilder, DiscoverFilesUseCase,
  MergeRecommendationsUseCase, ports
infrastructure/
  filesystem/     (ProjectFileContentReader, ProjectFileTree, ProjectRegistryStore)
  search/         (RipgrepClient, RipgrepJsonParser)
  git/            (GitCoChangeClient, GitHistoryReader, GitMetadataClient)
  recommendation/ (DirectoryProximityClient, DocGraphClient, MarkdownRecommendationClient, ...)
  formatting/     (DesktopContextFormatter)
```

## Contains
- **Candidate discovery**: SearchRecipe（Ripgrep, Git, ファイル一覧, クリップボード）に基づく候補探索
- **Recommendation**: 複数ソース（DocGraph, Git Co-change, Markdownリンク, ディレクトリ近傍）に基づく推薦
- **Scoring**: 推薦・探索理由に基づく候補ファイルの優先度スコアリング
- **Repository search**: 高速な全文検索・AST/パターン抽出アダプター
- **Git relation**: コミット履歴・変更メタデータ解析
- **Document relation**: 設計書・ドキュメント間の参照グラフ解析
- **Context budget**: トークン／バイト容量計算および制限超過判定
- **Pack mode / source excerpts**: 完全読込、スケルトン、差分、マッチ周辺行等のパッキングモード

## Does NOT Contain
- Desktop UI (React, HTML/CSS)
- Electron IPC / Window 管理
- LLM execution (プロンプト直接送信・推論実行)
- RAG / embeddings (Vector DB)
- RepoScout orchestration
- MCP (Model Context Protocol) サーバー実装

## Engine Boundary Decision
- **BudgetOptimizer**: DEFER (VSCode 拡張機能側の出力処理専用のため、`src/features/engine/application` に維持)
- **DependencyScanner**: DEFER (VSCode 拡張と Desktop/Repository-Context 双方から利用される共通静的解析基盤のため、`src/features/engine/application` に維持)

## Future Direction
将来的に以下のワークフローを段階的に導入予定です:
```
Task (タスク指示・ゴール定義)
  ↓
Repository Context discovery (関連コード・ドキュメントの自動探索)
  ↓
Context role assignment (Entry point, Dependency, Interface 等の役割付与)
  ↓
Context Manifest (構造化マニフェスト定義)
  ↓
Context Pack (LLM最適化コンテキスト生成)
```
※ 現行リファクタリングでは上記新機能の実装は含めず、既存振る舞いを100%維持した構造分離のみを行っています。
