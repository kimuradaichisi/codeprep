# Repository Knowledge Store (Phase 7E Architecture Document)

## 1. SQLite を選定した理由（および他候補との比較）

CodePrep における Repository Knowledge（構造・依存・配線・Git共変更・ドキュメント関係などの統合 IR）の永続化先として **SQLite** を選定した。

### 比較評価

| 候補 | メリット | デメリット / 採用見送り理由 |
| :--- | :--- | :--- |
| **SQLite (採用)** | ゼロ設定、単一ファイル（ポータブル）、超軽量、ACID保証、インデックス・クエリ表現力十分、Node 22 標準搭載 | 複雑なグラフ再帰探索で複数クエリ/CTEが必要だが、近傍探索・DAG探索程度なら十分高速 |
| **Neo4j / Memgraph** | Cypher クエリによる高度なグラフ走査、最短経路探索 | 外部サービス起動（Docker等）が必要で、VSCode 拡張機能や CLI ツールのポータブル・ゼロコンフィグ原則に反する |
| **DuckDB** | 分析クエリ・列指向集計に極めて強い | グラフ探索やピンポイントなノード/エッジ更新に向かず、ネイティブバイナリの配布オーバーヘッドが大きい |
| **JSON / JSONL ファイル** | 人間可読、追加実装が最も容易 | 部分読み込み不可（毎回全量パース）、インデックス検索不可、ファイル肥大化時のメモリ圧迫、ACID非対応 |

SQLite は「**ユーザーのローカルマシンで追加インフラ不要・瞬時に起動・ACID 安全・高速インデックス検索**」という VSCode 拡張機能の非機能要件に完全に合致する。

---

## 2. なぜ GraphDB ではなく SQLite Relational Schema なのか

1. **ゼロ外部インフラ原則**: CodePrep は VSCode 拡張機能およびスタンドアロン CLI としてローカル環境で動作する。Docker コンテナや独立したデーモンプロセス（Neo4j 等）の起動を強制することはできない。
2. **Repository IR のスケール特性**: 単一リポジトリのコードシンボルやファイル数は数千〜数万ノード、数万〜数十万エッジのオーダーである。この規模であれば、SQLite の B-Tree インデックス（`source_node_id`, `target_node_id`, `relation_type`）で数ミリ秒〜十数ミリ秒の高速近傍探索が可能である。
3. **柔軟な正規化と属性の同居**: ノード・エッジの主要検索キー（ID、Type、Path、Confidence）はリレーショナル列としてインデックス化し、拡張属性（AST location, metadata 等）は JSON 列に逃がすことで、スキーマの剛健性と柔軟性を両立できる。

---

## 3. SQLite Schema 設計

### 3.1 テーブル定義とインデックス

```sql
-- 1. ストアメタデータ
CREATE TABLE IF NOT EXISTS store_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 2. リポジトリスナップショット (世代管理)
CREATE TABLE IF NOT EXISTS repository_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  workspace_root TEXT NOT NULL,
  revision TEXT,
  created_at TEXT NOT NULL,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_snapshots_repo_rev ON repository_snapshots(repository_id, revision);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON repository_snapshots(created_at);

-- 3. ノード (ファイル / シンボル / ドキュメントセクション等)
CREATE TABLE IF NOT EXISTS repository_nodes (
  snapshot_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  node_kind TEXT NOT NULL,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol_kind TEXT,
  location_start_line INTEGER,
  location_end_line INTEGER,
  attributes TEXT,
  PRIMARY KEY (snapshot_id, node_id),
  FOREIGN KEY (snapshot_id) REFERENCES repository_snapshots(snapshot_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_nodes_snapshot_kind ON repository_nodes(snapshot_id, node_kind);
CREATE INDEX IF NOT EXISTS idx_nodes_snapshot_path ON repository_nodes(snapshot_id, path);

-- 4. エッジ (構造・参照・配線・依存関係)
CREATE TABLE IF NOT EXISTS repository_edges (
  snapshot_id TEXT NOT NULL,
  edge_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  is_derived INTEGER NOT NULL DEFAULT 0,
  confidence REAL NOT NULL DEFAULT 1.0,
  attributes TEXT,
  PRIMARY KEY (snapshot_id, edge_id),
  FOREIGN KEY (snapshot_id) REFERENCES repository_snapshots(snapshot_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_edges_source ON repository_edges(snapshot_id, source_node_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_edges_target ON repository_edges(snapshot_id, target_node_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_edges_relation ON repository_edges(snapshot_id, relation_type);

-- 5. エビデンス (抽出元アナライザー・確信度根拠)
CREATE TABLE IF NOT EXISTS repository_evidences (
  snapshot_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  edge_id TEXT NOT NULL,
  category TEXT NOT NULL,
  analyzer TEXT NOT NULL,
  confidence REAL NOT NULL,
  source_path TEXT,
  source_location TEXT,
  description TEXT,
  PRIMARY KEY (snapshot_id, evidence_id),
  FOREIGN KEY (snapshot_id) REFERENCES repository_snapshots(snapshot_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_evidences_edge ON repository_evidences(snapshot_id, edge_id);
```

---

## 4. Snapshot / Node / Edge / Evidence の永続化責務

- **`repository_snapshots`**: 各解析実行の境界。Git コミット（revision）、ワークスペースパス、タイムスタンプを保持。
- **`repository_nodes`**: `RepositoryNode`（Entity）。`snapshot_id` と `node_id` の複合主キー。
- **`repository_edges`**: `RepositoryEdge`（Entity）。有向関係（`source_node_id` → `target_node_id`）。
- **`repository_evidences`**: `Evidence`（Value Object）。エッジに紐づく事実の出所、アナライザー種別、確信度根拠。

---

## 5. JSON 列と正規化列の使い分け基準

- **正規化列（First-class Columns）**:
  - クエリの `WHERE`, `JOIN`, `ORDER BY` で頻繁にフィルタ・結合される項目。
  - 例: `snapshot_id`, `node_id`, `path`, `node_kind`, `source_node_id`, `target_node_id`, `relation_type`, `confidence`。
- **JSON 列（Blob/Text Column）**:
  - ノード・エッジの個別固有な拡張属性（メタデータ、未決定のオプショナル情報）。
  - 例: `attributes`, `metadata`, `source_location`。
  - スキーマ変更なしに将来のアナライザー拡張や言語独自情報を安全に保持できる。

---

## 6. SQLite ドライバ選定理由

### Node.js 22 内蔵 `node:sqlite` (`DatabaseSync`) の採用

| ドライバ | 評価 |
| :--- | :--- |
| **`node:sqlite` (採用)** | Node.js 22.5.0+ 内蔵。外部 npm パッケージ依存ゼロ、Native node-gyp ビルド一切不要、Windows/macOS/Linux 完全互換。起動オーバーヘッド最小。 |
| **`better-sqlite3`** | 極めて高速だが、C++ Native Addon のため VSCode Extension Host や環境ごとの事前ビルド（prebuild）問題のリスクが大きい。 |
| **`sql.js` (WASM)** | Pure JS/WASM でポータブルだが、ディスクへの直接同期・大量データのメモリ消費・速度面で Native に劣る。 |

本プロジェクトでは `SqliteDriver` インターフェースを設けて抽象化し、`NodeSqliteDriver` が安全に `node:sqlite` をロードして動作する設計を採用した。

---

## 7. In-Memory Mode と File-backed Mode の使い分け

- **File-backed Mode (`.codeprep/repository-knowledge.db`)**:
  - 通常の CLI 実行および VSCode 拡張機能での本番動作。
  - 解析結果をキャッシュし、次回以降の高速ロード・Task 問い合わせを実現。
- **In-Memory Mode (`:memory:`)**:
  - 単体テスト・CI・一時的な検証。
  - ディスク I/O を行わず、超高速（数十ミリ秒以内）にクリーンな状態でテストを実行。

---

## 8. Atomic Write / Transaction 保証

- `SqliteRepositoryIRWriter.save(ir)` は `BEGIN IMMEDIATE TRANSACTION` から `COMMIT` までの単一トランザクション内で実行される。
- 保存処理の途中でエラーが発生した場合、`ROLLBACK` され、中途半端なノード・エッジが DB 内に残らない（`SqliteRepositoryKnowledgeStore.test.ts` でテスト検証済み）。
- `snapshot_id` が既に存在する場合は、同トランザクション内で旧データを事前に削除してから再書き込みを行う。

---

## 9. Load 時の Repository IR 復元保証 (Fidelity)

`SqliteRepositoryIRReader.load(snapshotId)` は以下を完全に復元する:
1. `RepositorySnapshot`（ID、repositoryId、revision、workspaceRoot、createdAt、metadata）
2. 全 `RepositoryNode`（Map として復元、location、attributes のパース）
3. 全 `RepositoryEdge`（source/target/relationType/confidence/attributes）
4. 各エッジに紐づく全 `Evidence`（category、analyzer、confidence、sourceLocation）
- 実機スモークテストにて、元の IR のノード数・エッジ数と復元後の IR のノード数・エッジ数が **100% 完全一致** することを確認済み。

---

## 10. Schema Migration 戦略

- `SqliteSchemaMigrator.migrateSchema(driver)` により、DB 接続時にスキーマバージョンを確認。
- `store_metadata` テーブルの `schema_version`（初期値 `1.0.0`）を照合し、DDL（`CREATE TABLE IF NOT EXISTS` / インデックス）を冪等に適用。
- 将来の破壊的変更時はマイグレーションステップまたは DB 再生成を自動トリガー可能。

---

## 11. Clean Rebuild 戦略

- Repository が正本（Source of Truth）であり、SQLite は派生キャッシュである。
- `RebuildRepositoryKnowledgeUseCase` は `pruneOldSnapshots: true` オプションにより、最新 snapshot の保存完了後に古い世代の snapshot を CASCADE 削除可能。
- DB ファイルが破損した場合や `--rebuild` フラグ指定時は、DB ファイルを削除して再生成するだけで完全復旧可能。

---

## 12. 性能測定結果 (CodePrep 実機リポジトリ)

CodePrep リポジトリ自身（TypeScript ソース全ファイル）を対象とした実機ベンチマーク結果:

| 項目 | 実測値 | 評価 |
| :--- | :--- | :--- |
| **ノード数 (Nodes)** | **555 件** | ファイルノード群 |
| **エッジ数 (Edges)** | **3,256 件** | 言語関係 + 配線関係 |
| **エビデンス数 (Evidences)** | **3,256 件** | 全エッジに根拠付与 |
| **DB ファイルサイズ** | **9,052 KB (約 8.8 MB)** | インデックス含む |
| **Save 所要時間** | **183 ms** | 単一トランザクション一括挿入 |
| **Load 所要時間** | **67 ms** | 全件復元 (555ノード + 3256エッジ) |
| **Neighbor Query 所要時間** | **4 ms** | インデックス近傍探索 |

### 関係種別（Relation Breakdown）
- `references`: **3,119 件**
- `injects`: **87 件**
- `binds_to`: **50 件**

---

## 13. 今後の Index 最適化方針

1. **FTS5 (全文検索)**: シンボル名・ドキュメント本文・コミットメッセージの高速全文検索用仮想テーブル。
2. **Path Prefix Indexing**: ディレクトリ階層ごとのサブグラフ走査の高速化。
3. **Embedding / Vector 拡張余地**: 将来のセマンティック検索向けに Embedding ベクトル列やベクトル類似度検索拡張の受け入れ口を用意。

---

## 14. 現在サポートしないこと (非ゴール明示)

- **Task Query / Subgraph Extraction**: Phase 7F 以降のスコープ。
- **Dirty Working Tree Overlay**: Git コミットスナップショットを基本とし、未コミット差分オーバーレイは次フェーズ以降。
- **Incremental Refresh**: ファイル単位の差分更新・依存再計算。
- **マルチリポジトリ横断クエリ**: 単一リポジトリ完結。

---

## 15. 次フェーズ (Phase 7F) への接続

Phase 7E によって、Repository の完全な構造的事実が SQLite に高速に永続化・ロード・近傍探索できる基盤が整った。
次フェーズ（Phase 7F）では、この Knowledge Store を起点として、
- ユーザーの Task プロンプトに応じた **Relevant Subgraph Query**
- グラフ中心性・トポロジカル距離・Co-Change 頻度に基づく **Re-Ranking**
- LLM 向けコンテキスト抽出の最適化
へと接続する。
