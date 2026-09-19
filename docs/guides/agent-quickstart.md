# Agent Quickstart: Stop Rediscovering Your Repository

AI コーディングエージェント（Claude Desktop, Cursor, Roo, Gemini, Codex）がリポジトリの全体構造を毎回ゼロから手動探索（grep, find, ディレクトリ走査）する無駄をなくします。

CodePrep は、リポジトリの依存関係・呼び出しグラフ・Git 変更履歴から **タスクに必要な作業セット (Working Set: CORE / SUPPORTING / RECALL_RESERVE)** を即座に抽出し、構造化コンテキストとして Agent に提供します。

---

## 30-Second Quickstart

### 1. インデックスの作成
```bash
# リポジトリのナレッジグラフ（依存関係・シンボル・ドキュメント関係）を構築
npm run index
```

### 2. タスクコンテキストの取得 (CLI)
```bash
# タスクを与えてコンテキストパックを取得
npm run context -- --task "Support custom tokenLimit in PrepareTaskContextUseCase" --strategy knowledge
```

#### 得られる結果 (Context Pack v2):
```
[CORE] (最初に読むべき中心ロジック)
- src/features/repository-context/application/PrepareTaskContextUseCase.ts

[SUPPORTING] (型定義・オーケストレーター・関連ドキュメント)
- src/features/repository-context/application/ports/SourceExtractorPort.ts
- src/features/repository-context/domain/workingset/WorkingSetBudget.ts

[RECALL RESERVE] (語彙一致による見落とし防止バックアップ)
- docs/mcp.md
```

Agent は広範なリポジトリ探索を行う前に、この 3〜5 ファイルをピンポイントで確認して即座に実装を開始できます。

---

## MCP (Model Context Protocol) との連携

CodePrep MCP サーバーを利用すると、Claude Desktop などのエージェントツールから自動的に呼び出せます。

### 1. 設定 (`claude_desktop_config.json` 等)
```json
{
  "mcpServers": {
    "codeprep": {
      "command": "node",
      "args": ["/path/to/codeprep/dist-mcp/index.js"]
    }
  }
}
```

### 2. ツール呼び出し (`codeprep_prepare_context`)
エージェントはタスク着手時に以下の JSON でツールを呼び出します：
```json
{
  "task": "Add retry logic to order import",
  "strategy": "knowledge",
  "budget": {
    "maxFiles": 10,
    "maxTokens": 12000
  }
}
```

### 3. 返却される構造化レスポンス
エージェントは `schemaVersion: "2"` の JSON を受け取り、以下を直接把握できます：
- **`workingSet.core`**: 編集・閲覧必須の中心ファイル。
- **`workingSet.supporting`**: インターフェースや型定義。
- **`workingSet.recallReserve`**: 関連するドキュメントや周辺ロジック。
- **`excluded`**: 予算オーバー等の理由で除外されたファイル。

---

## 実測された効果 (Dogfooding Results)
- **ファイル閲覧数**: 平均 8.0 ファイル → **1.3 ファイル (-83.8% 削減)**
- **手動検索回数**: 平均 3.7 回 → **0.0 回 (-100% 削減)**
- **初回編集までの時間**: 平均 54秒 → **9.8秒 (5.5倍 高速化)**
- **編集必須ファイルの漏れ**: **0 件 (100% カバー)**
