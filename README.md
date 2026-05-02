# 📦 CodePrep for VSCode

**CodePrep** は、ワークスペース内のコードベースを効率的に抽出し、ChatGPT、Claude、GitHub Copilot などの LLM（大規模言語モデル）に渡すための最適なコンテキスト（プロンプト）を生成する強力なVSCode拡張機能です。

ファイルツリーからの直感的な選択だけでなく、**Gitの変更履歴からの自動選択**や、関連テストの自動抽出など、開発者のワークフローに完全に溶け込むように設計されています。

## ✨ Key Features (主な機能)

- 🌳 **直感的なツリー選択**: 専用サイドバーからファイル/フォルダをチェックボックスで選択。
- 🔍 **Git Diff セレクション**: 変更されたファイルと、それに関連するテストファイルをワンクリックで抽出。
- 📊 **トークン数リアルタイム計算**: 選択ファイルの推定トークン数をステータスバーに表示し、上限超過を警告。
- 📝 **選べる出力フォーマット**: `Markdown` (デフォルト), `XML`, `JSON` に対応。
- ✂️ **コンテキストの最適化**: 出力時のコメント削除や空行の除去に対応し、LLMのトークンを節約。
- 💾 **プロジェクトを汚さない出力**: 生成された内容は物理ファイルとして保存されず、**Untitled（無題）エディタ**で開かれます。ワークスペースを一時ファイルで汚すことなく、即座に内容の確認・調整が可能です。
- 🤖 **カスタムプロンプト**: コード先頭に付与する「Code Review」「Refactor」などの指示を管理・挿入。
- 🖱️ **エクスプローラー連携**: VSCode標準のエクスプローラーから右クリックで対象ファイルをCodePrepに追加。

## 🚀 Usage (使い方)

**基本フロー:**
1. アクティビティバーから **CodePrep** アイコンをクリックします。
2. ツリービューでLLMに渡したいファイルにチェックを入れるか、上部のアイコンから `Git Actions` メニューを開き、修正ファイルを選択します。
3. （オプション）`Select Prompt` アイコンをクリックし、追加の指示（例: "Refactor"）を選択します。
4. `Generate & Copy` ボタン（またはコマンド）を実行します。
5. 生成されたテキストがクリップボードにコピーされ、**新しいエディタタブ（Untitled）** で即座に開かれます。そのまま LLM にペーストするか、必要であれば `Ctrl+S` で保存してください。

**ショートカット機能:**
- エクスプローラー上で任意のファイルを右クリックし、`Add to CodePrep` を選択することで即座に選択リストに追加できます。

## ⚙️ Extension Settings (設定項目)

### 🎨 UI & 出力設定
| 設定キー | デフォルト値 | 説明 |
|---------|------------|------|
| `codeprep.outputFormat` | `"markdown"` | 出力形式。`"markdown"`, `"xml"`, `"json"` |
| `codeprep.openAfterGenerate` | `true` | 生成完了後に、内容を新しいUntitledエディタで開きます。 |
| `codeprep.openAfterGitAction` | `true` | コミットプロンプト生成後に、内容を新しいUntitledエディタで開きます。 |
| `codeprep.outputFilePath` | `"codeprep-output.txt"` | Untitledエディタを開く際のデフォルトのファイル名のヒント。 |
| `codeprep.visibleButtons` | `[...]` | ツリービュー上部に表示するアイコンボタンをカスタマイズします。 |

### ⚡ エンジン & コード最適化
| 設定キー | デフォルト値 | 説明 |
|---------|------------|------|
| `codeprep.useNativeEngine` | `true` | 拡張機能内蔵の高速なエンジンを使用します。 |
| `codeprep.nativeEngine.removeComments` | `false` | 出力時にコード内のコメントを自動的に削除します。 |
| `codeprep.nativeEngine.includeEmptyLines` | `true` | 出力に空行を含めるかどうかを設定します。 |

### 🛡️ フィルター & 制限
| 設定キー | デフォルト値 | 説明 |
|---------|------------|------|
| `codeprep.exclude` | `["**/node_modules/**"]` | ツリービューから除外するグロブパターン。 |
| `codeprep.excludePatterns` | `["^node_modules/"]` | 正規表現を用いた高度な除外リスト。 |
| `codeprep.tokenLimit` | `100000` | ステータスバーで警告を表示する推定トークン数の閾値。 |
| `codeprep.autoRefreshTree` | `true` | ファイル変更を検知してツリーを自動更新します。 |

## ⌨️ Commands (コマンド一覧)

- `CodePrep: Open Settings` - 設定画面を開く
- `CodePrep: Select All` / `Clear All` - すべて選択 / クリア
- `CodePrep: Invert Selection` - 選択状態を反転
- `CodePrep: Git Actions` - Gitで変更されたファイルやコミットプロンプトのメニューを表示
- `CodePrep: Add to CodePrep` - 選択中のファイルをツリーに追加 (右クリックメニュー)
- `CodePrep: Select Prompt` - 挿入するカスタムプロンプトの選択
- `CodePrep: Generate & Copy` - パックを生成し、クリップボードへのコピーとエディタ展開を行う
- `CodePrep: Save Preset` / `Load Preset` - 現在のファイル選択状態を保存・読み込み
- `CodePrep: Refresh Tree` - ファイルツリーを手動更新

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
4. **テスト駆動**: Vitest による 100% のユニットテストパスが必須です。

開発の詳細については、リポジトリ内の `AI_AGENTS.md` をご参照ください。

## 🤝 Contributing
WINDOWS powershellで権限関係でエラーが出る場合
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```
その後、`npm run compile` を実行してください。
開発に際しては `npm run test:unit` によるテストのパス、および `npm run lint` の通過が必須となります。

### コミット前遵守フロー
- テストケースの精査: 新機能に対するテスト不足や、ロジック変更に伴う既存テストの陳腐化をチェックし、必要に応じて修正・追加。
- テスト実行 (npm run test:unit): 全テストのパスを確認。
- Lint実行 (npm run lint): コード規約違反がないか確認。
- コンパイル (npm run compile): 型エラーがないか最終確認。
- コミット: 上記がすべて通った場合のみ実施。

## 🆕 What's New (最新の更新)

### v0.5.0 (2026-05-02)
- 🤖 **インテリジェント・プロンプト変数**: カスタムプロンプト内で `{{language}}` (言語), `{{datetime}}` (日時), `{{tree}}` (選択ファイルのツリー) の変数が自動置換されるようになりました。
- 🛡️ **巨大ファイル・ガード**: 指定したサイズ（デフォルト 500KB）を超えるファイルは自動的に内容を省略し、LLMへの送信時のフリーズやメモリ不足を防止します。

### v0.4.0 (2026-05-02)
- ⚡ **パフォーマンスの劇的な向上**: 検索エンジンを VSCode 内蔵の ripgrep (`vscode.executeTextSearch`) へ移行し、数千ファイル規模のプロジェクトでも瞬時に検索が可能になりました。
- 🔄 **Git 状態の非同期キャッシュ**: `GitWatcher` の導入により、Git のステータス取得をバックグラウンド化。UI の応答性を損なうことなく変更ファイルを追跡します。
- 🌳 **ツリー展開の高速化**: 除外パターンの判定ロジックを最適化（プリコンパイル）し、大規模なフォルダ構成でもスムーズなブラウジングを実現。
- 🎨 **UI 改善**: Git で変更されたファイルに専用アイコン (`git-commit`) と装飾色を表示。また、設定からツールバーボタンの表示/非表示を完全に制御できるようになりました。
- 🛠️ **内部品質の向上**: 冗長なアクティビティイベントの削減や、ESLint 警告の徹底的な解消を実施。
