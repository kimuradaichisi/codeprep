# テストフレームワーク導入計画書

## 1. 目的
`codeprep-vscode` におけるロジックの正当性を自動検証し、デグレーションを防止する。特に、複雑な文字列操作を含む Git 連携機能の信頼性を確保する。

## 2. 選定ツール
- **Test Runner**: `vitest`
    - 理由: Vite エコシステムによる高速な実行、TypeScript のネイティブサポート、VSCode API のモックの容易性。
- **Coverage**: `@vitest/coverage-v8`

## 3. テスト階層
- **Unit Test**: `src/tests/unit/`
    - 対象: `GitUtils`, `SelectionService`, `TokenService`
    - 特徴: 外部依存（Git, VSCode API）を完全にモック化。
- **Integration Test**: `src/tests/integration/`
    - 対象: サービス間連携
- **E2E Test**: `src/test/` (既存の VSCode 拡張テスト基盤を将来的に拡張)

## 4. 実施項目
1. [ ] `devDependencies` への `vitest` 追加
2. [ ] `package.json` への `test:unit` スクリプト定義
3. [ ] `GitUtils.getModifiedFiles` におけるスペースを含むパスの不具合を証明するテスト作成
4. [ ] 修正後の再テストと合格確認
