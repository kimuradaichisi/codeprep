# CodePrep - DocGraph 連携実装タスク

## フェーズ 1: ドメイン・ポート定義
- [ ] `ports.ts` — `DocGraphRelation`, `DocGraphPort` の型定義追加、および `DiscoverFilesPorts` への追加

## フェーズ 2: インフラ層（クライアント実装）
- [ ] `DocGraphClient.ts` — 新規作成（`docgraph related` コマンドを子プロセスとして実行するクライアント）

## フェーズ 3: ユースケース実装
- [ ] `DiscoverFilesUseCase.ts` — `appendDocGraphRelations` メソッドの実装（`.md` 選択時に関連ファイルを Suggested に自動追加）

## フェーズ 4: インターフェース配線
- [ ] `DesktopHandlers.ts` — `DiscoverFilesUseCase` インスタンス化の際に `DocGraphClient` を渡すよう配線

## フェーズ 5: 単体テストと動作検証
- [ ] `DocGraphClient` の単体テストの追加
- [ ] `DiscoverFilesUseCase` のモックテストの追加
- [ ] 手動動作確認（`si_kiban_light` 等のプロジェクトを使って確認）
