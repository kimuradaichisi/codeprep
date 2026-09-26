# AI Agent Bootstrap ガイド (Agent-Native Discovery)

このドキュメントは、自律型コーディングエージェント（Cline, Roo Code, Claude Code, Codex, Antigravity 等）が外部リポジトリで作業を開始するにあたり、CodePrep CLI を安全かつ自己発見的に利用するための最小限の導入指針（Bootstrap Snippet）を提供します。

---

## 1. 最小指針 (Minimal Instruction Snippet)

AI Agent 向けの設定ファイル（`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, システムプロンプト等）には、以下の短い記述のみを含めます。

```markdown
CodePrep is available in PATH.
Before broad repository exploration, use CodePrep to obtain task-relevant context.
Start with `codeprep --help` or `codeprep commands --json`.
```

> **設計思想**:
> 巨大なプロンプトや詳細な構文をエージェントに事前注入する必要はありません。
> CodePrep は自己発見型（Agent-Discoverable）に設計されているため、エージェントは `codeprep --help` や `codeprep commands --json` を呼ぶだけで利用可能な機能やオプションを機械的に理解できます。

---

## 2. 標準的なエージェント実行シーケンス (Canonical Agent Workflow)

エージェントが自律的に実行する推奨シーケンスは以下の通りです:

```bash
# 1. コマンド体系とオプションの探索
codeprep commands --json

# 2. 対象リポジトリのバインド状態とインデックス確認
codeprep status --format json

# 3. タスクに応じたコンテキスト候補・プロジェクションの取得
codeprep context prepare --task "<タスクの説明>" --format json

# 4. 必要に応じて特定ファイル群を境界づけパック化
codeprep context pack --task "<タスクの説明>" --file "<特定ファイルパス>" --format json
```

---

## 3. 詳細仕様リファレンス

全コマンド、オプション、エラーコード、終了コードの詳細については以下を参照してください:

- [CLI Reference (自動生成仕様書)](../reference/cli-reference.md)
- [Agent CLI Contract (標準契約)](../architecture/agent-cli-contract.md)
