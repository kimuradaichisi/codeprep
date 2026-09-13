# Repository Knowledge Incremental Refresh (Phase 7F Architecture Document)

## 1. Goal / Non-goal

### 1.1 Goal
Phase 7E / 7E.5 で確立した SQLite Repository Knowledge Store に対し、Git revision の差分（ChangeSet）を起点として、**Producer ごとの影響範囲を安全に決定し、Full Rebuild を回避して正確な新しい Stable Snapshot を生成する**増分更新（Incremental Refresh）パイプラインを構築する。

- **Producer-aware Invalidation**: 各アナライザーの特性に応じて更新戦略（`FILE_LOCAL`, `DEPENDENT_CLOSURE`, `PRODUCER_FULL`, `FULL_REBUILD`）を決定する。
- **Correctness First**: 「変更ファイルだけを更新する」のではなく、不変条件とグラフの完全性を最優先し、偽陰性（False Negative）を完全に排除する。
- **No-op Fast Path**: 同一リビジョン時は解析処理を一切起動せず即座に復帰する。
- **Atomic Promotion**: 更新処理中に異常が発生しても直前の Stable Snapshot を一切破壊しない。
- **Full Rebuild Oracle**: Incremental Refresh で生成された Snapshot と、同一リビジョンで Full Rebuild された Snapshot の間で、すべての Node / Edge / Evidence / Relation Counts が 100% 完全一致することを実証する。

### 1.2 Non-goal
本フェーズでは以下の項目を明示的に対象外（DEFER）とする：
- **Dirty Working Tree Overlay**: 未コミットの変更を Stable Snapshot に混入させない（後続フェーズで Ephemeral Overlay として分離設計）。
- **Task -> Relevant Subgraph Query**: Phase 7G のスコープとする。
- **Context Pack v2 / Desktop UI / MCP v2**: Phase 7G 以降のスコープとする。
- **LLM による推測的補完**: 決定論的静的解析のみを採用し、推測による変更判定は行わない。
- **完全最小の依存影響解析**: 安全性を犠牲にした過度な局所化は行わない（1-hop Dependent Closure を基本とし、曖昧な場合は Producer-Full へ倒す）。

---

## 2. Git ChangeSet

Git のコミット間差分を抽象化した契約とし、Application 層が直接 Git コマンドを実行しないよう `RepositoryRevisionPort` で隔離する。

```typescript
export interface RepositoryFileChange {
  readonly path: string;
}

export interface RepositoryFileRename {
  readonly oldPath: string;
  readonly newPath: string;
}

export interface RepositoryChangeSet {
  readonly fromRevision: string;
  readonly toRevision: string;
  readonly added: readonly string[];
  readonly modified: readonly string[];
  readonly deleted: readonly string[];
  readonly renamed: readonly RepositoryFileRename[];
  readonly allChangedPaths: readonly string[];
}
```

---

## 3. Refresh Strategy Matrix

各 Producer（分析器）の抽出特性と依存波及範囲に基づき、4 段階の更新戦略を定義する。

| Strategy | 定義 | 適用基準 |
| :--- | :--- | :--- |
| **`FILE_LOCAL`** | 変更されたファイル単体を再解析すれば整合性が保たれる | 単一ファイルの AST / 正規表現のみで完結する事実 |
| **`DEPENDENT_CLOSURE`** | 変更ファイルに加え、そのシンボル・型に依存するファイル群を再解析 | 宣言変更がインポート元や派生クラス・インターフェース実装に波及する事実 |
| **`PRODUCER_FULL`** | リポジトリ全体ではなく、該当 Producer のみ全件再集計 | 履歴全体の集計値やリポジトリ大局の整合性が必要な事実 |
| **`FULL_REBUILD`** | Snapshot 全体を一から再構築 | Git 非対応、ベースライン消失、重大なコンパイラ設定変更時 |

### Producer ごとの決定理由 (Review Gate 0 準拠)

| Producer | Strategy | 決定理由 |
| :--- | :--- | :--- |
| **RepositoryIndex** | `FILE_LOCAL` | ファイルの追加・修正・削除・リネームはパス単位の事実であり、他ファイルへ波及しない。 |
| **StructuredKnowledgeIndex** | `FILE_LOCAL` | コードシンボルおよび Markdown 見出し定義はソースファイル単位で完結する。 |
| **DependencyScanner** | `FILE_LOCAL` | `import` 構文の検出は各ファイルのテキスト走査で完結する。 |
| **TypeScript Wiring** | `FILE_LOCAL` | `new Class()` やコンストラクタインジェクションの Composition Site はソースファイル内に閉起する。 |
| **TypeScript Language (`REFERENCES`)** | `DEPENDENT_CLOSURE` | クラス・関数・型のシグネチャ変更は、それを参照する既存の呼び出し側ファイル（Incoming References）に波及する。 |
| **TypeScript Language (`IMPLEMENTS` / `EXTENDS`)** | `DEPENDENT_CLOSURE` | インターフェースや基底クラスの変更は、派生型・実装クラスの解決結果に直接影響する。 |
| **GitCoChange** | `PRODUCER_FULL` | 直近のコミット追加により、ファイルペア間の共変更頻度（コミット履歴集計値）がグローバルに変動する。 |
| **DocGraph / Markdown Links** | `DEPENDENT_CLOSURE` | リンク先・リンク元の変更により、該当ドキュメントおよびリンクされたターゲットの双方向関係が変化する。 |
| **Compiler Config (`tsconfig.json`, `package.json`)** | `PRODUCER_FULL` (Fallback) | 型解決パスやコンパイル設定自体の変更時は、TypeScript Language Producer を全件再解析する。 |

---

## 4. RefreshPlan

Refresh の「判断（Plan）」と「実行（Execution）」を明確に分離し、Desktop UI や監査ログで「なぜこのファイルが更新対象になったのか」を追跡可能にする。

```typescript
export interface ProducerPlan {
  readonly producer: string;
  readonly strategy: 'FILE_LOCAL' | 'DEPENDENT_CLOSURE' | 'PRODUCER_FULL' | 'NO_OP';
  readonly targetPaths: readonly string[];
  readonly reason: string;
}

export interface RefreshPlan {
  readonly repositoryId: string;
  readonly fromSnapshotId: string;
  readonly fromRevision: string;
  readonly toRevision: string;
  readonly changeSet: RepositoryChangeSet;
  readonly producerPlans: readonly ProducerPlan[];
  readonly requiresFullRebuild: boolean;
  readonly plannedAt: string;
}
```

---

## 5. Producer-aware Invalidation

新しい Snapshot を生成する際、古い `RepositoryIR` から削除すべき Fact を、安易な文字列マッチではなく **`Evidence.analyzer`、`Evidence.sourcePath`、ノード ID、エッジ ID** に基づいて決定論的に除外する。

### Invalidation 規則
1. **Deleted Paths**:
   - `path == deletedPath` の File Node、およびそれに属する Child Node（Symbol, DocSection）を削除。
   - これらの Node を `sourceNodeId` または `targetNodeId` とするすべての Edge を削除。
2. **Renamed Paths**:
   - `oldPath` 由来の Node および Incident Edge を削除（`newPath` で新規生成）。
3. **Modified Paths (Producer-Specific)**:
   - `FILE_LOCAL` Producer: 変更パスを `sourcePath` とする Evidence / Edge を無効化。
   - `DEPENDENT_CLOSURE` Producer: 変更パスおよび影響範囲に含まれるパス由来の Evidence / Edge を無効化。
   - `PRODUCER_FULL` Producer: 該当 `analyzer` 由来の全 Edge を無効化。

---

## 6. Dependent Closure (Impact Resolver)

TypeScript Language 関係の波及範囲を、前 Snapshot のグラフ構造を用いて安全側に探索する。

### 1-Hop 探索対象
変更対象ファイル $F$ に対し、
$$\text{Closure}(F) = \{F\} \cup \text{IncomingEdges}(F, \{\text{DEPENDS\_ON}, \text{REFERENCES}, \text{IMPLEMENTS}, \text{EXTENDS}\})$$
- 変更ファイルが export しているシンボルを参照している全 importer。
- 変更ファイルが提供するインターフェースを実装している全 class。
- 変更ファイルが提供するクラスを継承している全 subclass。

---

## 7. Snapshot Assembly & Invariant Validation

1. Previous `RepositoryIR` を SQLite Store からロード。
2. `InvalidationRules` により無効化された Node / Edge を除去。
3. `RefreshPlan` に従い、対象ファイルのみ各 Producer を実行。
4. 新たに抽出された事実を `RepositoryIR` へマージ。
5. **Domain Invariant 検証**:
   - Dangling Edge（存在しない Node を指す Edge）の完全ゼロチェック。
   - 重複 Edge ID / 重複 Node ID のゼロチェック。
   - Evidence 欠落のゼロチェック。
6. 新規 Snapshot として SQLite に保存。

---

## 8. Atomic Promotion & Latest Pointer

- SQLite トランザクション内で新規 Snapshot レコードおよびその全 Node / Edge / Evidence を一括コミット。
- 保存および Invariant 検証がすべて成功した段階でのみ、`store_metadata` の `latest_snapshot_id` を新規 Snapshot ID へアトミックに切り替える。
- 途中でエラーが発生した場合はロールバックされ、既存の Stable Snapshot が引き続き latest として保護される。

---

## 9. Dirty Working Tree Policy

- `isWorkingTreeClean()` を検証。
- **Working Tree が Dirty な場合**: `status: 'DIRTY_WORKTREE'` を返却し、Stable Snapshot の更新を明示的に拒絶する。
- 未コミット変更の混入によるリビジョン不整合（コミットハッシュと実コード内容の不一致）を完全に防止する。

---

## 10. No-op Fast Path

- `previousSnapshot.revision === currentRevision` の場合：
  - 各 Producer、TypeChecker、Git Diff を一切起動しない。
  - `status: 'NO_OP'` と直前の Snapshot を即座に返却（所要時間 < 5ms）。

---

## 11. Full Rebuild Oracle (Golden Standard)

Incremental Refresh の正当性は、**同一リビジョンに対して一から Full Rebuild を行った Snapshot との差分比較（Oracle 検証）**によって保証する。

### 比較項目 (正規化後)
1. **Node 集合の完全一致**: すべての Node ID、Kind、Path、Name
2. **Edge 集合の完全一致**: すべての Edge ID、Relation Type、Source/Target Node ID
3. **Evidence 集合の完全一致**: Category、Analyzer、Confidence
4. **Relation Type ごとの総件数の完全一致**

---

## 12. Failure Recovery
- **Git 非対応環境**: `status: 'FULL_REBUILD_REQUIRED'` を返却し、安全に Full Rebuild 経路へ案内。
- **TypeChecker / Analyzer 例外**: ロールバックにより直前 Snapshot を保持。
- **SQLite 保存失敗**: トランザクションロールバックにより DB を汚染しない。

---

## 13. Phase 7G への入力
本フェーズによって、`Build`、`Load`、`Rebuild`、`Refresh` の 4 つのライフサイクルがすべて完成する。
これにより、次フェーズ **Phase 7G: Task Query / Relevant Subgraph** において、常に最新かつ完全な Repository Graph を前提とした部分グラフ探索・Seed Node 展開が可能となる。
