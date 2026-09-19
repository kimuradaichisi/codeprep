# Context Pack v2 & Working Set Architecture (Phase 7H-A)

## 1. Goal / Non-goal

### 1.1 Goal
Phase 7G で実現した Repository IR / SQLite Knowledge Store に基づく Relevant Subgraph（広めの候補空間）から、AI Coding Agent が迷わずに作業を開始できる最小十分な **Working Set** を決定論的に選択し、**Context Pack v2** として圧縮・生成して CLI から利用可能にする。

- **Task → Relevant Subgraph → Working Set Selection → Context Pack v2 → CLI**
- 単純な Top-N ではなく、**CORE + SUPPORTING + RECALL_RESERVE** の 3-Tier アーキテクチャで構成する。
- Graph Query による上位精度改善（MRR 0.714）を活かしつつ、旧 Candidate Discovery が強かった広範な Recall（85.7%）を失わない。

### 1.2 Non-goal (Phase 7H-B 以降へ分離)
- MCP v2 サーバー対応（Phase 7H-B で実施）
- Desktop UI への統合（Phase 7H-B で実施）
- LLM による要約 / 再ランキング（決定論的ルールと近傍関係で完結させる）
- 自動編集・パッチ適用
- Graph 可視化 UI

---

## 2. Relevant Subgraph vs Working Set

| 概念 | 役割 | 性質 |
| :--- | :--- | :--- |
| **Relevant Subgraph** | 広めの探索空間 (Exploration Space) | 知識グラフからシードおよび 1〜2 ホップの近傍エッジを辿って得られた全候補ノード群（数十ノード規模）。 |
| **Working Set** | 作業空間 (Working Set) | AI Coding Agent が今直接読み、作業開始に必要な最小十分なファイル・シンボルの集合（最大約 10 ファイル、約 1 万トークン程度）。 |

**原則:** 探索空間は残し、作業空間だけを圧縮する。

---

## 3. 3-Tier Working Set Model: CORE / SUPPORTING / RECALL_RESERVE

### 3.1 CORE
タスク達成のための直接的ターゲット。
- Explicit path / Manual pin
- Symbol-name seed
- 強い関係性（`IMPLEMENTS`, `BINDS_TO`, `INJECTS`）
- 最高信頼度の候補

### 3.2 SUPPORTING
CORE の動作理解・変更に必要な補助情報。
- Direct dependencies (`DEPENDS_ON`, `REFERENCES`)
- 関連テストファイル（`nodeKind: test`, `__tests__/*.test.ts`）
- アーキテクチャドキュメント / 仕様書（`docs/architecture`, `docs/spec`）
- 構成ファイル

### 3.3 RECALL_RESERVE
Graph Query では上位に入らなかったが、旧 Candidate Discovery で高いスコアを得ていた候補群から一定枠（最大 2〜3 枠）を確保。
- **目的:** グラフ探索の上位精度を維持しながら、旧方式の Recall を回復する。
- **不変条件:** Recall Reserve が CORE を押し出してはならない（CORE は最優先）。Supporting が枠を独占して Recall Reserve を排除しないよう、Supporting のファイル数にはクォータ制限（Quota）を設ける。

---

## 4. Budget Model & Deduplication

### 4.1 Budget Model (LLM 非依存)
決定論的近似による予算制約：
- `maxFiles`: 10 ファイル
- `maxNodes`: 20 ノード
- `maxEstimatedTokens`: 12,000 トークン（文字数 / 4 の決定論的計算）
- `maxBytes`: 64 KB

### 4.2 Deduplication (同一ファイル単位への整理)
同一ファイルに属する複数のシンボルやドキュメントセクションは、単一のファイルエントリとして統合され、`selectedRanges`（シンボル範囲）や理由（`reasons`）、関係パス（`relationPaths`）がマージされる。下位の重複候補は除外理由 `duplicateCoverage` として追跡される。

---

## 5. Context Granularity & Source Extraction

各エントリの粒度は以下から安全に選択される：
1. `FULL_FILE`: ファイル全文を読込
2. `SYMBOL_RANGE`: AST / 知識インデックスに基づく行範囲抽出
3. `DOC_SECTION`: 見出し・セクション範囲抽出
4. `METADATA_ONLY`: パス・ロール・関係理由のみ（本文は含めない）

**Fallback 規約:**
- 範囲取得不能または無効な範囲 → `FULL_FILE` へ安全にフォールバック
- ファイル読込不可（存在しない、アクセス権限なし） → `METADATA_ONLY` へフォールバック
- LLM による推測要約は一切行わない

---

## 6. Context Role Assignment

ファイルの雰囲気ではなく、ノード種別・エッジ関係・パス規則から機械的に割り当てる：
- seed / highest task score / explicit → `target`
- `DEPENDS_ON` / `REFERENCES` → `dependency`
- `IMPLEMENTS` / `BINDS_TO` / `INJECTS` → `dependency` または `supporting`
- test path / `nodeKind: test` → `test`
- architecture doc (`docs/architecture`) → `architecture`
- spec doc (`docs/spec`, `Requirements.md`) → `specification`
- その他 → `supporting`

---

## 7. Context Pack v2 Contract

```json
{
  "schemaVersion": "2",
  "task": "...",
  "strategy": "knowledge-subgraph",
  "confidence": {},
  "workingSet": {
    "core": [],
    "supporting": [],
    "recallReserve": []
  },
  "context": [
    {
      "path": "src/...",
      "role": "target",
      "tier": "core",
      "granularity": "FULL_FILE",
      "selectedRanges": [],
      "estimatedTokens": 500,
      "score": 0.95,
      "reasons": ["seed: symbol-name"],
      "provenance": "explicit-seed",
      "relationPaths": []
    }
  ],
  "excluded": [
    {
      "nodeId": "...",
      "path": "...",
      "score": 0.3,
      "reason": "budgetExceeded",
      "tierCandidate": "supporting",
      "detail": "Supporting files quota reached"
    }
  ],
  "metrics": {
    "subgraphNodes": 27,
    "workingSetEntries": 10,
    "contextFiles": 10,
    "contextRanges": 0,
    "estimatedTokens": 9772,
    "compressionRatio": 0.684
  }
}
```

---

## 8. CLI Integration

CLI から Context Pack v2 をシームレスに利用可能：
```bash
# JSON を正本として出力
npm run context -- --task "..." --strategy knowledge --format json

# 人間・Agent用の Markdown 表示アダプター
npm run context -- --task "..." --strategy knowledge --format markdown
```
Windows npm 環境特有の引数崩れに対しても、環境変数フォールバックと positional 引数解決により堅牢に動作する。

---

## 9. Golden Set 実測評価 (Phase 13〜16)

Golden Set (7 Tasks) における比較結果：

| 指標 | Baseline (旧Candidate Only) | Graph Query (Phase 7G) | Context Pack v2 (Phase 7H-A) | 変化・改善効果 |
| :--- | :---: | :---: | :---: | :--- |
| **Hit@5** | 71.4% | **71.4%** | **71.4%** | 上位高精度を維持 |
| **MRR** | 0.620 | **0.714** | **0.714** | 上位ランク品質を維持 |
| **Must-Have Recall** | 61.9% | 59.5% | **72.6%** | **+13.1% 向上 (最高値達成)** |
| **平均ファイル数** | 10.0 | 10.0 (Top-10) | **9.6** | 10 ファイル以内に抑制 |
| **平均推定トークン** | - | - | **9,772** | 約 1 万トークンへ安全に圧縮 |
| **平均圧縮率** | 0.0% | 0.0% | **68.4%** | 探索空間から作業空間を 68.4% 圧縮 |
| **Reserve Bonus** | - | 0 | **+1** | TASK-07 などで必須ドキュメントを救済 |

### 成果の要点
1. **Recall Regression の完全克服:** Graph Query で 59.5% に低下していた Must-have Recall を、Recall Reserve の導入により **72.6%** まで大幅に改善した。
2. **ノイズの圧縮:** Relevant Subgraph（約 27 ノード）をそのまま渡さず、平均 9.6 ファイル、9,772 トークンへと 68.4% 圧縮した。
3. **説明可能性 (Explainability):** 各ファイルがなぜ選ばれたか（Inclusion Reasons, Provenance, Relation Paths）、なぜ除外されたか（`budgetExceeded`, `duplicateCoverage`, `weakEvidence` 等）が完全に追跡可能となった。

---

## 10. Agent Evaluation (考察)

同一タスクにおいて、従来のパック（Legacy Pack）と Context Pack v2 をエージェント視点で比較した場合の観察：
- **不要な探索の削減:** 従来のファイル名・テキストマッチによるノイズ（無関係なテストファイルや同名ユーティリティ）が、グラフ近傍に基づく関連度判定とクォータ制御により排除された。
- **依存・テストの同時把握:** CORE ファイルだけでなく、直接の依存関係（`DEPENDS_ON`）や関連テストが `supporting` として最初から手に入るため、エージェントが追加で `grep` や `list_dir` を繰り返す必要が減少する。
- **タスク着手速度の向上:** 約 9,700 トークンと手頃なサイズに抑えられているため、LLM のコンテキストウィンドウを圧迫せず、即座に編集フェーズへ移行できる。

---

## 11. Review Gates 判定

- **Review Gate 1 (Selection Correctness): PASS**
  - CORE target の全落ちなし
  - Explicit path を確実に最優先
  - Recall Reserve が CORE を押し出さない（優先度・クォータ制約）
  - 存在しない range の捏造なし（安全な fallback）
- **Review Gate 2 (Compression): PASS**
  - Relevant Subgraph 全体を渡さず 68.4% 圧縮
  - Budget Model が確実に機能
  - 重複ファイルが `duplicateCoverage` として排除
- **Review Gate 3 (Explainability): PASS**
  - Top entry の理由、関係パス、tier、role、除外理由がすべて JSON / Markdown で追跡可能

---

## 12. Phase 7H-B への入力

Phase 7H-A で完成した Working Set Selection および Context Pack v2 は、以下の形で Phase 7H-B に引き継がれる：
- **MCP v2:** `getContextPack(task, strategy="knowledge")` ツールとして外部 AI コーディングエージェントに公開。
- **Desktop UI:** Context Pack v2 の Working Set（Core, Supporting, Recall Reserve）および圧縮メトリクスを視覚的に表示・確認できるパネルの追加。
