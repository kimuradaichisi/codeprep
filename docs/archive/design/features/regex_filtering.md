# Design: Regex-based File Filtering (M27)

## 1. 目的
ユーザーが生成対象外とするファイルを、より柔軟かつ強力に制御できるようにするため、正規表現によるフィルタリング機能を導入する。

## 2. ユーザー体験 (UX)
- VSCodeの設定（Settings UI）から `codeprep.excludePatterns` を編集できる。
- 正規表現にマッチするファイル/ディレクトリは、サイドバーの「CodePrep」ツリーから自動的に除外される。

## 3. 設定の追加 (package.json)
```json
"codeprep.excludePatterns": {
  "type": "array",
  "items": { "type": "string" },
  "default": ["^node_modules/", "^\.git/", "\.vsix$"],
  "description": "正規表現パターンのリスト。マッチしたパスはツリーから除外されます。"
}
```

## 4. 実装ロジック (FileTreeProvider.ts)
- `vscode.workspace.getConfiguration('codeprep').get<string[]>('excludePatterns')` を取得。
- ファイルツリーの構築時（`getChildren` 内）に、各ファイルのパスを `RegExp.test()` でチェック。
- 1つでもマッチした場合はそのノードを表示しない。
- `autoRefreshTree` 設定と連携し、パターン変更時にツリーを再描画する。

## 5. 安全性 (Robustness)
- 不正な正規表現が設定された場合に拡張機能がクラッシュしないよう、`try-catch` で `new RegExp()` をラップする。
- 構文エラーがある場合は `vscode.window.showWarningMessage` でユーザーに通知する。
