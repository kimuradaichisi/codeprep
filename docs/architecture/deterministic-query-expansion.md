# 決定論的クエリ拡張とシードRecall改善アーキテクチャ (Phase 7J-A)

## 1. 概要と背景

Phase 7I-A までの Context Pack v2 では、適応型バジェット（Adaptive Budget）によりファイル数・トークン数の適正化を達成していました。しかし、タスクから知識グラフへの入り口となる **Seed Discovery** において、以下の弱点が残されていました：

1. **TASK-01 (IR Mapping) の低Recall (25%)**:
   - タスク文に含まれる語彙（例: `IR Mapping`, `Git`, `Document Graph`）と、コードベース内の具象識別子（例: `DerivedRelationMapper`, `RepositoryEvidence`, `GitCliRevisionAdapter`）の間に語彙の乖離（Vocabulary Mismatch）が存在し、初期シードから脱落。
2. **外部依存なしの決定論的制約**:
   - LLM によるクエリ書き換えや Vector DB / Embedding による曖昧検索は、実行速度、コスト、非決定性（ハルシネーション・環境依存）の観点から禁止。
   - 完全ローカル・ミリ秒オーダーで再現可能な **決定論的（Deterministic）クエリ拡張** が必須。

Phase 7J-A では、リポジトリ知識ストア（SQLite IR）に蓄積されたシンボル・パス・見出しから語彙インデックス（`RepositoryVocabularyIndex`）を構築し、**形態素・複合語・複合識別子・語族** を用いた決定論的クエリ拡張パイプラインを導入しました。

---

## 2. コア設計と処理フロー

```
Task Query ("Update context pack v2 architecture docs with mcp integration details")
        │
        ▼
[IdentifierNormalizer] ──(ASCII/CJK 分割, CamelCase/SnakeCase 分解, 接尾辞正規化)
        │
        ▼
    Token Array: ["update", "context", "pack", "v2", "architecture", "docs", "mcp", "integration", "details"]
        │
        ├─────────────────────────────────────────┐
        ▼                                         ▼
[PhraseMatcher]                           [DeterministicQueryExpander]
(2-3 token 連語照合)                        (形態素・語族・複合識別子展開)
  "context-pack-v2"                         "ContextPackV2", "ContextPackViewer", ...
        │                                         │
        └───────────────────┬─────────────────────┘
                            ▼
           Expanded Query Terms + Trace Data
                            │
                            ▼
                      [SeedResolver]
        (SQLite ノード検索: symbol, file, heading, token)
                            │
                            ▼
                      [SeedScorer]
   (完全一致/前方一致/ファイル名一致/ドキュメント優先度/曖昧性減点)
                            │
                            ▼
                High-Recall Seed Nodes
                            │
                            ▼
                 [Relevant Subgraph]
```

### 主要コンポーネント一覧

| コンポーネント | レイヤー | 責務 |
| :--- | :--- | :--- |
| [`IdentifierNormalizer`](file:///D:/git/codeprep/src/features/repository-context/domain/ir/query/IdentifierNormalizer.ts) | Domain | タスク文・識別子の正規化、ASCII/CJK境界分離、キャメルケース・ケバブケース分解 |
| [`QueryMorphology`](file:///D:/git/codeprep/src/features/repository-context/domain/ir/query/QueryMorphology.ts) | Domain | 英語の屈折変化（複数形・過去形・進行形・三人称単数）の決定論的正規化と活用形展開 |
| [`RepositoryVocabularyIndex`](file:///D:/git/codeprep/src/features/repository-context/application/ir/query/RepositoryVocabularyIndex.ts) | Application | SQLite IR の全ノード（symbol/file/doc-section）から決定論的語彙インデックスをメモリ上にインデックス化・キャッシュ |
| [`PhraseMatcher`](file:///D:/git/codeprep/src/features/repository-context/application/ir/query/PhraseMatcher.ts) | Application | 連続する 2〜3 トークンのフレーズ結合（スペース/ハイフン/連結）と完全一致フレーズの照合 |
| [`DeterministicQueryExpander`](file:///D:/git/codeprep/src/features/repository-context/application/ir/query/DeterministicQueryExpander.ts) | Application | 語彙インデックスを活用し、Exact/Phrase/Term-Family/Morphology による決定論的クエリ展開 |
| [`SeedScorer`](file:///D:/git/codeprep/src/features/repository-context/application/ir/query/SeedScorer.ts) | Application | 一致種別（シンボル/ファイル名/パス/見出し）、拡張方式ボーナス、非本番減点、曖昧性減点を統合したスコアリング |
| [`SeedResolver`](file:///D:/git/codeprep/src/features/repository-context/application/ir/query/SeedResolver.ts) | Application | 展開語を用いたシード候補の収集、重複除去、ファイルノード優先トポロジーソート、Trace付き結果返却 |

---

---

## 3. 実測成果と検証結果

### 3.1 Golden Set (7 Tasks) 最終実測成果 (Phase 7J-A Closeout)

| 指標 | Baseline (Phase 7I-A) | 修正前 (Expansionのみ) | Closeout 修正後 (最終) | 総合変化 |
| :--- | :--- | :--- | :--- | :--- |
| **Hit@5** | 71.4% (5/7) | 100.0% (7/7) | **100.0% (7/7)** | **+28.6pt** (全タスクがTop 5到達) |
| **Hit@10** | 85.7% (6/7) | 100.0% (7/7) | **100.0% (7/7)** | **+14.3pt** |
| **Subgraph Recall@10** | 61.9% | 77.4% | **77.4%** | **+15.5pt** (Subgraph大幅強化) |
| **Subgraph MRR** | 0.620 | 0.809 | **0.809** | **+0.189** |
| **TASK-01 Must-Have Recall** | 25.0% (1/4) | 25.0% (1/4) | **75.0% (3/4)** | **+50.0pt** (シード脱落完全解消) |
| **Context Pack Recall** | 72.6% | 65.5% (-7.1pt 回帰) | **77.4%** | **+4.8pt 純増** (下流回帰を解消) |
| **Avg Query Duration** | 133.0ms | 187.9ms | **174.6ms** | 許容基準(266ms: 2倍以内)をクリア |
| **Avg Tokens** | 9,828 tokens | 4,505 tokens | **4,227 tokens** | **-57.0%** (圧縮率 71.0%) |
| **CLI / MCP Parity** | 100.0% | 100.0% | **100.0%** | 完全パリティ維持 |

### 3.2 Holdout Set (5 Tasks) 汎化性能・Cold/Warm 計測

| タスクID | 分類 | Seeds Rec@10 | Graph Rec@10 | Pack Recall | 処理時間 (Warm) | 採択状況 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HOLDOUT-01** | IR Derived Mapper | 50.0% | **100.0%** | 50.0% | 529.1ms | DerivedRelationMapper 採択 |
| **HOLDOUT-02** | Port Adapter Revision | **100.0%** | **100.0%** | **100.0%** | 250.4ms | 両ファイル採択 (100%) |
| **HOLDOUT-03** | DI Wiring Relation | **100.0%** | **100.0%** | **100.0%** | 304.1ms | 両ファイル採択 (100%) |
| **HOLDOUT-04** | MCP Adaptive Decision | **100.0%** | **100.0%** | **100.0%** | 346.0ms | 両ファイル採択 (100%) |
| **HOLDOUT-05** | Docs Persistence Model | 50.0% | 0.0% | 50.0% | 156.8ms | Reserve経由で1件救済 |
| **Holdout 平均** | - | **80.0%** | **80.0%** | **80.0%** | **317.3ms** | **Pack Recall: 80.0%** |

- **Cold Query Duration (初回インデックス構築込み)**: **509.5ms**
- **Avg Warm Query Duration**: **317.3ms**
- **HOLDOUT-05 (Docs中心タスク) の分析と DEFER**:
  - `docs/architecture/repository-ir-domain-model.md` が Graph 展開で脱落。
  - 原因: ドキュメント間のリンク（`DOC_RELATION`）がコードに比べて疎であり、1-hop 探索でランク外に落ちやすいため。
  - 判定: ドキュメント関連エッジの拡充および Traversal 改善は **Phase 7J-B へ DEFER**。

---

## 4. 信頼性とガードレール (Downstream 連携保護)

1. **ゼロ LLM / 決定論的保証**:
   - 外部 API 呼び出しやネットワーク通信、LLM のランダム性を一切排除。
   - すべての展開ルールとスコアリングは純粋関数として決定論的に動作。
2. **シード優先度逆転防止 (`CandidateClassifier`)**:
   - 超高スコア（`score >= 0.95`）のシードは rank に関係なく確実に `CORE`（priority 2）に割り当て。
   - `SUPPORTING` に回ったシードも `priority: 2.5` を付与し、通常の依存先（3）やテスト（4）より上位で保護。
3. **モジュール粒度スコープ判定 (`TaskScopeClassifier` & `AdaptiveBudgetResolver`)**:
   - feature キーの抽出粒度を `features/<feature>/<layer>`（application, domain, infrastructure等）まで認識。
   - 高信頼度シード（`highConfidenceSeedCount >= 3`）が複数モジュール（`seedFeatureCount >= 2`）に分散している場合は、協調修正タスクとして `STANDARD`（maxFiles=8）以上を割り当て、過剰な `NARROW`（上限5ファイル）による脱落を防止。
4. **Ambiguity Penalty（曖昧語ペナルティ）**:
   - 出現頻度が高すぎる一般的な語彙（例: `context`, `pack`, `manager`）には出現頻度に応じた減点を適用し、誤展開によるノイズ混入を抑制。
5. **Intent-based Target Routing**:
   - コード実装タスクでは `docs/` や `__tests__/` に微小な優先度ペナルティ（-0.04）を適用。
   - タスク文がドキュメント修正を含む場合（`isDocFocused`）はペナルティを解除し、`.md` ファイルのシード選定を最適化。
