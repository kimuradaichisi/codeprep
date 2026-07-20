# Context Recommendation v1 Design

## Goal

CodePrep Desktopが、選択したファイルに関連するドキュメントを説明可能な推薦候補として提示し、ユーザーが確認した候補だけを既存のトークン予算と出力生成へ含められるようにする。

## Scope

### In scope

- 既存DocGraph連携の品質向上
- DocGraphが利用できない場合の軽量な推薦フォールバック
- 推薦候補の理由、スコア、ソースの表示
- 推薦候補を初期状態では未選択として表示
- Searchパネルで推薦ソースを個別に有効化・無効化
- 候補キーによる重複排除とWindowsパス正規化
- 推薦処理の部分的な失敗を警告として扱い、元候補を保持
- 推薦候補を既存のトークン予算と出力生成へ接続

### Out of scope

- ベクトルデータベース、埋め込みモデル、オンラインLLM推薦
- DocIndexer本体の開発
- グラフ可視化UI
- 推薦候補の自動選択
- CodePrep本体の大規模な状態管理リファクタリング

## User Experience

候補ツリーでは、通常候補と推薦候補を区別できる。推薦候補には少なくとも推薦ソースとスコアを表示する。

推薦候補は候補一覧へ追加されるが、初期状態では選択しない。ユーザーがチェックボックスで選択した場合だけ、選択ファイル数、トークン予算、生成出力へ反映する。ユーザーは推薦候補を個別に選択または除外できる。

Searchパネルに推薦ソースの切替を置く。初期状態では次の4ソースを有効にする。

- Markdownリンク: 相対リンクおよびWikiリンク
- ファイル名・見出し一致: 選択文書の語句と他文書のファイル名・見出し
- Git co-change: Git履歴上で同時変更されたファイル
- ディレクトリ近接: 同じディレクトリまたは近接ディレクトリの文書

## Recommendation Sources

### DocGraph

既存のDocGraph連携を使用する。`.docgraph/graph.db`がない、外部コマンドが見つからない、終了コードが失敗、JSONが不正、または関連ファイルが存在しない場合は推薦を追加せず、検索全体を失敗させない。外部レスポンスは型ガードで検証し、`any`を使用しない。

### Markdown links

Markdown本文から相対リンクとWikiリンクを抽出する。プロジェクトルート外、絶対URL、存在しないファイルは候補に追加しない。リンク元の文書を推薦理由として保持する。

### File name and heading match

文書のファイル名とMarkdown見出しを正規化して照合する。空語、一般的すぎる語、拡張子だけの一致は推薦理由にしない。候補は同一プロジェクト内に限定する。

### Git co-change

Git履歴から選択文書と同一コミットで変更された文書を取得する。取得失敗やGit未導入は警告として扱う。共変更回数を決定的なスコアへ変換し、同一候補への他の推薦理由と統合する。

### Directory proximity

同一ディレクトリを最も高く、近接する親・子ディレクトリを低く評価する。ソースコードや設定ファイルなど、ドキュメント推薦の対象外となるファイル種別は除外する。

## Data Model

推薦候補は既存の候補モデルを拡張し、次の情報を保持する。

```ts
export type RecommendationSource =
  | 'docgraph'
  | 'markdownLink'
  | 'nameHeading'
  | 'gitCoChange'
  | 'directoryProximity';

export type RecommendationReason = Readonly<{
  source: RecommendationSource;
  score: number;
  detail: string;
}>;
```

既存候補と推薦候補が同じ`candidateKey`を持つ場合は候補を複製しない。推薦理由を配列へ追加し、候補の既存理由・スコア・選択状態を保持する。候補キーは既存の`candidateKey(projectId, relativePath)`を使用する。

## Data Flow

```text
selected candidates
  -> enabled recommendation sources
  -> source results and warnings
  -> candidateKey normalization
  -> duplicate merge and deterministic scoring
  -> renderer candidate tree
  -> user selection
  -> existing token budget and output generation
```

推薦処理の途中で1ソースが失敗しても、他ソースと元の候補は処理する。警告はSearchパネルの既存通知経路へ渡す。

## Architecture

- `desktop-core`: 推薦ソース型、入力、統合、重複排除、決定的スコア計算。Node.js、Electron、VS Code APIを参照しない。
- `desktop-node`: Markdown、ファイル一覧、Git、DocGraphの外部データ取得と安全な解析。
- `apps/desktop`: IPCの型付き境界と許可チャンネル。未知の入力、パス、レスポンスを境界で拒否または警告化する。
- `apps/desktop/renderer`: Searchパネルのソース切替、候補理由表示、未選択推薦候補の表示。既存の予算計算と出力フローを再利用する。

## Error Handling and Safety

- プロジェクト登録ルート外のパスは候補へ追加しない。
- 外部コマンドへシェル文字列を渡さず、argv配列で実行する。
- 不正なJSON、未知の推薦ソース、NaN、Infinity、負数スコアは無効として扱う。
- 推薦処理の失敗で既存候補、選択状態、出力プレビューを消去しない。
- 推薦候補は明示的なユーザー操作なしにトークン予算へ加算しない。
- 既存の150行/15行/`any`禁止の制約を守る。

## Acceptance Criteria

1. 選択したMarkdownから有効な相対リンクを推薦候補として表示できる。
2. DocGraphがない環境でも、選択した推薦ソースから候補を生成できる。
3. 各推薦候補に少なくとも1つのソース、理由、決定的スコアが表示される。
4. 同じ候補が複数ソースで見つかっても、候補一覧には1件だけ表示される。
5. 推薦候補は初期状態で未選択であり、選択後だけトークン数と出力へ反映される。
6. Searchパネルで4つのフォールバックソースを個別に切り替えられる。
7. WindowsパスとPOSIXパスの表記差が候補キーの重複を生まない。
8. DocGraph、Git、ファイル解析の一部が失敗しても、元候補を保持して警告を表示する。
9. `npm run check-types`、`npm run lint`、`npm run desktop:test`、`npm run desktop:build`が成功する。
10. 推薦処理に関するドメイン、アダプター、IPC、rendererの境界テストが追加される。

## Test Strategy

- Domain: スコア計算、ソース統合、重複排除、順序、境界値。
- Node adapters: Markdownリンク、見出し、Git出力、DocGraph JSON、不正入力、パス境界。
- Application: ソース切替、部分失敗、元候補保持、未選択推薦候補。
- IPC: 入力検証、許可チャンネル、未知ソース拒否。
- Renderer: ソース切替、推薦理由表示、チェック状態、トークン予算への反映。

## Non-goals and Future Work

本仕様ではセマンティック検索や埋め込みを導入しない。推薦品質の実測値と利用状況を確認した後、DocIndexerが出力する静的マップを読み込む統合を別計画として検討する。
