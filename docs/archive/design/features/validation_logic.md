# 🛡️ Selection Validation Logic Design

## 1. Overview
`SelectionService` に注入するバリデーションロジックの設計。Git 連携やプリセット読み込み時に、不正なファイルが選択状態に入ることを防ぐ。

## 2. Validation Rules
### R1: Diskside Existence (実在性)
- **Logic**: 全ての追加対象パスに対し、非同期でディスク上の存在を確認する。
- **Tool**: `vscode.workspace.fs.stat`
- **Error Handling**: 存在しないファイルは警告なしでスキップ、またはログを記録。

### R2: Exclusion Patterns (除外照合)
- **Logic**: `codeprep.exclude` 設定（string配列）に合致するパスを除外する。
- **Implementation**: 
  - オプションA: `minimatch` ライブラリの導入（Vitestでのテストが容易）。
  - オプションB: `vscode.RelativePattern` を利用。
- **Decision**: 依存関係を増やさないため、まずは簡易的なパターンマッチを実装し、将来的に `minimatch` への移行を検討する。

## 3. Implementation Details (SelectionService.ts)
```typescript
interface IValidationResult {
    valid: string[];
    invalid: string[];
}

// 疑似コード
async function validatePaths(paths: string[]): Promise<string[]> {
    const excludes = getExcludesFromConfig();
    const results = await Promise.all(paths.map(async p => {
        const exists = await checkExistence(p);
        const isExcluded = matchPattern(p, excludes);
        return (exists && !isExcluded) ? p : null;
    }));
    return results.filter(p => p !== null) as string[];
}
```

## 4. Test Scenarios
- **TS1**: Git から `.git/config` が返ってきた場合、正しく除外されるか。
- **TS2**: プリセット保存後にファイルが削除された場合、読み込み時にスキップされるか。
- **TS3**: スペースを含む有効なパスが正しくバリデーションをパスするか。
