# CodePrep と DocGraph の連携実装計画

DocGraph を用いて解析したナレッジグラフデータベース（`.docgraph/graph.db`）を利用して、**CodePrep Desktop でドキュメント（Markdown 設計書など）を選択した際に関連ドキュメントを候補（Suggested）として自動提案する機能**を実装します。

## ユーザーワークフロー

```
① ユーザーが CodePrep Desktop を起動し、解析対象プロジェクトを開く
    ↓
② ユーザーが設計書（例: docs/design/order.md）を選択する
    ↓
③ CodePrep が裏で `docgraph related docs/design/order.md` コマンドを実行
    ↓
④ 得られた関連ファイル（例: docs/design/customer.md）を Suggested 候補としてツリーに自動追加
```

---

## Proposed Changes

### 1. ドメイン・ポート定義 (CodePrep)

#### [MODIFY] [ports.ts](file:///d:/git/codeprep/src/features/desktop-core/application/ports.ts)
- 関連ドキュメントの型定義 `DocGraphRelation` を追加します。
- `DocGraphPort` インターフェースを追加し、`DiscoverFilesPorts` に追加します。

```typescript
export type DocGraphRelation = Readonly<{
  path: string;
  reason: string;
  confidence: number;
}>;

export type DocGraphPort = Readonly<{
  findRelated(project: Project, relativePath: string): Promise<readonly DocGraphRelation[]>;
}>;

export type DiscoverFilesPorts = Readonly<{
  // ... 既存のポート
  docGraph: DocGraphPort;
}>;
```

---

### 2. ユースケース実装 (CodePrep)

#### [MODIFY] [DiscoverFilesUseCase.ts](file:///d:/git/codeprep/src/features/desktop-core/application/DiscoverFilesUseCase.ts)
- `appendDependencies` メソッドと同様の要領で、探索候補ファイルに `.md` が含まれる場合に `DocGraphPort` を使って関連ドキュメントを検索し、候補に追加する `appendDocGraphRelations` ロジックを追加します。
- 検出された関連ファイルの理由（CandidateReason）は `'dependency'` または新しい理由 `'docgraph'` として扱います。

---

### 3. インフラ・クライアント実装 (CodePrep)

#### [NEW] [DocGraphClient.ts](file:///d:/git/codeprep/src/features/desktop-node/DocGraphClient.ts)
- `ProcessRunner` を使って、プロジェクトルートをカレントディレクトリとして `docgraph related <relativePath> --format json` を実行します。
- 出力される JSON（`{"related": [...]}`）をパースし、`DocGraphRelation[]` を返却します。
- プロジェクト内に `.docgraph/graph.db` が存在しない場合、または `docgraph` コマンド実行が失敗した場合は、エラーとせず空配列を返して安全にフォールバックします。

---

### 4. インターフェース配線 (CodePrep)

#### [MODIFY] [DesktopHandlers.ts](file:///d:/git/codeprep/apps/desktop/DesktopHandlers.ts)
- `discoverFiles` ハンドラ内で `DiscoverFilesUseCase` をインスタンス化する際、`docGraph: new DocGraphClient()` を渡すように配線します。

---

## Verification Plan

### Automated Tests
- `DocGraphClient` に対する単体テストを追加し、コマンド実行時の JSON パースや例外ハンドリングをテストします。
- `DiscoverFilesUseCase` のモックテストを追加し、Markdown ファイル選択時に関連ドキュメントが suggested に入ることを確認します。

### Manual Verification
- CodePrep Desktop を開発起動します：
  ```bash
  npm run desktop:dev
  ```
- データベースが生成済みの [si_kiban_light](file:///D:/git/si_kiban_light) プロジェクトを選択して開きます。
- 関連が存在する Markdown ファイル（例: `docs/design/order.md`）をエクスプローラーからダブルクリック、またはコピーして Candidates に読み込ませた際、関連ドキュメントが suggested に入ることを確認します。
