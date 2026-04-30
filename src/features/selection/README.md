# Selection Feature

## 概要
ユーザーが生成対象として選択したファイルの管理を担当します。

## 構造
- **domain/**:
  - `Selection.ts`: 選択状態の保持と操作（Entity/Aggregate）。
  - `ISelectionRepository.ts`: 選択状態の永続化インターフェース。
  - `IFileValidator.ts`: ファイルの選択可否判定インターフェース。
- **application/**:
  - `SelectionUseCase.ts`: 全選択、クリア、Git 差分選択などのユースケース。
- **infrastructure/**:
  - `VSCodeSelectionRepository.ts`: `workspaceState` を使った選択状態の保存。
  - `VSCodeFileValidator.ts`: 除外パターンに基づいたフィルタリング。
  - `VSCodeWorkspaceRepository.ts`: ワークスペース内のファイル一覧取得。
- **__tests__/**:
  - `Selection.test.ts`: 選択ロジックの単体テスト。
  - `SelectionUseCase.test.ts`: 複合的な選択ユースケースのテスト。

## 責務
- 現在どのファイルが選択されているかの状態を管理します。
- ディレクトリが選択された際の子要素への再帰的な適用ロジックを持ちます。
- Git の変更履歴や除外設定に基づいたインテリジェントな選択機能を提供します。
