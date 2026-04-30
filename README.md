# 📦 CodePrep for VSCode

**CodePrep** は、ワークスペース内のコードベースを効率的に抽出し、ChatGPT、Claude、GitHub Copilot などの LLM（大規模言語モデル）に渡すための最適なコンテキスト（プロンプト）を生成する強力なVSCode拡張機能です。

ファイルツリーからの直感的な選択だけでなく、**Gitの変更履歴からの自動選択**や、エクスプローラーの**右クリックメニューからの追加**など、開発者のワークフローに溶け込む設計になっています。

## ✨ Key Features (主な機能)

- 🌳 **直感的なツリー選択**: 専用サイドバーからファイル/フォルダをチェックボックスで選択。
- 🔍 **Git Diff セレクション**: 変更されたファイルだけをワンクリックで抽出（`Select Modified Files`）。
- 🖱️ **エクスプローラー連携**: VSCode標準のエクスプローラーから右クリックで対象ファイルをCodePrepに追加。
- 📊 **トークン数リアルタイム計算**: 選択ファイルの推定トークン数をステータスバーに表示し、上限超過を警告。
- 📝 **選べる出力フォーマット**: `Markdown` (デフォルト), `XML`, `JSON` に対応。
- ✂️ **コンテキストの最適化**: 出力時のコメント削除や空行の除去に対応し、LLMのトークンを節約。
- 💾 **プリセットの管理 & 共有**: よく使うファイルの組み合わせを保存。設定の**エクスポート/インポート**にも対応。
- 🤖 **カスタムプロンプト**: コード先頭に付与する「Code Review」「Refactor」などの指示を管理・挿入。
- 👁️ **プレビュー機能**: クリップボードへコピーする前に、VSCode上で生成結果をプレビュー。

## 🚀 Usage (使い方)

**基本フロー:**
1. アクティビティバーから **CodePrep** アイコンをクリックします。
2. ツリービューでLLMに渡したいファイルにチェックを入れるか、上部のアイコンから `Select Modified Files (Git)` をクリックします。
3. （オプション）`Select Prompt` アイコンをクリックし、追加の指示（例: "Refactor"）を選択します。
4. `Generate & Copy` ボタン（またはコマンド）を実行します。
5. 生成されたテキストがクリップボードにコピーされ、出力ファイル（デフォルト: `codeprep-output.txt`）に保存されます。

**ショートカット機能:**
- エクスプローラー上で任意のファイルを右クリックし、`Add to CodePrep` を選択することで即座に選択リストに追加できます。

## ⚙️ Extension Settings (設定項目)

VSCodeの `settings.json` から詳細なカスタマイズが可能です。

### 🎨 UI & 出力設定
| 設定キー | デフォルト値 | 説明 |
|---------|------------|------|
| `codeprep.outputFormat` | `"markdown"` | 出力形式。`"markdown"`, `"xml"`, `"json"` |
| `codeprep.enablePreview` | `false` | コピー前にエディタタブでプレビューを表示します。 |
| `codeprep.outputFilePath` | `"codeprep-output.txt"` | 生成結果を保存するデフォルトのファイル名。 |
| `codeprep.visibleButtons` | `["selectAll", ...]` | ツリービュー上部に表示するアイコンボタンをカスタマイズします。（UIの都合上、6個までを推奨） |

### ⚡ エンジン & コード最適化
| 設定キー | デフォルト値 | 説明 |
|---------|------------|------|
| `codeprep.useNativeEngine` | `true` | 拡張機能内蔵の高速なエンジンを使用します。 |
| `codeprep.nativeEngine.removeComments` | `false` | 出力時にコード内のコメントを自動的に削除します。 |
| `codeprep.nativeEngine.includeEmptyLines` | `true` | 出力に空行を含めるかどうかを設定します。 |

### 🛡️ フィルター & 制限
| 設定キー | デフォルト値 | 説明 |
|---------|------------|------|
| `codeprep.exclude` | `["**/node_modules/**", ...]` | ツリービューから除外するグロブパターン。 |
| `codeprep.excludePatterns` | `["^node_modules/", ...]` | 正規表現を用いた高度な除外リスト。 |
| `codeprep.tokenLimit` | `100000` | ステータスバーで警告を表示する推定トークン数の閾値。 |
| `codeprep.autoRefreshTree` | `true` | ファイル変更を検知してツリーを自動更新します。 |

### 💡 カスタムプロンプト
デフォルトで以下のプロンプトが設定されていますが、自由に書き換え・追加が可能です。
```json
"codeprep.customPrompts": {
    "Code Review": "You are an expert software engineer...",
    "Refactor": "You are a refactoring expert...",
    "Document": "Please generate comprehensive documentation..."
}
```

## ⌨️ Commands (コマンド一覧)

コマンドパレットから利用可能なすべてのアクションです。

- `CodePrep: Open Settings` - 設定画面を開く
- `CodePrep: Select All` / `Clear All` - すべて選択 / クリア
- `CodePrep: Invert Selection` - 選択状態を反転
- `CodePrep: Select Modified Files` - Gitで変更されたファイルを選択
- `CodePrep: Add to CodePrep` - 選択中のファイルをツリーに追加 (右クリックメニュー)
- `CodePrep: Select Prompt` - プロンプトの選択
- `CodePrep: Generate & Copy` - パックを生成しクリップボードにコピー
- `CodePrep: Save Preset` / `Load Preset` - プリセットの保存・読み込み
- `CodePrep: Export Presets` / `Import Presets` - プリセットの共有

---

## 🏗️ Architecture & Development Standards (開発者向け)

本プロジェクトは、長期的なメンテナンス性と品質を担保するため、厳格な **DDD（ドメイン駆動設計）** と独自の **「God-Class Killer」ポリシー** に基づいて構築されています。

### 核心的な設計哲学 (Core Philosophy)
1. **VSCode API 絶縁**: ドメイン・アプリケーション層における `import 'vscode'` を固く禁じ、Infrastructure層のAdapter経由で通信を行います。
2. **定量的な分割強制**:
   - 1ファイル最大 **150行**
   - 1メソッド最大 **15行**
   - 循環的複雑度 **5以下**
3. **ゼロ "Any" ポリシー**: 外部入力は必ずType Guardで検証し、`any` を排除しています。

開発やコントリビュートに興味がある方は、リポジトリ内の `.ai/` フォルダ（`DEVELOPMENT_STANDARDS.md`, `ARCHITECTURE.md` 等）をご一読ください。AIエージェントによる自動化と規約の維持を前提とした、非常に堅牢なアーキテクチャを体験いただけます。

## 🤝 Contributing
Issues および Pull Requests は大歓迎です！
開発に際しては `npm run test` および `npm run test:unit` によるテストのパス、および `npm run lint` の通過が必須となります。

---
