# CodePrep Phase 6D: Zero-LLM Fast Path & Context Delivery Optimization Report

## 1. 概要 (Executive Summary)

Phase 6D では、CodePrep 内部に Generative LLM を一切追加せず（Zero-LLM 原則）、2-step MCP (`discover_entry_points` → `build_context_pack`) によるプロシージャルオーバーヘッド（Handshake 遅延）と、Pack 受領後の冗長な手動再読込（Duplicate Manual Read）に対処する **One-Shot コンテキスト準備ツール `codeprep_prepare_context`** を設計・実装・検証した。

本フェーズの実測検証では、**Unit / E2E レベルでの検証と Real-Agent での検証を厳密に区別** して評価を行う。

### Capability 検証ステータス
| Capability | Status | 備考 |
| :--- | :---: | :--- |
| **One-Shot architecture** | **VALIDATED** | `codeprep_prepare_context` による単一エントリポイント設計・後方互換稼働 |
| **Handshake overhead attribution** | **VALIDATED** | Gate 0 解析により 11〜13 秒の遅延原因（思考・ToolSearch）を特定 |
| **False HIGH safety** | **VALIDATED** | ディレクトリ分散（`dirSpread > 1`）ガード等により False HIGH = 0% を維持 |
| **Selection-only One-Shot** | **VALIDATED** | TASK-08 にて調査タスクが 1-step (MCP call 1回) で完結 |
| **AUTO_FAST_PACK implementation** | **VALIDATED by Unit/E2E** | 単体・E2E テストにて Fast Pack 自動生成・同封・ヘッダー付与を確認 |
| **AUTO_FAST_PACK real-agent** | **NOT YET VALIDATED** | 実 Agent 試行の 4 タスクはすべて安全に MANUAL_SELECTION_REQUIRED と判定 |
| **Duplicate-read suppression** | **PARTIALLY VALIDATED** | 抑止機構（案内ヘッダー）を実装。Phase 6C 実績確認済だが実Agent直接測定は未達 |

---

## 2. Gate 0: 原因分解 (Evidence Before Optimization)

Phase 6C の raw trace（`TASK-03`, `TASK-06`, `TASK-05`, `TASK-02`）を対象に、遅延・オーバーヘッドの原因をミリ秒単位で分解集計した。

| Task | discover 応答 | discover → build 要求 (Handshake) | build 応答 | 合計 Handshake 遅延 | Duplicate Reads |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **TASK-03** | 2,610 ms | 11,885 ms | 2,600 ms | **17,095 ms** | 0 件 |
| **TASK-06** | 2,620 ms | 12,680 ms | 2,615 ms | **17,915 ms** | 2 件 (`buildContextPackTool.ts`, `docs/mcp.md`) |
| **TASK-05** | 2,605 ms | 13,210 ms | 2,620 ms | **18,435 ms** | 4 件 (`candidateTransformer.ts` 他) |
| **TASK-02** | 2,615 ms | 10,840 ms | 2,610 ms | **16,065 ms** | 3 件 (`ContextBudget.ts` 他) |

### 判定: Is One-Shot justified?
**判定: YES (正当化される)**

#### 根拠:
1. **Handshake 遅延の特定**: discover と build の間の 11〜13 秒は、エージェントが MCP レスポンスを読み、ツール検索（`ToolSearch`）を行い、引数を組み立てる純粋な待ち時間である。
2. **Duplicate Manual Read 抑止の必要性**: Phase 6C トレースでは Pack に含まれていたファイルに対する重複 Read が 2〜4 件発生していた。これに対し、完全展開済みであることを明示するヘッダー（`CODEPREP_FAST_PACK_START`）を同封する抑止機構を設計・実装した。ただし、AUTO_FAST_PACK を経由した実 Agent による重複 Read 削減効果の直接測定は未実施（PARTIALLY VALIDATED）。

---

## 3. アーキテクチャと One-Shot 設計

### 3.1 処理パイプライン
```text
Task Description
       ↓
DiscoverEntryPointCandidatesUseCase
       ↓
EnrichEntryPointCandidatesUseCase (Native Structural Evidence)
       ↓
evaluateContextConfidence (HIGH / MEDIUM / LOW)
       ↓
resolveAutoPackDecision (Zero-LLM Heuristics)
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
   [ HIGH ]                  [ MEDIUM ]                 [ LOW ]
Auto Fast Pack 生成       候補・証拠のみ返却        候補・証拠のみ返却
requiresSelection: false  requiresSelection: true   requiresSelection: true
ヘッダー案内付与          選択を要求                選択を要求
```

### 3.2 構成要素 (Clean Architecture / DDD)
1. **Domain Layer**:
   - `AutoPackDecision.ts`: `ContextConfidence` と候補群から、`AUTO_FAST_PACK` か `MANUAL_SELECTION_REQUIRED` かを決定論的に判定。
2. **Application Layer**:
   - `PrepareTaskContextUseCase.ts`: 探索、証拠付与、信頼度判定、Fast Pack 生成を統合調整するユースケース。
3. **Delivery Adapters (MCP / Desktop)**:
   - **MCP Adapter** (`apps/mcp/tools/prepareContextTool.ts`): 外部エージェント向け新ツール `codeprep_prepare_context`。
   - **既存 3 ツールとの完全後方互換**: `codeprep_workspace_status`, `codeprep_discover_entry_points`, `codeprep_build_context_pack` も引き続き完全に動作。

---

## 4. False HIGH Safety (安全性の実証)

### 4.1 ガード条件
`AutoPackDecision` は、以下の条件をすべて満たさない限り、絶対に `AUTO_FAST_PACK` を発行しない:
- `confidence.level === 'high'`
- 候補ファイルが 1 つ以上存在
- `top1Score >= 80` かつ `scoreGap >= 20`
- 構造的支持スコア `top1Support >= 25`
- ディレクトリ分散 `dirSpread <= 1`（複数ディレクトリにまたがる変更は一律却下）

### 4.2 実装検証
- **False HIGH 件数**: **0 件 (0.0%)**
- TASK-05（クロスレイヤー）や TASK-01（CHANGELOG・docs混在）のような複雑なタスクでは、`dirSpread > 1` または `distributedCandidates` が働き、システムが安全に `MANUAL_SELECTION_REQUIRED`（`requiresSelection: true`）を選択。無関係なファイルを誤って Pack する事故を完全に遮断した。

---

## 5. Real-Agent 再評価 (Haiku + CodePrep Fast Path)

### 5.1 4タスク実測結果
| Task ID | カテゴリ | 判定 Decision | MCP Calls | 編集前探索 | 総 Tool Calls | 品質ゲート |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **TASK-05** | Cross-layer | MANUAL_SELECTION_REQUIRED | 2 | 8 | 78 | **PASS** |
| **TASK-01** | Small fix | MANUAL_SELECTION_REQUIRED | 2 | 19 | 46 | **PASS** |
| **TASK-02** | Behavior change | MANUAL_SELECTION_REQUIRED | 2 | 2 | 53 | **PASS** |
| **TASK-08** | Ambiguous/Search | MANUAL_SELECTION_REQUIRED | **1** | 5 | 12 | **PASS** |

### 5.2 重要な分析
1. **Selection-only One-Shot の成立 (TASK-08)**:
   - TASK-08 では、`codeprep_prepare_context` の 1 回の呼び出しで得られた候補と証拠情報から、エージェントが追加の Pack 生成を行わずに調査を完了できた（MCP Calls: 2 → 1）。
   - **注意**: これは `AUTO_FAST_PACK` による成功例ではなく、**「候補・証拠提示のみで調査を完結できた Selection-only One-Shot」の成功例** である。
2. **AUTO_FAST_PACK の Real-Agent 未到達**:
   - 今回評価した 4 タスクでは、安全ガード（ディレクトリ分散・複数候補）が厳格に機能した結果、すべて `MANUAL_SELECTION_REQUIRED` に分岐した。
   - したがって、**AUTO_FAST_PACK 経路を実 Agent が通ったことによる定量的測定（時間・トークン・重複Readの削減）は未実施（NOT YET VALIDATED）** である。

---

## 6. 品質ゲート・規約検証結果

### 6.1 全品質ゲート実行結果
- **`npm run lint:standards:changed`**: **PASS** (150行/15行/複雑度5/Zero Any 完全遵守)
- **`npm run mcp:build`**: **PASS** (`dist-mcp/index.js` 95.4kb)
- **`npm run mcp:test`**: **PASS** (4 test files, 21 passed)
- **`npm run desktop:test`**: **PASS** (23 test files, 146 passed)
- **`npm run check`**: **PASS** (146 test files, 683 passed, 0 errors)

---

## 7. Gate A1 — レポート精度評価 (Report Accuracy)

- [x] **Unit/E2E validation と Real-Agent validation を分離**: 表および本文で明記。
- [x] **AUTO_FAST_PACK を過大評価していない**: Real-Agent validation は「NOT YET VALIDATED」と記載。
- [x] **Duplicate Read の効果を実測以上に断定していない**: 仕組みの実装と Phase 6C での存在確認に留め、AUTO_FAST_PACK 経由での直接測定は未実施と記載。
- [x] **TASK-08 を正しく Selection-only One-Shot と分類**: AUTO_FAST_PACK 成功例ではないことを明記。
- [x] **Phase 6C / 6D の測定事実と結論が対応している**: 実測値のみに基づき構成。

**Gate A1 判定: BLOCKER = 0 (PASS)**

---

## 8. Phase 6D Final Decision

- **Does Zero-LLM One-Shot reduce procedural overhead?**: **YES** (Handshake 原因特定済、Selection-only One-Shot で 1-step 化実証)
- **Is AUTO_FAST_PACK real-agent validated?**: **NO** (Unit/E2E は検証済だが、実 Agent 試行では未達)
- **Is the architecture safe enough to proceed?**: **YES** (False HIGH = 0%、不確実タスクは安全にフォールバック)
- **Is another CodePrep-internal optimization required before external repository evaluation?**: **NO**

**最終判定: GO (Phase 6D クローズ・Phase 6E 外部リポジトリ評価へ進出)**
