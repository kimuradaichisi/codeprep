# Prompt Feature

## 概要
LLM に渡すためのカスタムプロンプト（指示文）の管理を担当します。

## 構造
- **domain/**:
  - `PromptTemplate.ts`: 単一のプロンプト定義（Value Object）。
  - `PromptCollection.ts`: プロンプトの集合管理（Entity）。
  - `IPromptRepository.ts`: データ永続化のインターフェース。
- **application/**:
  - `PromptUseCase.ts`: プロンプトの取得や選択状態の管理。
- **infrastructure/**:
  - `VSCodePromptRepository.ts`: VSCode の設定（settings.json）からプロンプトを読み込む実装。
- **__tests__/**:
  - `PromptDomain.test.ts`: ドメインモデルのロジックテスト。
  - `PromptUseCase.test.ts`: ユースケースのテスト。

## 責務
- VSCode の設定からカスタムプロンプト一覧を読み込みます。
- ユーザーが現在選択しているプロンプト（指示文）の状態を保持します。
- 必要に応じてデフォルトのプロンプトを提供します。
