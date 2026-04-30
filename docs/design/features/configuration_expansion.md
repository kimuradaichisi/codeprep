# Configuration Expansion Specification

## 1. Overview
ユーザーが拡張機能の挙動をより詳細にカスタマイズできるように、VSCodeの設定（contributes.configuration）を拡張する。

## 2. New Configuration Properties

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `codeprep.outputFilePath` | `string` | `"codeprep-output.txt"` | 生成されたプロンプトの保存先ファイル名。 |
| `codeprep.tokenLimit` | `number` | `100000` | 生成前に警告を出すトークン数の閾値。 |
| `codeprep.nativeEngine.removeComments` | `boolean` | `false` | (Native Engine) ソースコードからコメントを削除する。 |
| `codeprep.nativeEngine.includeEmptyLines` | `boolean` | `true` | (Native Engine) 出力に空行を含める。 |
| `codeprep.autoRefreshTree` | `boolean` | `true` | ファイルシステムの変化を検知してツリービューを自動更新する。 |

## 3. Impact Analysis
- **CommandService**: `outputFilePath` を参照してファイル書き込み先を決定。
- **TokenService**: `tokenLimit` を超えた際に UI 経由で警告をトリガー。
- **NativeEngine**: `removeComments`, `includeEmptyLines` を処理ロジックに組み込む。
- **FileTreeProvider**: `autoRefreshTree` が有効な場合、FileSystemWatcher を登録。
