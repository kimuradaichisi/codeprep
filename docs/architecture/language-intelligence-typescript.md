# CodePrep Phase 7D-A: TypeScript Language Intelligence Specification

**Status:** Approved  
**Date:** 2026-09-13  
**Target Revision (Baseline):** `92700c250733223965d10e9394c54e849b31c1d6`  
**Phase Context:** Phase 7D-A (TypeScript Language Intelligence / Structural Relations)  

---

## 1. Goals (目標)

Phase 7C までの CodePrep Repository IR は、正規表現による import 依存関係抽出（`DEPENDS_ON`）や字句ベースのシンボル抽出にとどまっており、言語レベルの型情報や構文木に基づく構造的関係（`REFERENCES`, `IMPLEMENTS`, `EXTENDS` 等）を欠いていた。

Phase 7D-A の目標は以下の通りである:
1. **言語構造的事実の決定論的抽出**:
   - TypeScript リポジトリを対象に、型チェッカー・AST に基づく確度の高い Relation（`REFERENCES`, `IMPLEMENTS`, `EXTENDS`）を機械的に抽出する。
2. **言語非依存 Port / Adapter 分離**:
   - 言語処理エンジン（TypeScript Compiler）を Application レイヤーの `LanguageIntelligencePort` の背後に完全に隠蔽し、将来の Java, Python 等の追加時に IR 側を変更不要とする。
3. **既存 Repository IR との安全な統合**:
   - 抽出した Relation を Phase 7B で定めた `RepositoryEdge`（`category: 'deterministic-ast'`）として IR に注入する。
4. **実機（CodePrep 自身）での動作実証**:
   - CodePrep 自身のソースコードに対し、具象クラスとインターフェースの実装関係、ユースケースとインターフェースの参照関係が正しく抽出できることを統合テストで実証する。

---

## 2. Capability Matrix (能力マトリクス)

Phase 7D-A における TypeScript Language Intelligence の機能サポート状況は以下の通りである。

| 機能 / Relation | サポート状況 | 採用手法 / 理由 |
| :--- | :---: | :--- |
| **`IMPLEMENTS`** | **FULL** | AST `HeritageClause` (SyntaxKind: `ImplementsKeyword`) + TypeChecker による型シンボル解決 |
| **`EXTENDS`** | **FULL** | AST `HeritageClause` (SyntaxKind: `ExtendsKeyword`) + TypeChecker によるクラス・インターフェース継承解決 |
| **`REFERENCES`** | **FULL** | AST 識別子（Identifier）走査 + `tc.getSymbolAtLocation` + `ts.SymbolFlags.Alias` 解消による宣言先トップレベルシンボル特定 |
| **`CALLS`** | **DEFER** | 初期 IR 構築時の全件走査は計算量・クエリ爆発のリスクが高いため、Lazy / On-Demand クエリとして Phase 7D-A では見送り |
| **DI / Container** | **EXCLUDE** | Inversify / TSyringe などのコンテナバインディングは言語機能ではなくフレームワーク層であるため Phase 7D-B へ分離 |

---

## 3. Chosen Mechanism (選定手段とその理由)

TypeScript の言語解析手法として、以下の2つのアプローチを比較検討した。

### 比較評価
1. **Language Server Protocol (LSP) 外部プロセスデーモン**:
   - メリット: VSCode や tsserver と同等の完全な言語機能。
   - デメリット: プロセス起動オーバーヘッド、OS（Windows / Linux）間のプロセス管理差異、IPC 通信コスト、VSCode Extension Host / CLI 双方での安定性確保の困難さ。
2. **インプロセス TypeScript Compiler API (`ts.createProgram` + AST + `TypeChecker`)**:
   - メリット: 同一 Node.js プロセス内で完全に動作しゼロ外部プロセス依存。Windows Native 環境でも最高速・高信頼。AST と TypeChecker に直接アクセス可能。
   - デメリット: 巨大リポジトリでの初回 Program 生成メモリ消費。

### 採用決定
**インプロセス TypeScript Compiler API** を採用した。  
CodePrep は CLI および VSCode 拡張機能の双方から同一の UseCase で駆動される。外部 LSP プロセスのライフサイクル管理を排除することで、決定論的かつポータブルな解析基盤を確立した。

---

## 4. Port Boundary (LanguageIntelligencePort 設計)

言語解析機能は、Application レイヤーの抽象 Port として定義され、TypeScript 固有の型や API（`ts.*`）は一切漏洩しない。

### `LanguageIntelligencePort`
```typescript
export interface LanguageIntelligencePort {
  getCapabilities(): LanguageCapabilities;
  analyze(input: LanguageAnalysisInput): Promise<LanguageAnalysisResult>;
}
```

### DTO
- **`LanguageAnalysisInput`**: `{ workspaceRoot: string; relativePaths?: readonly string[]; }`
- **`LanguageStructuralRelation`**:
  - `source`: `{ path: string; symbolName: string; symbolKind: string; location?: NodeLocation; }`
  - `target`: `{ path: string; symbolName: string; symbolKind: string; location?: NodeLocation; }`
  - `relationType`: `'references' | 'implements' | 'extends' | 'calls'`
  - `confidence`: `1.0` (AST 決定論的解析)
  - `analyzer`: `'typescript-compiler'`

---

## 5. Analyzer Responsibilities (責務分割)

単一責任原則（SRP）および God-Class Killer Policy（150行/15行制限）を徹底するため、インフラ層のアダプターを以下の 5 つのモジュールに分割した。

1. **`TypeScriptProgramLoader.ts`**:
   - `tsconfig.json` の探索・パース、および `ts.createProgram` による Program 生成を担当。
2. **`TypeScriptSymbolLocator.ts`**:
   - AST ノードから相対パス、行番号、シンボル種別（`interface`, `class`, `function` 等）を正規化して抽出。
3. **`TypeScriptInheritanceAnalyzer.ts`**:
   - `HeritageClause` を走査し、`implements` / `extends` の Relation を抽出。
4. **`TypeScriptReferenceAnalyzer.ts`**:
   - 識別子参照（Identifier Reference）を走査し、Alias 解消を行って `references` Relation を抽出。
5. **`TypeScriptLanguageAdapter.ts`**:
   - `LanguageIntelligencePort` を実装し、上記 Analyzer を統括して一括結果を返却。

---

## 6. REFERENCES (識別子参照解析と Alias 解消)

TypeScript におけるシンボル参照解決において、重要な技術的課題となったのが **`import` 文によるシンボル Alias** である。

### 課題
```typescript
import { WorkspacePathResolver } from '../domain/WorkspacePathResolver';
// ...
export class ClipboardSelectionUseCase {
  constructor(private readonly resolver: WorkspacePathResolver) {}
}
```
上記コードで `WorkspacePathResolver` の識別子に対して `tc.getSymbolAtLocation(node)` を取得すると、宣言先ではなく `import` 文自体の Alias シンボル（`SymbolFlags.Alias`）が返される。このままでは同一ファイル内の import 行への自己参照になってしまう。

### 解決策
`resolveActualSymbol` ヘルパーにより、`flags & ts.SymbolFlags.Alias` を検出した場合は `tc.getAliasedSymbol(sym)` を再帰的に解決し、定義元のファイルおよびトップレベルシンボル（Class / Interface / TypeAlias 等）を特定する。

---

## 7. IMPLEMENTS / EXTENDS (継承・実装関係の抽出)

クラスおよびインターフェース宣言の `heritageClauses` を解析する。

1. **節の種類判定**:
   - `clause.token === ts.SyntaxKind.ImplementsKeyword` → `implements`
   - `clause.token === ts.SyntaxKind.ExtendsKeyword` → `extends`
2. **継承先シンボル解決**:
   - 各 `clause.types` の式から `tc.getSymbolAtLocation` でシンボルを特定。
   - 宣言先が `.d.ts`（`node_modules` や標準ライブラリ）の場合はフィルタリングし、ワークスペース内のリレーションのみを IR 対象とする。

---

## 8. CALLS Decision (採用見送りと On-Demand Query への整理)

### 見送りの理由
全ファイル・全関数に対する `CALLS`（Call Hierarchy）の事前抽出は以下の問題がある:
1. **計算量とメモリの爆発**: 大規模リポジトリで全関数呼び出しを抽出すると、Edge 数が数万〜数十万に達し、In-Memory IR の構築時間とメモリを過剰に消費する。
2. **Task 解決における不要なノイズ**: 大半の呼び出し関係は特定のタスク解決には不要であり、全体 IR に保持するよりもタスク起点の Lazy / On-Demand 走査の方が遥かに効率的である。

### 決定事項
- Phase 7D-A では `capabilities.callHierarchy = false` とし、初期 IR 構築フェーズでの一括走査を **DEFER** とする。
- 将来、特定のシンボルやファイルが Context Candidate に選ばれた際、局所的に Call Hierarchy を掘り下げる On-Demand Analyzer として設計する。

---

## 9. IR Mapping (`LanguageRelationMapper`)

抽出された `LanguageStructuralRelation` は、`LanguageRelationMapper` を通じて `RepositoryIR` の `RepositoryEdge` にマッピングされる。

- **Source / Target ノード特定**:
  - パスが一致するファイルノード（`FILE`）またはシンボルノード（`SYMBOL`）へバインド。
- **Edge 属性**:
  - `relationType`: `references` / `implements` / `extends`
  - `isDerived`: `false` (言語定義に基づく構文的事実)
  - `confidence`: `1.0`
- **Evidence 記録**:
  - `category`: `'deterministic-ast'`
  - `analyzer`: `'typescript-compiler'`
  - `sourceLocation`: 発生箇所の行・列番号

---

## 10. Known-path Validation (実機統合テストでの検証結果)

CodePrep 自身の実コードを用いた統合テスト（`TypeScriptKnownPath.integration.test.ts`）において、以下の2つの構造的事実が機械的に抽出できることを実証した。

### 実証 1: `IMPLEMENTS`
- **Source**: `src/features/selection/infrastructure/path/VSCodeWorkspacePathResolver.ts` (`VSCodeWorkspacePathResolver`)
- **Target**: `src/features/selection/domain/WorkspacePathResolver.ts` (`WorkspacePathResolver`)
- **Relation**: `implements` (confidence: 1.0)
- **結果**: 正常に抽出を確認。

### 実証 2: `REFERENCES`
- **Source**: `src/features/selection/application/ClipboardSelectionUseCase.ts`
- **Target**: `src/features/selection/domain/WorkspacePathResolver.ts` (`WorkspacePathResolver`)
- **Relation**: `references` (confidence: 1.0)
- **結果**: 正常に抽出を確認（Alias 解消が正常動作）。

---

## 11. Performance (実測パフォーマンスとスケーラビリティ)

スモークテスト（`TypeScriptRepoSmoke.test.ts`）による実測値:

### 1. サンプル 5 ファイル局所走査
- **対象**: CodePrep のコアファイル 5 件
- **抽出 Relation 総数**: 53 件 (`implements`: 1, `extends`: 0, `references`: 52)
- **所要時間**: **約 1.8 〜 2.1 秒** (Program 生成 + 全抽出)

### 2. リポジトリ全域走査 (Repository-Wide Structural Smoke)
- **解析対象ファイル数 (with relations)**: 457 ファイル
- **抽出 Relation 総数**: **3,938 件**
  - `REFERENCES`: 3,886 件
  - `IMPLEMENTS`: 43 件
  - `EXTENDS`: 9 件
  - `Unresolved`: 0 件
- **所要時間 (Elapsed Time)**: **6,478 ms (約 6.5 秒)**
- **Heap メモリ推移**:
  - `Heap Before`: 161.21 MB
  - `Heap After`: 384.25 MB
  - `Heap Delta`: +223.04 MB
- **評価**: 全体 457 ファイル走査でもヒープ増加量は約 220MB に収まり、6.5秒で完走。初期構築時の負荷としても十分実用可能であることが実証された。

---

## 12. Limitations (現在の制約と対象範囲)

1. **TypeScript / JavaScript 専用**:
   - 現在のアダプターは TypeScript AST に特化しており、他言語（Java / Python 等）は対象外（Port を実装した別アダプターが必要）。
2. **動的インポート / リフレクション**:
   - 文字列変数を介した動的 `import()` や文字列評価による呼び出しは追跡不可。
3. **外部ライブラリ (`node_modules`) の除外**:
   - 現在はワークスペース内部の構造関係のみを追跡し、外部 npm パッケージへの参照は除外している。

---

## 13. Phase 7D-B Input (DI / Framework 分析への接続点)

Phase 7D-A で確立した `IMPLEMENTS` および `REFERENCES` は、Phase 7D-B（DI / Framework Analysis）の直接の土台となる。

### 接続のシナリオ
- **具象クラス特定 (`BINDS_TO`)**:
  - Phase 7D-B では、DI コンテナ設定やファクトリを解析し、「どの Interface がどの具象 Class にバインドされるか」を抽出する。
  - Phase 7D-A の `IMPLEMENTS` 関係を参照することで、バインド候補が言語仕様上妥当であるかを検証可能。
- **ディスパッチ先候補特定 (`MAY_DISPATCH_TO`)**:
  - `UseCase REFERENCES Interface` と `Class IMPLEMENTS Interface` を組み合わせることで、インターフェースを介した間接的な呼び出し経路を導出可能となる。
