# Architecture Decision Record: Product Boundary & Architecture Principles

## 1. 決定 (Decision)

> **CodePrep owns repository analysis execution and versioned structured output.**  
> **It does not own long-lived repository knowledge or higher-level system interpretation.**

CodePrep の責務は「リポジトリの現在状態を解析し、AI Agent や開発者ツールが活用できる構造化・根拠付きのコンテキスト（Facts / Projection）を CLI および MCP から返す **Repository Analysis API**」として正式に固定する。  
CodePrep 自身を永続 Knowledge Base、ドキュメント生成基盤、またはプランニングツールへ拡張することは厳禁とする。

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
Agent / RepoScout / Other Developer Tools
```

---

## 2. 背景と文脈 (Context)

これまでの開発フェーズ（Phase 7A〜7M）を通じて、CodePrep はファイル走査、AST/型解析、依存関係スキャン、Git 変更共起、SQLite インデックス、Context Projection、CLI/MCP インターフェースを段階的に構築してきた。  
しかし、これらが進むにつれて「CodePrep 自身が長期的なリポジトリ知識（Knowledge）を恒久保持するナレッジプラットフォームになるべきか」という境界の曖昧さが生じていた。

リポジトリ知識の永続化、高次ドキュメント生成、複数リポジトリの集約、タスク・課題プランニングは、CodePrep の下流コンシューマ（例: RepoScout や各種オーケストレーションエージェント）の責務である。CodePrep は決定論的かつ高速な「リポジトリ事実抽出・解析 API」に専念することで、高い予測可能性、可搬性、軽量性を維持する。

---

## 3. 責務の明確化 (Responsibilities vs Non-responsibilities)

### 中核責務 (Core Responsibilities)
- **Repository Analysis**: 作業ツリーおよびコミット履歴に基づく決定論的コード解析。
- **Node / Relation / Evidence Extraction**: ファイル、シンボル、依存関係、Git 変更共起などの事実（Fact）およびエビデンスの抽出。
- **On-demand Resolution & Projection**: タスク指示やアンカー指定に応じた動的サブグラフ解決およびコンテキスト投影（Context Projection / Context Pack）。
- **Versioned Structured Output**: 終了コードおよび `schemaVersion` を伴う JSON / JSONL 形式での機械可読出力。
- **CLI / MCP Transport**: シェル自動化（CLI）およびエージェントツール連携（MCP）の第一級インターフェース提供。
- **Internal Rebuildable Cache**: クエリ高速化のためのローカルキャッシュ / SQLite 一時インデックスの内部運用。

### 非責務 (Non-responsibilities)
- **Long-term Knowledge Base Ownership**: 長期・永続的なビジネス知識やドメイン知識のマスター保持。
- **Upper-level Document Generation**: 仕様書、設計書、PR 本文などの高次ドキュメント生成。
- **Planning / Work Management**: 開発ロードマップ、タスク管理、意思決定履歴の管理。
- **Cross-repository Platform**: 複数リポジトリを跨ぐ知識ベースの統合管理。
- **Database Schema as Public API**: 内部 SQLite テーブル構造やキャッシュスキーマの外部公開（Public API としての保証）。

---

## 4. 第一級インターフェース (Public Interfaces)

CodePrep は以下の優先度でインターフェースを提供する：

1. **CLI (Command-Line Interface)**:
   - AI Agent、シェル自動化、スクリプトパイプライン、CI/バッチ向けの本番第一級インターフェース。
   - `stdout` は機械可読な結果（JSON/JSONL）のみ、`stderr` は診断ログに完全分離。
2. **MCP (Model Context Protocol)**:
   - エージェントツール連携向けの本番第一級インターフェース。
   - CLI と同一の Application UseCase を 100% 共有し、セマンティックパリティを保証。
3. **Desktop GUI**:
   - 人間によるインスペクタ、探索、説明可能性（Explainability）確認、デモ用の薄い UI レイヤー。
   - GUI 専用のビジネスロジックや独自永続層は持たず、共有 UseCase の結果を表示するのみ。

---

## 5. 公開契約と内部実装の分離 (Contracts & Persistence Principle)

### JSON / JSONL Contract Principle
- CodePrep の外部向け契約は、バージョン付けされた結果モデル（JSON / JSONL）のみとする。
- すべての公開構造化出力には `schemaVersion`（例: `1`）を付与し、破壊的変更からエージェントを保護する。

### Internal Database & Cache Principle
- 内部の SQLite データベースやキャッシュは **Private Implementation Detail** である。
- **3原則**:
  1. **Deleteable**: いつ削除しても製品機能が破綻しない。
  2. **Rebuildable**: 解析対象リポジトリからいつでも決定論的に再構築可能。
  3. **Replaceable**: 将来的に DuckDB、インメモリ、別フォーマットに変更しても外部契約に一切影響しない。
- 外部ツールやエージェントが `.codeprep/*.db` を直接 SQL クエリすることは厳禁とし、必ず CLI または MCP を介して対話する。

---

## 6. RepoScout との明確な境界 (RepoScout Boundary)

```
[ CodePrep ]
Repository / Working Tree
     ↓ Fact extraction & resolution
Versioned JSON / JSONL Output
     ↓
[ RepoScout ]
Aggregation & Interpretation
     ↓
Feature / Architecture System Model
     ↓
Upper-level Documents & Planning
```

- **CodePrep** = **Fact / Context API**（コードから検証可能な事実と近傍エビデンスを抽出する）
- **RepoScout** = **Interpretation / System Analysis**（事実を集約・解釈し、高次の設計やシステムモデルを構築する）

RepoScout は CodePrep の内部 SQLite を直接参照せず、CLI / MCP の構造化出力（JSON）のみを消費する。

---

## 7. 帰結 (Consequences)

- **利点**:
  - CodePrep の設計がシンプルになり、God-Class や肥大化したナレッジ管理コードの混入を防ぐ。
  - キャッシュや内部表現を破壊的にリファクタリングしても、CLI / MCP ユーザーに影響を与えない。
  - AI Agent は `codeprep --help` や `codeprep commands --json` だけで完結して高速・安全に利用できる。
- **制約**:
  - CodePrep 単体では「長期的な知識の蓄積」を行わないため、蓄積や集約が必要な場合は上位ツール（RepoScout 等）と組み合わせて使用する。
