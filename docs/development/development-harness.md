# Development Harness & Mechanized Workflow Guide

## 1. なぜ機械化が必要なのか (Why)

AI エージェント（Claude, Gemini, Codex 等）とのペアプログラミングにおいて、以下のような**決定論的・定型的な作業**が毎回手動で指示・実行され、トークン消費や人為的ミス（推測先行の実装、テスト忘れ、不完全なレポート作成）を引き起こしていました：

1. `git status` / `git rev-parse HEAD` のベースライン確認
2. 作業開始前の CodePrep Before Evaluation
3. 変更ファイルの検出と関連テストの特定
4. コード規約（standards）チェック
5. 局所単体テスト（Fast Verify）
6. リポジトリ全域の構造スモーク / 性能計測
7. 全体品質ゲート（Final Verify）
8. レポートの事実情報の集計・記述

本 **Development Harness** は、これら「手順が分かっている作業」を 1 つのコマンド体系として機械化し、エージェントを「設計判断・実装・障害原因分析・レビュー判定」という本質的な知的作業に集中させるために構築されました。

---

## 2. 機械化の境界線 (Mechanization Boundary)

| 責務 | Machine (Harness) | AI Agent / 人間 |
| :--- | :---: | :---: |
| 再現可能な手順の実行 | **○** (自動) | × |
| 変更ファイル・影響テストの検出 | **○** (保守的推測) | × |
| 検査・合否判定 (Lint / Types / Test) | **○** (Exit Code) | × |
| 計測・集計 (Node数, Edge数, 性能) | **○** (自動記録) | × |
| 事実レポートの生成 | **○** (Markdown/JSON) | × |
| **設計判断・アーキテクチャ方針** | × (捏造禁止) | **○** (担当) |
| **コード実装・リファクタリング** | × | **○** (担当) |
| **障害・エラー原因の分析** | × | **○** (担当) |
| **BLOCKER / SHOULD FIX / DEFER 判定** | × | **○** (担当) |
| **Git Commit 実行判断** | × (**自動コミット厳禁**) | **○** (ユーザー確認後) |

---

## 3. Harness コマンド体系 (Commands)

### 3.1 Phase 開始: `dev:phase:start`
```bash
npm run dev:phase:start -- --phase <phase-id> [--task "<task>" | --task-file <path>]
```
- Git の baseline revision と working tree clean 状態を記録。
- タスク内容に応じた CodePrep CLI Before Evaluation を自動実行。
- `.codeprep/dev-harness/<phase>/start.json` および `before-context.json` を保存。

### 3.2 局所検証: `dev:verify:fast`
```bash
npm run dev:verify:fast
# または: npm run dev:verify -- --mode fast
```
- 変更されたファイルのコード規約チェック（`lint:standards:changed`）。
- TypeScript 型検査（`tsc -p ./ --noEmit`）。
- 変更元ファイルに近接するテスト（`*.test.ts`, `__tests__/*.test.ts`）を自動検出し、ピンポイント実行。

### 3.3 リポジトリ評価 & 計測: `dev:eval`
```bash
npm run dev:eval -- --phase <phase-id>
```
- リポジトリ全域の TypeScript AST 解析 & Manual DI 配線解析を実行。
- SQLite Knowledge Store に一括保存 & ロード復元 & 近傍クエリの性能（所要時間・DBサイズ・ヒープ変化量）を計測。
- `evaluation/repository-known-paths.json`（Golden Set）を照合・評価。
- `.codeprep/dev-harness/<phase>/repository-eval.json` に保存。

### 3.4 完了時全体検証: `dev:verify:final`
```bash
npm run dev:verify:final -- --phase <phase-id>
# または: npm run dev:verify -- --mode final --phase <phase-id>
```
- `npm run check`, `npm run desktop:test`, `npm run cli:test`, `npm run mcp:test`, `npm run lint:standards:changed` を一括実行し、各ゲートの結果を集計。

### 3.5 Phase 完了 & レポート生成: `dev:phase:finish`
```bash
npm run dev:phase:finish -- --phase <phase-id>
```
- すべての検証・評価結果を統合し、`finish.json` および `phase-report.md` を生成。
- エージェントが追記すべき `Agent Review`（BLOCKER / SHOULD FIX / DEFER）のテンプレートを用意。

---

## 4. 状態ファイル (State Files)

出力先: `.codeprep/dev-harness/<phase-id>/`（Git 管理対象外）

```
.codeprep/dev-harness/<phase>/
├── start.json             # 開始時のリビジョン、クリーン状態、タスク情報
├── before-context.json    # CodePrep CLI Before Evaluation 出力
├── fast-verify.json       # 局所検証結果
├── repository-eval.json   # 構造メトリクス・Known Paths・性能計測結果
├── final-verify.json      # 全体品質ゲート集計結果
├── finish.json            # 完了サマリー
└── phase-report.md        # 成果報告書
```

---

## 5. Fast Verify と Final Verify の使い分け

- **Fast Verify (`dev:verify:fast`)**:
  - 実装中の短いループ（1〜2分間隔）で安価に実行。
  - 変更ファイルのみにスコープを限定し、フィードバックループを最短化。
- **Final Verify (`dev:verify:final`)**:
  - Phase 完了時または大きなマイルストーンの節目に 1 回まとめて実行。
  - リポジトリ全体の回帰（Regression）がないことを厳格に担保。

---

## 6. Repository Evaluation と性能ベンチマーク

- `dev:eval` は各 Phase の成果物がリポジトリ全体のスケールで健全に機能しているかを定量測定します。
- 測定項目:
  - ノード数、エッジ数、エビデンス数
  - 関係種別内訳（`references`, `implements`, `extends`, `binds_to`, `injects`）
  - DB ファイルサイズ（KB）
  - 所要時間（Session Setup, Language, Wiring, Save, Load, Query, Total）
  - ヒープメモリ増分（MB）

---

## 7. Known Paths Golden Set (`evaluation/repository-known-paths.json`)

CodePrep が把握すべき主要な構造的事実（インターフェース実装、Composition Root の配線、Constructor Injection）を機械照合可能な Golden Set として定義しています。
アナライザーや Mapper の変更時に意図せず重要関係が脱落していないかを常に 100% 検証できます。

---

## 8. エージェント非依存規約 (Agent-neutral Contract)

- すべてのスクリプトは `scripts/dev-harness/` に配置され、エージェント固有の処理（Claude 用 / Gemini 用）を持ちません。
- `--format json` 指定時は標準出力に純粋な JSON を出力し、外部ツールやスクリプトからの連携を容易にしています。

---

## 9. 失敗時のルール (Failure Handling)

- 検証失敗時は必ず非ゼロ終了コード（`exit 1` 等）で停止し、失敗箇所を明示します。
- Harness はエラーを自動修正したり、ユーザーに無断で bypass することは一切ありません。

---

## 10. 拡張ガイド (Extension Guide)

新たなアナライザー（例: Python, Java 等）や評価観点を追加する場合:
1. `types.ts` にメトリクス型を追加。
2. `repositoryEval.ts` にアナライザーの呼び出し・集計を追加。
3. `evaluation/repository-known-paths.json` に期待関係テストケースを追加。
4. `reportBuilder.ts` のレンダラーを拡張。
