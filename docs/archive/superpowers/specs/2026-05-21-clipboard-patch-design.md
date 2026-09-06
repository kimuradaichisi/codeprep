---
title: Clipboard監視・ファイルカウント・パッチ機能改善 設計
date: 2026-05-21
authors: ["GitHub Copilot"]
---

## 概要

本設計は以下3点の改善を段階的に実装するための仕様書である。

- クリップボード監視の停止(設定による制御)
- ファイルカウント不整合の修正（処理結果ベースに統一）
- パッチ適用機能の柔軟化（ChatGPT形式・パス推測・省略復元・部分パッチ）

設計はDDDの境界を尊重し、Infrastructure 層へは VSCode API の直接使用のみ許可する。

## 成果物（短期）

- 設定キー: `codeprep.clipboard.watch.enabled` (boolean, default: true)
- `ClipboardSelectionUseCase` 側での有効フラグ判定と通知分離
- 処理対象を正確に反映する `countValidFiles` ヘルパ
- パッチ領域に以下ドメインコンポーネントを追加（段階導入）:
  - `ClipParser`：柔軟なコードブロック検出
  - `PathExtractor`：パス推測ロジック
  - `StringMatcher`：あいまいマッチング（Levenshtein 等）
  - `OmitHealer`：`// ...` 等の部分補完マージ
  - `PatchUseCase`：diff生成と適用ワークフロー

## 対象ファイル（実装時に小分けで修正）

- クリップボード: src/features/selection/application/ClipboardSelectionUseCase.ts
- 監視インフラ: src/features/selection/infrastructure/*
- カウント修正: src/commands/OutputCommands.ts または src/features/selection/application/SelectionUseCase.ts
- パッチ拡張: src/features/patch/domain/*（新規追加）

## 実装方針

1. 小さな差分（15行/150行ルール）で段階的に適用する。
2. 各変更はユニットテストを追加し、既存テストを壊さない。
3. UI 副作用（vscode.window.showInformationMessage 等）は UseCase 側で透過的に制御する。
4. パッチ機能はフォールバック戦略を持つ：完全一致→部分一致→推測→preview-only。

## テスト項目

- ChatGPT形式でもパースできる
- パスなしでも推測できる
- Omitでも復元できる
- 部分変更でも適用できる
- クリップボード監視をOFFにしたとき通知・監視が発生しない
- コピー時の件数表示が処理対象ベースで正しい

## 次の作業（優先順位）

1. 設計ファイルをコミット（本ファイル） — 完了
2. writing-plans に従い実装タスクを細分化してプラン化
3. プラン承認後、ブランチを切り小回りなコミットで実装

---

設計を確認の上、次に「実装プラン（タスク分解）」を作成しますか？
