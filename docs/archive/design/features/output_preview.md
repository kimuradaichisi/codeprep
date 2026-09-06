# Design: Output Preview UI (M29)

## 1. 目的
生成されたプロンプトがファイルに保存されたりクリップボードにコピーされたりする前に、VSCode内の読み取り専用エディタで内容を確認・修正できるようにする。

## 2. ユーザー体験 (UX)
- 「Generate」実行時、設定により直接保存する代わりに「Preview」を表示する。
- プレビュー画面には「Copy to Clipboard」および「Save to File」のボタンを配置（CodeLensまたはエディタタイトルメニュー）。

## 3. 実装アプローチ
- **TextDocumentContentProvider**: 仮想的なドキュメント（`codeprep-preview:preview.md`）を提供し、メモリ上の生成結果を表示。
- **CommandService**: プレビューモードが有効な場合、物理ファイルへの書き込みの前にプレビュー用URIを開く。

## 4. 設定の追加 (package.json)
```json
"codeprep.enablePreview": {
  "type": "boolean",
  "default": false,
  "description": "出力前にプレビューエディタを開きます。"
}
```

## 5. ステップ
1. `PreviewProvider.ts` の作成。
2. `CommandService.ts` の修正（プレビューロジックの分岐）。
3. エディタ内アクションの追加。
