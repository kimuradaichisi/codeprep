# 📊 Test Coverage Gap Analysis

## 🎯 Target
全主要モジュール（GitUtils, SelectionService）においてカバレッジ 90% 以上を確保する。

## 🔍 Identified Gaps (as of 2026-04-27)

### 1. SelectionService.ts (Current: 60.46%)
- **G1 (Branch/Stmt)**: `savePreset` における `getPresetList` への新規追加判定。
- **G2 (Stmt)**: `loadPreset` でパスが取得できなかった場合の戻り値。
- **G3 (Stmt)**: プリセットの削除ロジック（`deletePreset` - 現在未テスト）。
- **G4 (Stmt)**: 選択解除ロジック（`clear` - 明示的なテストが不足）。

### 2. GitUtils.ts (Current: 85.18%)
- **G5 (Branch)**: `stdout` が空または undefined の場合の早期リターン。
- **G6 (Stmt)**: `execAsync` 失敗時の `catch` ブロック（`vscode.window.showErrorMessage` の呼び出し）。

## 🛠️ Action Plan

### Task 1: SelectionService Preset & State Coverage
- **TestCase**: `clear()` を呼び出し、Set が空になることを確認。
- **TestCase**: `savePreset` を複数回呼び出し、重複なくリストが更新されることを確認。
- **TestCase**: 存在しないプリセットを `loadPreset` し、`false` が返ることを確認。

### Task 2: GitUtils Robustness Coverage
- **TestCase**: `git status` が空文字列を返した場合に空配列が返ることを確認。
- **TestCase**: コマンド実行エラー（例: Git 未インストール環境のシミュレーション）時にエラーメッセージが表示され、空配列が返ることを確認。

## 📈 Success Criteria
- 全ての `Uncovered Line #s` が解消されていること。
- `npx vitest run --coverage` で Stmts 90% 以上。
