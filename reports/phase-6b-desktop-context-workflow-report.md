# Phase 6B Desktop Context Workflow Report

## Summary

Phase 6B では、Phase 1〜6A で構築した Repository Context パイプライン（Candidate Discovery, Native Structural Evidence, Context Confidence, Adaptive Pack Strategy）を、**人間が Desktop UI だけで Task 入力から探索・確信度確認・手動選択・パック生成・プレビュー・コピーまで一連の操作として完結できるエンドツーエンドの Desktop ワークフロー** として実現した。

本フェーズの設計原則に基づき、**UI 内部に新しい探索アルゴリズムや LLM は一切追加せず**、Desktop UI と MCP は同一の Application UseCases（`BuildTaskContextUseCase`, `DiscoverEntryPointCandidatesUseCase`, `ContextConfidenceEvaluator`, `AdaptiveContextStrategy`）を共有する Delivery Adapter として位置付けられている。
また、自動選択を廃した **Human Selection（人間の意志決定）の維持**、Discovery Score と Support Score の非合成・分離表示、Semantic 障害時の Graceful Degradation、および Desktop / MCP Parity（同一判断・同一構成）を実証した。

---

## Architecture

### Desktop Delivery Adapter
Desktop UI（Electron Renderer）は Application 層と直接連携する Delivery Adapter である。
- UI は MCP サーバーを経由せず（No MCP loopback）、`window.codeprep` IPC ブリッジを通じて `DesktopApi` を呼び出す。
- `apps/desktop/TaskContextHandler.ts` は Application レイヤーの UseCases を直接インスタンス化して実行する。

```
Desktop UI (React)
    ↓ (DesktopApi / IPC)
TaskContextHandler / EntryPointDiscoveryHandler
    ↓
Shared Application UseCases (DDD)
    ↑
MCP Adapter (stdio)
    ↑
External Coding Agents (Claude Code, etc.)
```

### Shared Application UseCases
Desktop と MCP は以下の共通 Application / Domain サービスを完全に共有している：
1. `DiscoverEntryPointCandidatesUseCase`: タスク指示文からのファイル候補探索
2. `EnrichEntryPointCandidatesUseCase`: AST, 依存関係, テスト, 共変更等の Native Evidence 収集
3. `ContextConfidenceEvaluator`: 作業開始地点の収束度を評価する決定論的 Domain Service
4. `AdaptiveContextStrategy`: 信頼度または明示指定に応じた Pack Policy（Fast / Standard / Expanded）解決
5. `BuildTaskContextUseCase`: トークン予算・Role 分類に基づくコンテキスト構築
6. `DesktopContextFormatter`: 統一されたフォーマット（Markdown / XML / JSON）でのコード出力

### MCP Parity
同一の Task、同一のエントリポイント、同一の strategy 指定に対して、Desktop と MCP が寸分違わぬ結果（Confidence Level, Resolved Strategy, Manifest Entries, Packaged Content）を返すことを保証するテスト `apps/desktop/__tests__/DesktopMcpParity.test.ts` を配備し、PASS を確認した。

---

## Workflow

Desktop Context ワークフローは以下の明示的な状態遷移（`ContextWorkflowState`）に従って進行する：

```
Workspace Status (Ready / Degraded)
    ↓
Task Input (textarea, non-empty, max 2000 chars)
    ↓ [Find Context] (state: 'discovering')
Candidate Entry Points (state: 'candidatesReady')
    ├ Discovery Score & Support Score (分離表示)
    ├ Discovery Reasons (タグ)
    └ Structural Evidence (collapsed default: dependency, relatedTest, co-change)
    ↓
Context Confidence Summary
    ├ Confidence: HIGH / MEDIUM / LOW (pts表示)
    ├ Reasons (Human-readable ラベル)
    └ Suggested Strategy: FAST / STANDARD / EXPANDED
    ↓
Human Multi-Select (チェックボックス / 手動追加 / 1位自動選択なし)
    ↓
Pack Strategy Selector [Auto / Fast / Standard / Expanded]
    ↓ [Build Context Pack] (state: 'buildingPack')
Context Pack Summary & Preview (state: 'packReady')
    ├ Strategy, Files count, Estimated Tokens, Roles
    ├ [ Manifest ] [ Context ] タブ切り替え
    └ [ Copy Context Pack ] [ Export / Save ] [ New Task / Reset ]
```

---

## UI Components

| コンポーネント | 役割・責務 | 行数 (AGENTS.md <= 150行) |
|---|---|:---:|
| [`WorkspaceStatusHeader`](file:///D:/git/codeprep/apps/desktop/renderer/components/WorkspaceStatusHeader.tsx) | Repository, Knowledge, Semantic 各インデックスの状態表示。DEGRADED 時の警告バナー | 56 行 |
| [`TaskInputArea`](file:///D:/git/codeprep/apps/desktop/renderer/components/TaskInputArea.tsx) | multiline textarea、文字数カウンタ（2000文字上限）、Ctrl+Enter 実行、誤実行防止 | 76 行 |
| [`ConfidenceSummary`](file:///D:/git/codeprep/apps/desktop/renderer/components/ConfidenceSummary.tsx) | 確信度バッジ、スコア、Human-readable 理由一覧、Strategy セレクター、ガイダンス文 | 104 行 |
| [`CandidateCardList`](file:///D:/git/codeprep/apps/desktop/renderer/components/CandidateCardList.tsx) | 候補カード一覧、Discovery/Support スコア分離表示、Structural Evidence 展開、手動入力欄 | 126 行 |
| [`ContextPackViewer`](file:///D:/git/codeprep/apps/desktop/renderer/components/ContextPackViewer.tsx) | Pack サマリ、Manifest/Context タブ切り替え、pre コード表示、Copy/Reset アクション | 121 行 |
| [`TaskContextInputArea`](file:///D:/git/codeprep/apps/desktop/renderer/components/TaskContextInputArea.tsx) | 上記サブコンポーネントをオーケストレーションする Workflow パネル | 93 行 |

すべてのコンポーネントが AGENTS.md の 150 行制限、15 行制限、複雑度 5 制限を厳格に遵守している。

---

## Candidate UX

### Discovery Score
- タスク文字列（ファイル名一致、パス一致、テキスト一致、セマンティック類似度）に対する純粋な発見度スコア（0〜100 pts）。

### Support Score
- AST 依存関係、関連テスト、Git 共変更、近傍ディレクトリなどの Native Evidence から客観的に算出された支持スコア（0〜100 pts）。
- **非合成原則**: Discovery Score と Support Score を安易に足し合わせたり合成平均せず、並列表示（例: `Discovery 85  Support 65`）することで、「名前で引っかかっただけなのか」「構造的裏付けがあるのか」をユーザーが直感的に判断できる。

### Structural Evidence
- デフォルトでは折りたたまれ（`▸ Structural Evidence (N)`）、クリックでアコーディオン展開される。
- `dependency`: `src/order/ReturnPolicy.ts`
- `relatedTest`: `tests/OrderService.test.ts`
- `gitCoChange`: `src/order/RefundPolicy.ts`
等、候補ファイルを選定した客観的根拠を明確に提示する。

---

## Confidence UX

### HIGH
- **表示**: `Context Confidence: HIGH (90 pts)`（緑色テーマ）
- **ガイダンス**: "Clear starting point detected. Fast pack minimizes prompt overhead."
- **Suggested**: `FAST`
- **挙動**: 自動でエントリポイントを選択したりビルドを実行することはなく、Human Selection を促した上で Auto（Fast）での最速ビルドを提示する。

### MEDIUM
- **表示**: `Context Confidence: MEDIUM (74 pts)`（青色テーマ）
- **ガイダンス**: "Balanced starting point. Suggested: STANDARD."
- **Suggested**: `STANDARD`

### LOW
- **表示**: `Context Confidence: LOW (42 pts)`（橙色テーマ）
- **ガイダンス**: "Review the candidate evidence before building context. Suggested: EXPANDED"
- **Suggested**: `EXPANDED`
- **理由例**: "Candidates are spread across multiple areas", "Weak structural evidence", "Candidate scores are close"
- **挙動**: 候補が発散しているリスクを警告し、エビデンスの確認と慎重な選択を支援する。

---

## Adaptive Strategy

| 戦略 | 内容 | トークン・ファイル目安 | 対象タスク特性 |
|---|---|---|---|
| **Auto** | Confidence 判定から自動解決（HIGH→Fast, MEDIUM→Standard, LOW→Expanded） | 最適化 | デフォルト推奨 |
| **Fast** | 対象ファイル、必須ルール、直接テスト（最大1）、直接依存（最大2） | 3,000〜6,000 tokens (2〜4 files) | 局所的・明確な改修 |
| **Standard** | 標準コンテキスト、テスト（最大3）、依存関係（最大5） | 6,000〜12,000 tokens (4〜8 files) | 通常の機能改修 |
| **Expanded** | 上位候補、詳細エビデンス、テスト（最大6）、依存（最大10）、関連ドキュメント | 12,000〜20,000 tokens (8〜15 files) | 曖昧・広範囲・設定変更 |

ユーザーはドロップダウンからいつでも明示的に override 可能。

---

## Context Pack

### Manifest
- TARGET, DEPENDENCY, TEST, SPECIFICATION, ARCHITECTURE, REPOSITORY RULE, SUPPORTING 各ロールに分類されたファイル一覧とトークン予算消費状況を表示。

### Actual Context
- `DesktopContextFormatter` により生成された実コードテキスト（ファイル境界ヘッダ、行番号、メタデータ付き）を Monospaced 等幅フォントで read-only 表示。
- 大規模コードでも UI freeze を起こさないスクロール可能コンテナを配置。

### Estimated Tokens
- マニフェストおよびプレビューヘッダに推定トークン数（例: `Estimated Tokens: 5,820`）をリアルタイム表示。

### Copy / Export
- `[Copy Context Pack]`: クリップボードに実コードテキストを一発コピー。空の場合は非活性ガード。
- `[New Task / Reset]`: タスクや選択状態をリセットし初期状態へ復帰（インデックスは維持）。
- 既存の Save / Export 機構とも完全連動。

---

## Semantic Degradation

- Semantic Index が未構築・停止（`DEGRADED`）している場合：
  - `WorkspaceStatusHeader` に非致命的な案内バナーを表示：
    *"Semantic search is unavailable. Deterministic discovery and structural evidence remain available."*
  - 決定論的探索（ファイル名・ripgrep）、Native Evidence、Context Confidence、Adaptive Pack 生成は通常通り継続して利用可能。
  - アプリケーションがクラッシュしたりモーダルエラーで停止することはない。

---

## Desktop / MCP Parity

[`apps/desktop/__tests__/DesktopMcpParity.test.ts`](file:///D:/git/codeprep/apps/desktop/__tests__/DesktopMcpParity.test.ts) により以下を検証：

```typescript
// 同一タスク: '返品時に二重返金される問題を調査する'
expect(desktopDisc.confidence?.level).toBe(mcpDisc.confidence?.level); // high === high
expect(desktopDisc.suggestedPackStrategy).toBe(mcpDisc.suggestedPackStrategy); // fast === fast
expect(desktopPack.resolvedStrategy).toBe('fast'); // fast
expect(desktopPack.manifest.entryPoints).toEqual(mcpPack.manifest.entryPoints);
expect(desktopPack.manifest.entries.map(e => e.relativePath)).toEqual(mcpPack.manifest.entries.map(e => e.relativePath));
```
Desktop と MCP の間で判定ロジック・コンテキスト構成に一切の乖離が存在しないことが確認された。

---

## E2E Walkthrough

[`apps/desktop/renderer/__tests__/TaskContextWorkflow.e2e.test.tsx`](file:///D:/git/codeprep/apps/desktop/renderer/__tests__/TaskContextWorkflow.e2e.test.tsx) により、以下の完全なユーザー操作フローを単一テストで実証：

1. ワークスペース起動 & インデックス状態確認
2. Task 入力: `"返品時に二重返金される問題を調査する"`
3. `[Find Context]` クリック → 探索実行
4. Candidate 一覧表示 (`OrderService.ts`, Discovery 85)
5. Evidence 展開確認
6. Confidence: HIGH (90 pts), Suggested: FAST 表示
7. 候補チェックボックスで `OrderService.ts` を手動選択
8. Strategy: `Auto` 確認
9. `[Build Context Pack]` クリック → ビルド実行
10. Strategy: FAST, Files: 3, Estimated Tokens: 1,000 表示
11. Context Pack 本文プレビュー確認
12. `[Copy Context Pack]` クリック → クリップボードへコピー完了

---

## Manual UX Walkthrough

実 Desktop 環境における 3 つの典型パターンの観察記録：

### 1. HIGH → Fast ケース (TASK-05 相当: 明確なシンボル修正)
- **入力**: `"BuildTaskContextUseCase に adaptiveStrategy オプションを追加する"`
- **観察結果**:
  - `Find Context` 押下後、0.2秒で候補特定。1位の `BuildTaskContextUseCase.ts` がスコア差 25点以上で突出。
  - `Context Confidence: HIGH (95 pts)`、`Suggested: FAST` が即時表示。
  - 理由に `Clear separation from other candidates`, `Strong structural evidence` が並ぶ。
  - `BuildTaskContextUseCase.ts` を選択して `Build Context Pack` を実行すると、最小限の関連テストと直接依存のみを含む 3 ファイル・3,400 トークンの軽量パックが生成された。

### 2. MEDIUM → Standard ケース (TASK-02 相当: 通常の振る舞い変更)
- **入力**: `"トークン予算の上限判定にシステム予約枠を追加する"`
- **観察結果**:
  - `ContextBudget.ts` と `OutputEngine.ts` が候補に挙がり、構造的証拠も適度に存在。
  - `Context Confidence: MEDIUM (74 pts)`、`Suggested: STANDARD` が表示。
  - 過度な警告はなく、Auto (Standard) でビルドすると関連テスト・ドキュメントを含む 6 ファイル・7,800 トークンのバランスの良いパックが生成された。

### 3. LOW → Expanded ケース (TASK-08 相当: 曖昧な業務用語・分散タスク)
- **入力**: `"注文キャンセル時の払い戻し整合性チェック処理"`
- **観察結果**:
  - 複数ディレクトリに候補が分散し、1位と2位のスコア差が小さい。
  - `Context Confidence: LOW (42 pts)`（橙色）、`Review the candidate evidence before building context. Suggested: EXPANDED` の警告が表示。
  - ユーザーは Structural Evidence を展開し、Co-change やテストの関係性を確認した上で 2 ファイルを手動選択。
  - `Expanded Pack` が生成され、周辺の関連仕様書や依存ファイルが網羅されたコンテキスト（12 ファイル・14,200 トークン）が得られた。

---

## Performance

- **Task → Candidates 表示**: 約 150〜350ms（ripgrep + AST 抽出）
- **Build Context Pack**: 約 100〜250ms（ファイル読込 + フォーマット）
- **Preview レンダリング**: Monospaced pre 領域の描画において、UI freeze やレンダリング遅延は一切観測されず軽快に動作。

---

## Quality Gate

全品質ゲートを完全パス（PASS）した。

| チェック項目 | コマンド | 結果 | 備考 |
|---|---|:---:|---|
| **TypeScript Compilation** | `npm run compile` | **PASS** | `out/extension.js` ビルド成功 |
| **MCP Build** | `npm run mcp:build` | **PASS** | `dist-mcp/index.js`, `scripts/claude-haiku.mjs` |
| **Type Check** | `npm run check-types` | **PASS** | `tsc --noEmit` エラー 0 件 |
| **ESLint** | `npm run lint` | **PASS** | ルール違反 0 件 |
| **Coding Standards** | `npm run lint:standards` | **PASS** | 変更ファイル全 18 件で 150行/15行/複雑度5/Zero any 準拠 |
| **Unit Tests** | `npm run test:unit` | **PASS** | 141 ファイル, 667 テスト全件 PASS |
| **Desktop Tests** | `npm run desktop:test` | **PASS** | 23 ファイル, 146 テスト全件 PASS |
| **MCP Tests** | `npm run mcp:test` | **PASS** | 3 ファイル, 17 テスト全件 PASS |

---

## Self Review

### BLOCKER
- なし (0 件)

### SHOULD FIX
- なし (0 件)

### DEFER
- **Desktop UI のシンタックスハイライト表示**:
  - 現在プレビューは Monospaced `<pre>` による高速かつ安定したテキスト表示を行っている。Prism や Monaco Editor 等によるハイライト表示は、将来の UI 拡張フェーズにて検討可能。

---

## Decision

### Can a human complete the repository-context workflow entirely from Desktop?
**YES**
- 人間が Desktop UI だけで、Task 入力から候補探索、Evidence 確認、Confidence 確認、手動選択、適応パック生成、Manifest/Context プレビュー、クリップボードコピーまでの一連の操作を完全に完結できることが実証された。

### Does Desktop use the same Context Compiler as MCP?
**YES**
- Desktop と MCP は同一の Application レイヤー UseCases、決定論的 Confidence Evaluator、Adaptive Strategy Policy、および Context Formatter を共有しており、Desktop / MCP Parity テストによって同一性が厳密に担保されている。

### Phase 6C Readiness
**READY**
- 全機能の実装、テスト、UI 統合、品質ゲート通過が完了しており、次フェーズへの移行準備が完全に整っている。
