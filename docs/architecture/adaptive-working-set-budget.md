# Adaptive Working Set Budget Architecture (Phase 7I-A)

## 1. 概要と背景

Phase 7H-B までの Context Pack v2 では、固定の Working Set Budget（`maxFiles: 10`, `maxEstimatedTokens: 12000`）が適用されていました。
しかし実測評価により、以下の課題が明らかになりました：

1. **固定上限への張り付き（Cap Hit Rate）**:
   - Golden Set 7 タスクでの Avg Files は 9.6、Cap Hit Rate は 85.7% に達していました。
   - Dogfooding 3 タスクでの Pack Cap Hit Rate は 100% であり、単一ファイル修正タスクであっても枠上限近くまで候補ファイルが詰め込まれていました。
2. **トークンとコンテキストの浪費**:
   - 局所的な Port/Adapter 修正や Persistence 修正など、本来 2〜3 ファイルで十分なタスクに対しても 10 ファイル近くが推奨され、AI Agent のコンテキストウィンドウと注意力を無駄に消費していました。

Phase 7I-A では、タスクの構造的スコープ（**NARROW / STANDARD / BROAD**）とグラフの実測情報（Feature 集中度、スコア急落、シード数など）に基づいて予算枠を動的に決定し、不要なファイル・トークンを削減する **Adaptive Working Set Budget** を導入しました。

---

## 2. コア設計とアーキテクチャ

```
Task + Query / Subgraph
        │
        ▼
[TaskScopeClassifier] ──(Signals: dominantFeatureRatio, topScore, seedCount)
        │
        ▼
   TaskScope (NARROW / STANDARD / BROAD)
        │
        ▼
[AdaptiveBudgetResolver] ◄── [User Explicit Budget Override (最優先)]
        │
        ▼
AdaptiveBudgetDecision (scope, source, budget, signals, reasons)
        │
        ▼
[WorkingSetBudgetApplier] ──(Early Stop: Diminishing Returns, Reserve Limit)
        │
        ▼
WorkingSet (CORE / SUPPORTING / RECALL_RESERVE)
```

### 主要コンポーネント

| コンポーネント | 層 | 責務 |
| :--- | :--- | :--- |
| [`TaskScope`](file:///D:/git/codeprep/src/features/repository-context/domain/workingset/TaskScope.ts) | Domain | スコープ型（`narrow` / `standard` / `broad`）と決定DTO（`AdaptiveBudgetDecision`）の定義 |
| [`TaskScopeClassifier`](file:///D:/git/codeprep/src/features/repository-context/domain/workingset/TaskScopeClassifier.ts) | Domain | サブグラフの特徴量（`dominantFeatureRatio` 等）からスコープを判定 |
| [`AdaptiveBudgetPolicy`](file:///D:/git/codeprep/src/features/repository-context/domain/workingset/AdaptiveBudgetPolicy.ts) | Domain | スコープ別の動的予算テーブルおよび Early Stop しきい値を定義 |
| [`AdaptiveBudgetResolver`](file:///D:/git/codeprep/src/features/repository-context/domain/workingset/AdaptiveBudgetResolver.ts) | Domain | ユーザー明示指定（Explicit）と Adaptive Budget の調停オーケストレーション |
| [`WorkingSetBudgetApplier`](file:///D:/git/codeprep/src/features/repository-context/domain/workingset/WorkingSetBudgetApplier.ts) | Domain | スコープ連動の早期終了（Early Stop）および Recall Reserve 枠制限を適用 |

---

## 3. スコープ分類と予算ポリシー

### スコープ判定シグナル

1. **`dominantFeatureRatio`（主要モジュール集中度）**:
   - 上位ノードが属するモジュール/フィーチャーの割合。
   - `dominantFeatureRatio >= 0.75` かつ `topScore >= 0.85` の場合、特定レイヤーに極めて局所的な変更であるため **NARROW** と判定。
2. **`explicitPathCount`**:
   - ユーザーから明示的なパスが指定されている場合は直ちに **NARROW**。
3. **`seedFeatureCount` & 分散度**:
   - シードが 3 以上の異なるフィーチャーに跨がり、集中度が 60% 未満の場合は **BROAD**。
4. **その他**:
   - 上記の中間的なタスクは **STANDARD**（標準スコープ）。

### スコープ別動的予算テーブル

| スコープ | Max Files | Max Tokens | Recall Reserve 上限 | 対象タスクの想定 |
| :--- | :---: | :---: | :---: | :--- |
| **NARROW** | **5** | **7,000** | **1** | 単一クラス・Port/Adapter・局所バグ修正 |
| **STANDARD** | **8** | **10,000** | **2** | レイヤー間連携・標準的な機能追加・リファクタリング |
| **BROAD** | **12** | **15,000** | **3** | 横断的アーキテクチャ変更・ドキュメント横断調査 |

### 優先順位の厳格化 (Explicit Budget Override)
ユーザーが CLI 引数や MCP ツール呼び出しで明示的な予算（`budget.maxFiles` や `tokenLimit`）を指定した場合、Adaptive Budget の推論値よりも **明示指定が常に最優先（Source: `explicit`）** されます。

---

## 4. Selection Policy と Early Stop（早期打ち切り）

従来のアルゴリズムは、予算上限（maxFiles）に達するまで候補ノードを詰め込んでいました。
Phase 7I-A では **Diminishing Returns（限界効用逓減）** による早期打ち切りを導入しました：

- **CORE ノードの保護**: CORE ノード（優先度 1〜2）は Early Stop の対象外とし、確実に含める。
- **SUPPORTING の早期打ち切り**:
  - `narrow`: 基礎カバレッジ（CORE + SUPPORTING >= 2）確保後、スコアが `0.45` 未満または `topScore * 0.45` 未満で即座に打ち切り。
  - `standard`: 基礎カバレッジ（CORE + SUPPORTING >= 4）確保後、スコアが `0.35` 未満で打ち切り。
- **Recall Reserve の上限枠**: スコープに応じて（Narrow: 1, Standard: 2, Broad: 3）に厳格にクリップ。

---

## 5. 実測評価結果 (Phase 7I-A 検証)

### Golden Set (7 Tasks)

| メトリクス | Phase 7H-B (固定予算) | Phase 7I-A (Adaptive) | 変化 |
| :--- | :---: | :---: | :---: |
| **Must-Have Recall** | **72.6%** | **72.6%** | **0.0pt (完全維持)** |
| **Avg Files** | **9.6** | **6.4** | **-3.2 files (-33.3%)** |
| **Avg Estimated Tokens** | **9,828** | **6,450** | **-3,378 tokens (-34.4%)** |
| **Avg Compression Ratio** | 68.4% | 77.3% | +8.9pt |
| **Recall Reserve Bonus** | 1 | 1 | 貢献維持 |

#### スコープ別内訳
- **NARROW (5 tasks)**: Avg Files: 9.4 -> 5.0 (-46.8%), Recall: 76.7% -> 76.7% (維持)
- **STANDARD (1 task)**: Avg Files: 10.0 -> 8.0 (-20.0%), Recall: 25.0% -> 25.0% (維持)
- **BROAD (1 task)**: Avg Files: 10.0 -> 12.0 (+20.0%), Recall: 100.0% -> 100.0% (維持)

### Agent Integration & Dogfooding (3 Tasks)

| メトリクス | Phase 7H-B | Phase 7I-A | 評価 |
| :--- | :---: | :---: | :--- |
| **CLI / MCP Semantic Parity** | 100.0% | **100.0%** | 完全一致維持 |
| **Pack Saturation (Cap Hit Rate)** | 100.0% | **67.0%** | **固定上限張り付きを解消** |
| **Files Read Before Edit** | 1 (Control: 8) | **1 (Control: 8)** | 高速到達維持 (-87.5%) |
| **Time to First Edit** | 9.8s (Control: 54s) | **9.8s (Control: 54s)** | 5.5倍高速維持 |
| **Avg Unused Recommendation Ratio** | N/A | **89.6%** | 計測確立 |
