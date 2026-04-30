# UIリファクタリング計画書: Activity Bar 移行とボタンカスタマイズ

## 1. 目的
- エクスプローラー内に同居していたツリービューを独立した「Activity Bar (左メニューバー)」へ移行し、専用の作業空間を確保する。
- ユーザーの設定により、ビューのタイトルバーに表示するボタン（コマンド）を選択可能にする。

## 2. 実装方針

### A. Activity Bar への移行
- `package.json` の `contributes` を更新：
  - `viewsContainers`: `activitybar` に `codeprep-vscode` コンテナを定義。
  - `views`: `codeprep.fileTree` の配置先を `explorer` から `codeprep-vscode` へ変更。

### B. ボタン表示のカスタマイズ機能
- **設定の追加**:
  - `codeprep.visibleButtons`: 表示したいコマンドIDの配列を受け取る設定を追加。
- **動的表示制御**:
  - `extension.ts` の activation 時および設定変更時に、選択されたボタンに対応する「カスタムコンテキストキー」をセット。
  - `package.json` の各メニューの `when` 句に、このカスタムコンテキストキーを追加。
  - 例: `"when": "view == codeprep.fileTree && codeprep.showSelectAll"`

### C. UIレイアウト設計
- **タイトルバー (最大6個)**: ユーザーが頻繁に使うアクション（Generate, Clear, GitDiff等）を配置。
- **ビュー内コンテキストメニュー**: 全コマンドを網羅し、タイトルバーにない機能へのアクセスを担保。

## 3. 変更が必要なファイル
1. `package.json`: ビュー定義、メニュー定義、設定定義の変更。
2. `src/extension.ts`: コンテキストキーの制御ロジック追加、Activity Bar 向けの初期化コード調整。

## 4. マイルストーン
- **M1**: `package.json` の更新と Activity Bar へのビュー移行。
- **M2**: 設定 (`visibleButtons`) の実装とコンテキストキーによる表示制御の実装。
- **M3**: UI動作確認とドキュメント更新。


## 5. 実装完了報告 (2024-05-23)
- **Activity Bar 移行**: `package.json` にて `viewsContainers` を定義し、ビューを独立したタブへ移動完了。
- **ボタン表示制御**: `codeprep.visibleButtons` 設定を追加し、`extension.ts` にてコンテキストキーを介した動的な表示制御を実装完了。
- **動作確認**: 設定変更が即座にタイトルバーのUIへ反映されることを確認。