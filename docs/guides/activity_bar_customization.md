# Activity Bar 移行とボタンカスタマイズ ガイド

CodePrep は、エクスプローラーから独立した **Activity Bar (左メニューバー)** に配置されるようになりました。また、タイトルバーに表示されるボタンを自由に変更できます。

## 1. Activity Bar の使い方
VSCode の左端にある「本棚のようなアイコン（Library）」をクリックすると、CodePrep のツリービューが表示されます。

## 2. ボタンのカスタマイズ方法
タイトルバーに表示されるボタンの数が増えたため、ユーザーが頻繁に使うものだけを表示するように設定できます。

### 設定手順
1. VSCode の設定 (`Ctrl+,`) を開きます。
2. `codeprep.visibleButtons` を検索します。
3. 表示したいコマンドを選択または `settings.json` で編集します。

### 指定可能なコマンド ID
- `codeprep.selectAll`: 全選択
- `codeprep.clearAll`: 全解除
- `codeprep.generate`: 生成 & コピー
- `codeprep.selectGitDiff`: Git変更ファイル選択
- `codeprep.selectPrompt`: プロンプト選択
- `codeprep.savePreset`: プリセット保存
- `codeprep.loadPreset`: プリセット読込

### 制限事項
- VSCode の UI 仕様上、タイトルバーに表示できるボタン数は **最大 6 つ程度** です。それ以上のボタンを有効にした場合、一部は「...」メニューの中に格納されます。