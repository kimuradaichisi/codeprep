# Design: Preset Import/Export (M28)

## 1. 目的
ユーザーが作成したプリセット（カスタムプロンプト）をファイルとして保存・共有・復元できるようにする。

## 2. ユーザー体験 (UX)
- サイドバーのメニューまたはコマンドパレットから「Export Presets」を選択。
- 保存先を選択し、全てのプリセットを `codeprep-presets.json` として保存。
- 「Import Presets」を選択し、JSONファイルからプリセットを読み込む。既存のプリセットとの競合時は「上書き」か「スキップ」を選択可能にする。

## 3. コマンド定義 (package.json)
- `codeprep.exportPresets`: プリセットをJSONへ出力。
- `codeprep.importPresets`: JSONからプリセットを読み込み。

## 4. データ構造 (JSON)
```json
{
  "version": "1.0",
  "presets": [
    { "name": "Review", "prompt": "Please review this code..." },
    { "name": "Document", "prompt": "Generate README..." }
  ]
}
```

## 5. 実装コンポーネント
- `PromptService.ts`: プリセットの取得・保存ロジック（既存）の拡張。
- `extension.ts`: `vscode.window.showSaveDialog` および `vscode.window.showOpenDialog` を使用したファイル操作の実装。
