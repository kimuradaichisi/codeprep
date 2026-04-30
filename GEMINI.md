# CodePrep - AI開発ガイド (GEMINI.md)

このドキュメントは、CodePrep プロジェクトにおいて AI エージェント（Gemini / Antigravity）が自律的に開発を進めるための「憲法」および「ガイドライン」をまとめたものです。`.ai/` ディレクトリ内の各種規約を正典とし、AI はこれらに全面的に従う必要があります。

---

## 1. 🤖 AI自律動作の原則 (Autonomous Mode)

AI は単なるコード生成器ではなく、**「自律型エンジニアリング・エージェント」**として動作します。

- **サイレント実行**: 各ステップごとの過度な説明を避け、成果物（コード、ドキュメント）の出力に集中せよ。
- **規約の強制適用**: 後述する定量的制約を 1 行でも超えるコードは「システムエラー」と見なす。

## 2. 📏 「神クラス」殺しの定量的制約 (God-Class Killer)

コードの複雑さを抑えるため、以下の数値を「鉄の掟」として厳守せよ。超過の兆候が見えたら、即座にリファクタリング（クラス分割）せよ。

| 指標 | 基準値 | 備考 |
| :--- | :--- | :--- |
| **1ファイル最大行数** | **150行以下** | 超える場合は責務が多すぎる。 |
| **1メソッド最大行数** | **15行以下** | 超える場合は抽象化レベルの設計ミス。 |
| **循環的複雑度** | **5以下** | 早期リターンを徹底せよ。 |
| **コンストラクタ引数** | **4つ以下** | 多すぎる場合は VO への集約を検討。 |

## 3. 🏗 アーキテクチャ方針 (Feature-first DDD)

プロジェクトは、技術的レイヤー（services/engines）から、**機能（Bounded Context）単位の分割**へと移行中である。

### 推奨されるディレクトリ構造 (`src/features/`)
- **domain/**: 純粋なビジネスロジック。Value Object を徹底利用し、`vscode` への依存を排除。
- **application/**: ユースケース（1 クラス 1 ユースケース）。
- **infrastructure/**: 外部依存（VSCode API, Node.js fs）。Adapter パターンで隔離。

> [!IMPORTANT]
> ドメイン層およびアプリケーション層への `import 'vscode'` の混入は厳禁とする。

## 4. ✅ 品質とテスト戦略

- **Zero Any Policy**: `any` の使用は厳禁。`unknown` と Type Guard を活用せよ。
- **Resultパターンの採用**: `try-catch` を避け、成功と失敗を明示的に扱う `Result<T, E>` 型を戻り値に使用せよ。
- **テストのピラミッド**:
    - **Unit Tests (Vitest)**: ドメインロジックの高速なテスト。
    - **Integration Tests (Mocha)**: VSCode 拡張機能ホスト上での結合テスト。

---

## 🔗 関連ドキュメント（正典）
- [.ai/RULE.md](file:///D:/git/codeprep/.ai/RULE.md) - 自律動作の基本原則
- [.ai/DEVELOPMENT_STANDARDS.md](file:///D:/git/codeprep/.ai/DEVELOPMENT_STANDARDS.md) - コーディング規約
- [.ai/ARCHITECTURE.md](file:///D:/git/codeprep/.ai/ARCHITECTURE.md) - アーキテクチャ設計図
- [.ai/QUALITY_STANDARDS.md](file:///D:/git/codeprep/.ai/QUALITY_STANDARDS.md) - 品質・テスト基準
