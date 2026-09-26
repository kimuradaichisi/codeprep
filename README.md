# CodePrep

> **Repository Analysis API for AI Agents and Developer Tools**

CodePrep は、リポジトリの現在状態を解析し、AI Agent や開発者ツールが利用できる構造化・根拠付きの結果を CLI および MCP (Model Context Protocol) 経由で返す **Repository Analysis API** です。

```
Repository / Working Tree
        ↓
    CodePrep
 Analyze / Resolve / Project
        ↓
Versioned Structured Output
    (JSON / JSONL)
        ↓
     CLI / MCP
        ↓
Agent / RepoScout / Other Tools
```

---

## 🎯 Why CodePrep?

AI コーディングエージェントがタスクに着手する際、無秩序な `grep` や全ファイル探索を行うと、膨大なトークン・時間・注意力を浪費します。  
CodePrep は、リポジトリの依存関係・構文解析・Git 変更共起履歴をもとに、**タスクに関連する正確なコンテキストとエビデンス（Context Projection / Context Pack）** を即座に解決し、機械可読な JSON / JSONL として提供します。

---

## ✅ What CodePrep Does (中核責務)

- **Repository Analysis**: 作業ツリーおよび Git コミット履歴に基づく決定論的なコード・構造解析。
- **Fact & Evidence Extraction**: ファイル、シンボル、依存関係、Git 共起関係などの事実抽出。
- **On-demand Context Projection**: タスク指示に応じた動的サブグラフ解決およびコンテキスト投影（Context Projection / Context Pack）。
- **Versioned Structured Output**: 終了コードおよび `schemaVersion` を伴う JSON / JSONL 形式の標準出力。
- **CLI / MCP Transport**: シェル自動化（CLI）およびエージェント連携（MCP）の第一級インターフェース提供。
- **Internal Rebuildable Cache**: クエリ高速化のための内部ローカルキャッシュ / SQLite 一時インデックスの自己管理。

---

## 🚫 What CodePrep Does Not Do (非責務)

- **Long-term Knowledge Ownership**: 長期・永続的なビジネス知識やドメイン知識のマスター管理（下流の RepoScout 等が担当）。
- **Upper-level Document Generation**: 仕様書、設計書、PR 本文などの高次ドキュメント生成。
- **Planning / Work Management**: 開発ロードマップ、タスク管理、意思決定履歴の管理。
- **Cross-repository Knowledge Platform**: 複数リポジトリを跨ぐ知識ベースの統合管理。
- **Database Schema as Public API**: 内部 SQLite テーブル構造やキャッシュスキーマの外部公開・依存。

詳細は [Product Boundary Architecture Decision](docs/architecture/product-boundary.md) をご覧ください。

---

## 📦 Install

### 前提条件
- **Node.js**: `v22.0.0` 以上 (組み込み `node:sqlite` 機能を利用)

### グローバルインストール (ローカル Tarball 配布)
```bash
# CodePrep リポジトリでパッケージをビルド & pack
npm run build
npm pack

# 生成された tarball をグローバルインストール
npm install -g ./codeprep-vscode-*.tgz

# インストール確認
codeprep --version
# 出力例: codeprep 0.8.22
```

詳細な手順やアンインストール方法は [Install Guide](docs/guides/install-cli.md) をご覧ください。

---

## 🚀 Quick Start

任意の作業ディレクトリから、PATH 経由で直接実行できます。

```bash
# 1. 利用可能な全コマンドの機械可読探索
codeprep commands --json

# 2. カレントワークスペースのバインド状態とインデックス確認
codeprep status --format json

# 3. タスクに応じたコンテキスト候補・プロジェクションの取得
codeprep context prepare --task "Fix authentication token refresh" --format json

# 4. 特定ファイルを境界づけたコンテキストパックの構築
codeprep context pack --task "Refactor checkout" --file src/checkout.ts --format json
```

---

## 🤖 Agent Usage

AI Agent 向けの設定ファイル（`AGENTS.md`, `CLAUDE.md`, `GEMINI.md` 等）に以下の最小指示を追加するだけで、エージェントは自律的に CodePrep を発見・活用できます:

```markdown
CodePrep is available in PATH.
Before broad repository exploration, use CodePrep to obtain task-relevant context.
Start with `codeprep --help` or `codeprep commands --json`.
```

エージェント向けガイドラインの詳細は [Agent Bootstrap Guide](docs/integration/agent-bootstrap.md) を参照してください。

---

## 🔌 Interfaces: CLI / MCP / Desktop

| インターフェース | 役割 | 想定利用者 |
| :--- | :--- | :--- |
| **CLI** | **Production First-Class** | AI Agent、シェル自動化、スクリプトパイプライン、CI/バッチ |
| **MCP** | **Production First-Class** | Claude Desktop、Cursor、Roo Code 等のエージェントツール連携 |
| **Desktop GUI** | **Human Inspector / Explorer** | 人間によるインスペクタ、探索、説明可能性（Explainability）確認、デモ |

> **Note**: CLI と MCP は内部の Application UseCase を 100% 共有しており、同一のセマンティックパリティを保証します。Desktop GUI は共有 UseCase の薄いビューワーであり、独自のビジネスロジックや永続層を持ちません。

- 完全な CLI 仕様は [CLI Reference](docs/reference/cli-reference.md)（Command Catalog より自動生成）を参照してください。

---

## 📄 Output Contract

CodePrep は予測可能でスクリプトフレンドリーな入出力契約を厳格に維持します:

- **stdout**: 成功結果のみ（純粋な JSON / JSONL または指定形式）を出力。ログや進捗メッセージの混入はゼロ。
- **stderr**: 診断・進捗ログ（`[codeprep-cli]`）およびエラーログのみを出力。
- **Exit Codes**:
  - `0`: SUCCESS
  - `1`: UNEXPECTED_FAILURE
  - `2`: INVALID_ARGUMENTS
  - `3`: KNOWLEDGE_MISSING
  - `4`: KNOWLEDGE_STALE
  - `5`: REPOSITORY_UNAVAILABLE
  - `6`: ENTITY_NOT_FOUND
- **Structured Error (JSON)**: エラー発生時、`schemaVersion: 1`, `ok: false`, `code`, `message`, `suggestedAction` を返却。

---

## 🏗️ Architecture

CodePrep は Feature-First DDD (Domain-Driven Design) を採用しています:

- **Domain Layer**: リポジトリ解析モデル、プロジェクションロジック、エンティティ（外部依存なし）。
- **Application Layer**: UseCase、Ports インターフェース。
- **Infrastructure / Adapters Layer**: ファイルシステム、AST/言語パーサー、SQLite 一時キャッシュ、CLI / MCP アダプタ。

開発規約およびガードレールの詳細は [AGENTS.md](AGENTS.md) をご覧ください。

---

## 🛠️ Development

```bash
# ビルド
npm run build

# テスト実行
npm run cli:test
npm run mcp:test

# ドキュメント同期検証 (SSoT)
npm run cli:docs:check

# インストール検証 (自動パッケージング & 外部CWD実行テスト)
npm run cli:verify-install

# 総合品質ゲート
npm run check
```
