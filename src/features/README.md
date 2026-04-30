# Features

このディレクトリには、CodePrep の各機能が Feature-first DDD (Domain-Driven Design) に基づいて配置されています。

## アーキテクチャ原則

各機能（Feature）は以下のディレクトリ構造を持ち、レイヤー間の依存関係を厳格に管理しています。

1. **domain/** (最内層):
   - ビジネスロジックとドメインモデル。
   - 他の層や外部ライブラリ（`vscode` 等）に依存してはいけません。
2. **application/**:
   - ユースケース。ドメインモデルを組み合わせて具体的な機能を実現します。
3. **infrastructure/**:
   - 外部依存の実装（VSCode API, ファイルシステム, 設定など）。
   - ドメイン層のインターフェースを実装します。
4. **__tests__/**:
   - その機能に関する単体テストおよび結合テスト。

## 各機能の概要

| 機能 | ディレクトリ | 役割 |
| :--- | :--- | :--- |
| **Selection** | `./selection` | ファイルの選択状態とバリデーションの管理 |
| **Engine** | `./engine` | コンテンツ（Markdown/XML/JSON）の生成 |
| **Prompt** | `./prompt` | 指示文テンプレートの管理 |
| **Token** | `./token` | トークン消費量の推定と表示 |
| **UI** | `./ui` | サイドバーツリーやプレビュー画面 |

## 依存関係の鉄則
- `domain` および `application` 層で `import 'vscode'` を行うことは厳禁です。
- VSCode 固有の機能が必要な場合は、`domain` でインターフェースを定義し、`infrastructure` で実装してください。
