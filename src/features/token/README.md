# Token Feature

## 概要
選択されたファイルの合計トークン数の推定と表示を担当します。

## 構造
- **domain/**:
  - `TokenCount.ts`: トークン数の計算（Value Object）。
  - `TokenStatistics.ts`: 合計やリミット判定の統計モデル（Entity）。
  - `ITokenPresenter.ts`: UI 表示のインターフェース。
- **application/**:
  - `TokenUseCase.ts`: ファイルリストからの統計更新ユースケース。
- **infrastructure/**:
  - `VSCodeStatusBarPresenter.ts`: VSCode のステータスバーへの表示実装。
- **__tests__/**:
  - `Token.test.ts`: トークン計算と統計のロジックテスト。

## 責務
- ファイルの内容から、LLM に渡す際のトークン数を推定します（現在は簡易計算）。
- ユーザーに対して現在の消費トークン数と、設定されたリミットに対する警告を表示します。
