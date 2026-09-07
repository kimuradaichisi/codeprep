# CodePrep Task Context 利用ガイド

**CodePrep** は、作業タスクに最適なリポジトリのコンテキスト（対象ファイル、コード定義、依存関係グラフなど）を自動抽出し、LLM（Claude Code、Cursor、ChatGPT、GitHub Copilot など）に渡すための **プロンプト用コンテキストパック** を高速・決定論的に生成するツールです。

---

## 1. Task Context の基本的な使い方（4ステップ）

Task Context は、**「指示文（タスク）を入力するだけで、LLM に渡すべき最小・最適なコンテキストを瞬時に準備する」** ための機能です。

```
[1. タスク入力]  →  [2. Find Context]  →  [3. 候補の確認・選択]  →  [4. Build & Copy Pack]
```

### Step 1: タスクを入力する
- 画面上部の **「Task Context」タブ** を選択します。
- `Task Description` に、行いたい作業内容を自然言語で入力します。
  - **例**: `「決済処理で二重引き落としが発生するバグを修正する」`
  - **例**: `「ユーザープロフィール画面にアバター画像アップロード機能を追加する」`
  - **例**: `「Candidate Entry Points のチェックボックス表示崩れを直す」`

### Step 2: 「Find Context」を実行する（または Ctrl+Enter）
- CodePrep がリポジトリ内をローカルで高速走査（Ripgrep 全文検索、シンボル定義、見出し、ファイル名マッチ）します。
- **Candidate Entry Points（候補ファイル）** と **Context Confidence（確信度: HIGH / MEDIUM / LOW）** が自動算出されます。
  - **HIGH**: 修正すべきファイルが明確に特定されている状態。
  - **MEDIUM / LOW**: 候補が複数分散しているため、人間の確認・選択が推奨される状態。

### Step 3: 候補ファイル（Candidate）を確認・微調整する
- 抽出された候補ファイルの一覧が表示されます。
- チェックボックスで、コンテキストに含めたいファイルを追加・除外できます。
- ファイル名右側のアイコンをクリックすると、ファイル内容を直接プレビュー確認できます。

### Step 4: 「Build Context Pack」を実行し、「Copy Pack」でコピーする
- 最適なコード本体、依存関係（AST）、ファイル概要を含む構造化コンテキストが生成されます。
- **「Copy Pack」** ボタンをクリックすると、クリップボードにコピーされます。
- あとは **Claude Code、Cursor、ChatGPT 等のプロンプト欄に貼り付けるだけ** で、LLM が迷わずに正確な作業を開始できます。

---

## 2. LLM / Semantic（意味論）検索の使い方

### Q. 「Semantic Index」や「LLM 検索」とは何ですか？
CodePrep はデフォルトでも `ripgrep` による超高速なキーワード検索＋静的解析で動作しますが、**ローカル Embedding モデル（Ollama）** と連携することで、「コード内に直接書かれていない類義語や自然言語のニュアンス」をベクトル類似度で捉える **Semantic 検索** をハイブリッドで併用できます。

> **※注意**: Claude や OpenAI などのクラウド生成 LLM（Generative LLM）にコードを送信するわけではありません。100% お手元のローカルマシン（Ollama）で安全にベクトル計算されます。

### 有効化手順（3ステップ）

1. **Ollama をインストール・起動する**:
   - https://ollama.com から Ollama をインストールして起動します。
   - ターミナルで Embedding モデルをダウンロードします：
     ```bash
     ollama pull nomic-embed-text
     ```
2. **CodePrep の Settings で接続テスト**:
   - ヘッダー右上の **「⚙ Settings」** を開きます。
   - `Ollama Endpoint`: `http://127.0.0.1:11434`
   - `Model`: `nomic-embed-text`
   - **「Test Connection」** を押し、`Connection successful!` と表示されることを確認して保存します。
3. **インデックスを同期（Refresh）する**:
   - 左パネル（Projects）またはステータスバーの **「Refresh」** をクリックします。
   - リポジトリのコードや Markdown がベクトル化され、ヘッダーの **Semantic Index** が `READY (XX entries)` に変わります。
   - 以後、`Find Context` を実行するとテキスト検索に加えてベクトル類似度検索（`semanticMatch`）も自動で合算されます。

---

## 3. .gitignore と機密ファイルの自動除外

CodePrep は、LLM に無駄なトークンを消費させたり、機密情報がプロンプトに漏洩するのを防ぐため、二重の防御機能を備えています。

### ① .gitignore の自動適用
- **「Respect .gitignore」** チェックボックス（デフォルト ON）が有効な場合、リポジトリの `.gitignore` で指定された無視ファイル（`dist/`, `node_modules/`, `*.log` など）を自動的に探索・候補・パックから除外します。

### ② Built-in 機密ファイル保護
- `.gitignore` の記述に関わらず、以下の機密ファイルは自動で除外されます：
  - 環境変数: `.env`, `.env.local`, `.env.production` など（※ `.env.example`, `.env.sample` は保護されコンテキストに残ります）
  - 秘密鍵・証明書: `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa`, `id_ed25519`
