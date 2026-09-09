# CodePrep と Claude Code の連携ガイド

本ドキュメントでは、Anthropic のエージェント型 CLI ツール **Claude Code** と **CodePrep** を連携させる具体的な手順を解説します。

CodePrep と連携することで、Claude Code がリポジトリの広大なコードベースから迷うことなく、**「最適な関連ファイル・依存関係・型定義」** を瞬時に把握して正確な修正を行えるようになります。

---

## 連携方法は 2 つあります

| 連携方式 | 特徴 | おすすめの場面 |
| :--- | :--- | :--- |
| **1. MCP サーバー連携（自動）** | Claude Code に CodePrep をツールとして登録。Claude Code が自動で CodePrep を呼び出し、必要なコードを自律取得。 | **最もおすすめ**。コピペの手間をゼロにしたい場合。 |
| **2. クリップボード連携（手動）** | CodePrep Desktop 画面で生成したパックを「Copy」し、Claude Code に貼り付ける。 | 特定のファイルを自分で吟味・調整して渡したい場合。 |

---

## 方法 1: MCP サーバー連携（おすすめ・完全自動化）

Claude Code は **MCP（Model Context Protocol）** を標準サポートしています。CodePrep の MCP サーバーを登録することで、Claude Code がリポジトリ調査時に CodePrep の高速探索エンジンを活用するようになります。

### ステップ 1: CodePrep MCP サーバーをビルドする
初回のみ、CodePrep の MCP サーバー成果物を生成します。

```powershell
# CodePrep リポジトリのルートで実行
npm run mcp:build
```
> `dist-mcp/index.js` が生成されます。

---

### ステップ 2: Claude Code に CodePrep を登録する

#### コマンド一発で追加する場合:
Claude Code の CLI コマンドを使って登録できます。

```powershell
# 対象の作業リポジトリを開いている状態で実行
claude mcp add codeprep node "D:/git/codeprep/dist-mcp/index.js" --workspace "."
```
> ※ パス `D:/git/codeprep/dist-mcp/index.js` は、お手元の CodePrep の絶対パスに合わせてください。

#### 設定ファイル（JSON）を直接編集する場合:
Claude Code の設定ファイル（`~/.claude.json` またはプロジェクトルートの `.claude.json`）に以下を追記します。

```json
{
  "mcpServers": {
    "codeprep": {
      "command": "node",
      "args": [
        "D:/git/codeprep/dist-mcp/index.js",
        "--workspace",
        "."
      ]
    }
  }
}
```

---

### ステップ 3: Claude Code で実際に使う

Claude Code を起動します：
```powershell
claude
```

起動後、いつも通りタスクを指示するだけです。Claude Code が必要に応じて CodePrep のツールを自動実行します。

```text
> 決済処理（PaymentGateway）で金額計算が丸め誤差を起こすバグを調査・修正して
```

**Claude Code の内部動作**:
1. `codeprep_discover_entry_points` を自動実行し、リポジトリから関連ファイルをスコア順に検出。
2. 関連する依存関係やテストファイルを `codeprep_build_context_pack` で構造化パックとして取得。
3. 取得した正確なコンテキストを元に、無駄なファイル探索をスキップして即座にコード修正を開始します。

---

## 方法 2: クリップボード連携（手動・確実）

GUI（CodePrep Desktop）で候補ファイルを確認・微調整してから Claude Code に渡したい場合のフローです。

```
[ CodePrep Desktop ]                      [ Claude Code ]
1. タスク入力 & Find Context
2. 候補ファイルの確認・選択
3. 「📋 Copy Context Pack」 ──(Ctrl+V)──> 対話プロンプトに貼り付けて実行！
```

### 手順
1. **CodePrep Desktop** を開きます。
2. 上部タブで **「Task Context」** を選択します。
3. `Task Description` にやりたい作業（例: `「返品処理で二重返金が発生する不具合を修正する」`）を入力し、**「Find Context」**（または Ctrl+Enter）を押します。
4. 候補ファイル（Candidate Entry Points）を確認し、必要に応じてチェックボックスで選択します。
5. **「Build Context Pack」** をクリックします。
6. 右側（または上部）の **「📋 Copy Context Pack」** ボタンを押します。
7. ターミナルで `claude` を起動し、プロンプト欄に **そのまま貼り付け（Ctrl+V）して Enter** を押します。

> **💡 自動付与されるプロンプトヘッダー**:  
> コピーされるテキストの先頭には、以下のような LLM 専用の指示ヘッダーが自動で含まれるため、貼り付けるだけで Claude Code がタスクの意図とコンテキストを完璧に理解します。
> ```markdown
> # LLM Context Pack
> - **Task Goal:** 返品処理で二重返金が発生する不具合を修正する
> - **Strategy:** EXPANDED
> - **Primary Entry Points:** `src/order/OrderService.ts`
> 
> ## Instructions for LLM
> 1. Use the code context below to address the Task Goal.
> ...
> ```

---

## トラブルシューティング

### Q. `claude mcp list` で codeprep がエラーになる / 認識されない
- **原因 1**: `npm run mcp:build` を実行していない。
  - `dist-mcp/index.js` が存在するか確認してください。
- **原因 2**: パス区切り文字の問題。
  - Windows の場合、パスにバックスラッシュ（`\`）が含まれていると JSON パースエラーになることがあります。必ずスラッシュ（`/`）を使用してください（例: `D:/git/codeprep/dist-mcp/index.js`）。

### Q. セマンティック（意味論）検索が効いているか確認したい
- CodePrep MCP サーバーは、ローカルの Ollama（`nomic-embed-text`）が起動していれば自動でベクトル検索を併用します。
- Ollama が起動していない場合でも、自動で Ripgrep による高速キーワード検索＆静的解析（AST）にフォールバックするため、エラーで止まることはありません。
