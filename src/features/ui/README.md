# UI Feature

## 概要
CodePrep の各種視覚的要素を担当します。

## 構造
- **models/**:
  - `FileNode.ts`: ツリー表示用のデータ構造。
- **FileTreeProvider.ts**: サイドバーのファイル一覧表示（TreeView API）。
- **PreviewProvider.ts**: 生成結果のプレビュー表示（TextDocumentContentProvider API）。
- **__tests__/**:
  - `FileTreeProvider.test.ts`: ツリーの構築と更新のテスト。

## 責務
- ワークスペースのファイル構造をツリー形式で表示します。
- `Selection` 機能と連携し、チェックボックスの表示状態を同期します。
- 生成されたコンテンツのプレビュー画面を提供します。
