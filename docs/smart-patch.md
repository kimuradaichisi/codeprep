# Smart Patch Engine — 使い方

このドキュメントは `feature/smart-patch-engine` ブランチで追加した Smart Patch 機能の利用方法をまとめます。

## 概要
Smart Patch Engine は、クリップボードにある差分や AI 出力から候補的なパッチ（変更案）を抽出し、ワークスペース内の適切なターゲットファイルへプレビュー・適用するための機能です。主な要素:

- クリップボード解析（従来フォーマット / スマート候補）
- 候補一覧を QuickPick で提示してプレビュー表示
- `SmartPatchUseCase` により候補の `targetPath` を `workspaceFiles` と `recentFiles`（Git 履歴 / 編集時刻）を使って推論
- `PatchTargetResolver` によるスコアリング（path hint, recentness など）

## 主なコマンド
以下のコマンドはコマンドパレットまたはメニューから利用できます（拡張がアクティブな状態で）。

- `Preview: Smart patches` (内部: `PatchCommands.previewSmartPatch`)
  - クリップボードのテキストを解析して SmartPatch 候補を作成し、QuickPick で選択してプレビューを開きます。
  - 候補は `targetPath`（推定）・`diff`・`confidence` を持ちます。

- `Preview: Clipboard patches` (内部: `PatchCommands.previewPatchLegacy`)
  - 従来の unified diff 形式などを解析して、候補一覧を表示します。

- `Apply Patch` (内部: `PatchCommands.applyPatch`)
  - `codeprep-patch:` スキームで開いているパッチプレビューをファイルへ書き込みます。

## 仕組み（簡単に）
1. クリップボードの文を `SmartPatchUseCase.planFromText()` に渡す。
2. 候補それぞれについて `PatchTargetResolver.resolve()` が target を推測する。
   - `pathHint` があればまず優先的に一致させる。
   - 一致ファイルが `recentFiles`（編集日時または Git 変更頻度）に出現する場合は `recentness bonus` を付与。
   - `recentFiles` が空であれば workspace の単一ファイル fallback を使う。
3. QuickPick でユーザーが候補を選ぶと、`PatchPreviewProvider` 経由で `codeprep-patch:` ドキュメントを開き、差分を表示。
4. `Apply Patch` を実行すると、該当ファイルへ変更を保存し、エディタを閉じて完了メッセージを表示。

## ワークフローのコツ
- 可能ならプロジェクトルート（拡張の `root`）を指定しておくと、`workspaceFiles` と `git` の補完がより精度良く働きます。
- SmartPatch はあくまで「提案」です。プレビューをよく確認してから `Apply` してください。

## 設定 / 実装注記（開発者向け）
- `IGitClient.getRecentFiles(root, limit)` を実装することで、Git の最近変更されたファイルリスト（頻度順）を SmartPatch が利用します。現在の実装: `GitCliClient.getRecentFiles`（`git log --name-only` を使用）
- `PatchTargetResolver` の主要パラメータ:
  - exact path match: +80
  - suffix match: +60
  - recentness bonus: 最近の項目ほど高いボーナス
  - confidence は 100 にキャップされます

## テスト
- ユニットテストは `npm run test:unit` で実行できます。Smart Patch 関連のテストは以下:
  - `src/features/patch/application/__tests__/SmartPatchUseCase.test.ts`
  - `src/features/patch/domain/__tests__/PatchTargetResolver.test.ts`
  - `src/features/git/infrastructure/__tests__/GitCliClient.getRecentFiles.test.ts`

## トラブルシューティング
- `vscode` の API を使うテストはモックが必要です（例: `vi.mock('vscode', ...)`）。
- `getRecentFiles` が存在しないか未実装だと、SmartPatch の `recentFiles` 補完が働きません。

## 変更履歴（抜粋）
- Smart Patch Engine MVP を追加（`feature/smart-patch-engine` ブランチ）
- `IGitClient.getRecentFiles` を必須化
- `PatchTargetResolver` のスコアリング改善（recentness bonus）

---

フィードバックや追加してほしい項目があれば教えてください。README を別の場所（`src/features/patch/README.md`）に置く、スクリーンショットを追加する、具体的なコマンド例を増やす等、対応します。
