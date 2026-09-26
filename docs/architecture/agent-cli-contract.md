# CodePrep CLI Agent Interface & Architecture Contract

## 1. 概要 (CLI as Agent Interface)
CodePrep は、リポジトリナレッジとコンテキスト生成能力を AI エージェントや自動化パイプラインへ提供するツールです。
本アーキテクチャでは、CLI をシェルから安全・安定・非対話で操作可能な「Agent 向け第一級インターフェース」として定義します。
Desktop UI はインスペクタ・エクスプローラ・可視化を担い、CLI および MCP は自律実行・再現可能ワークフロー・機械可読出力を担います。

## 2. Command Taxonomy (分類体系)
CLI は関心事とワークフローに基づいて以下の5系統に体系化されています。

| Category | 代表コマンド | 責務 |
| :--- | :--- | :--- |
| `system` | `commands` | カタログ自己探索、利用可能コマンドのメタデータ取得 |
| `repository` | `status` | ワークスペース・ファイルスキャン・インデックス準備状態の診断 |
| `knowledge` | `knowledge status` | ナレッジグラフ（SQLite）のノード・関係数・スナップショット確認 |
| `context` | `context prepare` | 目標・アンカー・意図に基づく Context Projection / Pack 生成 |
| `context` | `context pack` | 選択ファイル群からの明示的 Context Pack バンドル構築 |

## 3. Canonical Command Catalog (Single Source of Truth)
CLI コマンド仕様の二重管理を防ぐため、`apps/cli/catalog/commandCatalog.ts` の `CANONICAL_COMMAND_CATALOG` を Single Source of Truth (SSoT) とします。
- **自動生成対象**:
  - `codeprep commands --json`: エージェントが実行時に自律探索可能な構造化 JSON
  - `codeprep <command> --help`: 端末向けヘルプ
  - `docs/reference/cli-reference.md`: 公式 CLI リファレンスドキュメント
- **更新プロトコル**:
  - 新規コマンド追加やオプション変更時は、まず Catalog を更新し、ハンドラ実装とテストを追加後、`npm run cli:docs` を実行してドキュメントを同期します。
  - 品質ゲート `npm run cli:docs:check` により、ドキュメントのドリフト（乖離）を機械的に 0 に保ちます。

## 4. Agent-oriented Output Contract (stdout / stderr)
エージェントがシェルパイプラインや自動パースで安全に結果を解釈できるよう、厳格な入出力契約を定めます。

- **stdout (標準出力)**:
  - 正常終了時は結果データのみを出力（JSON または Markdown）。
  - machine-readable JSON の stdout に進捗ログ、デバッグログ、警告テキストを混入させることは **BLOCKER** として厳禁。
- **stderr (標準エラー出力)**:
  - 診断メッセージ、進捗通知（`[codeprep-cli] ...`）、エラー詳細（`[codeprep-cli:error] ...`）のみを出力。
- **Quiet Mode**:
  - `--quiet` フラグ指定時は、stderr への非必須メッセージを抑制。
- **Output File**:
  - `--output <path>` 指定時は、結果を指定ファイルへ直接保存し、stdout には出力しない。

## 5. JSON Schema Versioning
すべての機械可読 JSON 出力は、トップレベルに必ず `schemaVersion`（例: `1` または `2`）を保持します。
- `commands --json`: `schemaVersion: 1`
- `status --format json`: `schemaVersion: 1`
- `knowledge status --format json`: `schemaVersion: 1`
- `context prepare --format json`:
  - 通常モード: `schemaVersion: '1'` (`CliContextResult`)
  - Knowledge モード / Context Pack v2: `schemaVersion: '2'` (`ContextPackV2`)
  - Context Projection: `schemaVersion: '2'` (`ContextProjection`)

## 6. Exit Code Contract
CLI は終了コードを一意に標準化し、エージェントがプログラムから即座に判定できるようにします。

| Exit Code | 定数名 | 意味 |
| :---: | :--- | :--- |
| `0` | `SUCCESS` | 正常完了 |
| `1` | `UNEXPECTED_FAILURE` | 想定外のエラー、ランタイム例外 |
| `2` | `INVALID_ARGUMENTS` | 必須引数不足、無効なオプション値 |
| `3` | `KNOWLEDGE_MISSING` | ナレッジデータベース未初期化・不在 |
| `4` | `KNOWLEDGE_STALE` | ナレッジスナップショットが古い、要更新 |
| `5` | `REPOSITORY_UNAVAILABLE` | 対象ワークスペースが不在、または読み取り不可 |
| `6` | `ENTITY_NOT_FOUND` | 指定されたファイルやシンボルが存在しない |

### 構造化エラーレスポンス (JSON Mode)
`--json` または `--format json` の実行環境でエラーが発生した場合、stdout に次の構造化 JSON を出力し、対応する非ゼロ終了コードで終了します:
```json
{
  "schemaVersion": 1,
  "ok": false,
  "error": {
    "code": "INVALID_ARGUMENTS",
    "message": "Option --task is required for context pack",
    "suggestedAction": "codeprep context pack --task \"<task>\" --file \"<path>\""
  }
}
```
`suggestedAction` は実在する CLI コマンドのみを返します。

## 7. Non-interactive First
エージェント利用において、CLI が対話プロンプト（ユーザー入力を促してハングする状態）に入ることを排除します。
入力が不足している場合は対話で尋ねず、直ちに `INVALID_ARGUMENTS` (終了コード 2) と `suggestedAction` を返します。

## 8. stdin / stdout Composition
シェルパイプラインによる連携をサポートします:
```bash
echo "Add validation to user auth" | codeprep context prepare --stdin --format json
```
`--stdin` オプションにより、標準入力から直接タスク記述を流し込むことが可能です。

## 9. MCP / CLI Mapping & Parity
CLI と MCP は同一のドメイン・ユースケース層を共有する Adapter です。

| CLI Command | MCP Tool | Shared UseCase | Parity 保証 |
| :--- | :--- | :--- | :---: |
| `status` | `codeprep_workspace_status` | `checkMcpStatus` | 100% |
| `context prepare` | `codeprep_prepare_context` | `PrepareContextProjectionUseCase` | 100% |
| `context pack` | `codeprep_build_context_pack` | `BuildTaskContextUseCase` | 100% |

## 10. Backward Compatibility (後方互換性)
既存の `npm run context -- --task "..."` や各種フラグ（`--goal`, `--file`, `--anchor-file`, `--symbol`, `-w`, `-o`）は `context prepare` のエイリアスとして完全な後方互換性を保証します。
破壊的変更を行わずに段階的な移行を可能としています。
