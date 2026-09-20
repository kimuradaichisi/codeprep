# Context Request & Context Projection アーキテクチャ設計書

## 1. 概要と背景 (Why Task-Only is Too Narrow)

### 1.1 背景
CodePrep は Phase 7K-A までに、リポジトリ知識グラフ（IR / Subgraph / WorkingSet / Adaptive Budget）に基づく「Context Pack v2」を確立しました。これにより、自然言語タスクから高精度（Recall 77.4%, Hit@5 100%）にワーキングセットを抽出し、Desktop, CLI, MCP 間での完全なセマンティック一致（100% Parity）を実現しました。

### 1.2 課題: 「単一Task」モデルの限界
従来のモデルは、入力として単一の自然言語文字列（`task: string`）のみを受け取る設計でした。
この設計には以下の課題がありました：
1. **意図（Intent）の曖昧さ**: コード変更（change）なのか、レビュー（review）なのか、影響調査（impact）なのか、理解（understand）なのかが区別できず、一律に「修正対象コード」を集める挙動になっていた。
2. **アンカー情報の喪失**: 開発者が既に「このファイル」「この関数」「このコミット差分」が関連すると知っている場合でも、それを自然言語文字列に混ぜるしかなく、グラフ探索の明確なシードとして宣言的に指定できなかった。
3. **スコープ境界の欠如**: 「特定のディレクトリ配下のみ」「特定フィーチャーのみ」といった作業境界を明示できず、リポジトリ全体から無関係な関連ファイルが漏れ込むリスクがあった。

### 1.3 CodePrep の新ゴール: Work Context Compiler
CodePrep は単なる「タスク関連ファイルのパッキングツール」から、**「Repository Knowledge から、これから行う仕事に必要な Context を目的別に構成するコンパイラ（Work Context Compiler）」** へと進化します。

---

## 2. コア概念とドメインモデル

```
[ User / External Agent ]
         │
         ▼ ContextRequest (Intent + Goal + Anchors + Scope + Budget)
┌─────────────────────────────────────────────────────────┐
│ QueryInputCompiler                                      │
│  - TaskQueryText 生成 (Goal + Anchor symbols/names)     │
│  - ExplicitPaths 抽出 (File anchors)                    │
│  - ScopeFilter 構成 (Directory, Feature, File)          │
│  - BudgetOverride 構成                                  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ PrepareContextPackV2UseCase (Knowledge Graph / Subgraph)│
│  - WorkingSet Selector (Core / Supporting / Reserve)    │
│  - Adaptive Budget Resolver                             │
└────────────────────────────┬────────────────────────────┘
                             │ ContextPackV2 (既存資産・高精度 100% 維持)
                             ▼
┌─────────────────────────────────────────────────────────┐
│ ChangeContextProjectionPolicy                           │
│  - Entry Role 射影 (primary-target, supporting, test, doc)│
│  - Anchor Contributions トレース                        │
│  - Scope Filtering & Exclusion 追跡                     │
│  - Evidence Collection (anchor, dependency, seed)       │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
                  ContextProjection (構造化射影)
```

### 2.1 ContextRequest
`ContextRequest` は、これから行う「仕事」の意図と条件を表現するイミュータブルな不変オブジェクトです。

- **Intent (`ContextIntent`)**: 
  - `change` (デフォルト・Phase 7L-A 対象): 実装変更用のコンテキスト
  - 将来拡張: `review`, `understand`, `impact`, `investigate`, `document`, `test`
- **Goal (`string`)**: 達成したい目的の自然言語記述（必須）
- **Anchors (`readonly ContextAnchor[]`)**: 起点となる確定情報
  - `file`: 既知のファイルパス
  - `symbol`: 関数・クラス名
  - `directory`: 対象ディレクトリ
  - `text`: キーワードや抜粋
  - `git-diff`: 差分コミット参照
- **Scope (`ContextScope`)**: 探索・収集の境界制約
  - `auto`: 自動解決（デフォルト）
  - `file`: 単一ファイル限定
  - `directory`: 特定ディレクトリ配下限定
  - `feature`: 特定機能境界
  - `repository`: リポジトリ全体
- **Budget (`ContextBudgetOverride`)**: トークン上限・ファイル数上限の明示指定

### 2.2 ContextProjection
`ContextProjection` は、生成された ContextPack を特定の Intent の視点から解釈・構造化した表現です。

- **Request Summary**: 入力された Intent, Goal, Anchors, 要求スコープと推論スコープ
- **Entries**: 役割（`primary-target`, `supporting`, `test`, `doc`, `recall-reserve`）が付与され、どのアンカーから寄与したかがトレースされたファイル群
- **Evidence**: なぜこのファイル・シンボルが含まれたかの根拠チェーン（`anchor`, `seed`, `dependency`）
- **Excluded**: スコープ制約やバジェット制約によって除外されたファイルとその明示的理由
- **Metrics**: 総ファイル数、推定トークン数、主要ターゲット数、圧縮率

---

## 3. 下位互換性（100% Backward Compatibility）の設計

既存の全エコシステム（Desktop, CLI, MCP, テストスイート）を一切破壊しないため、以下の防衛原則を徹底しています：

1. **アダプター層での自動変換**:
   - `task: string` 単体が渡された場合、`createLegacyTaskRequest(task)` を介して自動的に `{ intent: 'change', goal: task, anchors: [], scope: { kind: 'auto' } }` へ昇格。
2. **ContextPackV2 との並行提供**:
   - `PrepareContextProjectionUseCase` は内部で既存の `PrepareContextPackV2UseCase` を呼び出し、得られた `ContextPackV2` を元に `ContextProjection` を生成して両方を返却。
   - 既存のコンシューマにはデフォルトで従来形式（`ContextPackV2`）を返し、明示的に `--projection` や `projection: true` を指定したコンシューマにのみ新形式（`ContextProjection`）を返却。
3. **Parity 保証**:
   - Desktop, CLI, MCP はすべて同一の `PrepareContextProjectionUseCase` 経由で実行され、セマンティックの一致率は 100% を維持。

---

## 4. 検証実績 (Phase 7L-A 5 Scenarios)

| Case | シナリオ | 入力 | 期待挙動と検証結果 |
|---|---|---|---|
| 1 | Goal only | goal のみ指定 | request.intent='change', anchors=[], scope=auto で正常動作。ContextProjection 生成確認 (PASS) |
| 2 | Goal + FileAnchor | goal + file anchor | explicitPaths に伝播し、該当エントリが primary-target かつ anchorContributions 記録 (PASS) |
| 3 | Goal + SymbolAnchor | goal + symbol anchor | compiled taskQueryText にシンボル名が追加され IR 検索に寄与 (PASS) |
| 4 | Goal + DirectoryScope | goal + dir scope | scope 外の supporting ファイルが excluded に記録され、scope 内のみ projection entries に残る (PASS) |
| 5 | Legacy task | task: string のみ | createLegacyTaskRequest で 100% 互換動作し ContextPackV2 と整合 (PASS) |

---

## 5. 今後の展開 (Future Roadmap)

- **Phase 7L-B: Multi-Intent Policies**
  - `review` (変更差分とレビュー対象に特化した射影ポリシー)
  - `understand` (アーキテクチャ・依存関係の俯瞰に特化した射影ポリシー)
  - `impact` (波及影響・利用箇所追跡に特化した射影ポリシー)
- **Phase 7L-C: Projection Renderer**
  - LLM 向け構造化 Markdown テンプレートの intent 別最適化
  - UI 向けインタラクティブ Projection Viewer
