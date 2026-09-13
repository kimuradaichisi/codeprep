# CodePrep Phase 7D-B: Manual Composition / Dependency Injection Wiring Specification

**Status:** Approved  
**Date:** 2026-09-13  
**Target Revision (Baseline):** `2097a9b2738d8a1d245eaaafeac68423377873cc`  
**Phase Context:** Phase 7D-B (Manual Composition / DI Wiring Analysis)  

---

## 1. Goals / Non-goals

### Goals (目標)
1. **手動 Composition / Constructor Injection の静的配線解析**:
   - TypeScript リポジトリにおける明示的な `new` 式およびコンストラクタ引数渡しから、依存性の注入・バインディング関係を決定論的に抽出する。
2. **Language Intelligence との完全な責務分離**:
   - 言語構造解析（`REFERENCES`, `IMPLEMENTS`, `EXTENDS`）を行う `LanguageIntelligencePort` に DI 解析を混入させず、独立した `DependencyWiringPort` として設計する。
3. **Program / TypeChecker のセッション再利用**:
   - Language Intelligence と Wiring Analysis 間で同一の `TypeScriptAnalysisSession`（`ts.Program` / `TypeChecker`）を共有し、重複ロードによる計算量・メモリ爆発を完全に防止する。
4. **実機（CodePrep 自身）での動作実証**:
   - CodePrep の `SelectionActionHandler.ts` や `src/extension.ts` に実在する Constructor Injection（`WorkspacePathResolver` -> `VSCodeWorkspacePathResolver`, `ClipboardSelectionUseCase` -> `VSCodeWorkspacePathResolver` 等）を機械的に抽出し、確信度 1.0 の `RepositoryEdge` として IR へ統合する。

### Non-goals (対象外)
- 動的 DI コンテナ（Spring, NestJS, Inversify, TSyringe）のランタイム解決
- デコレータ駆動、リフレクション、設定ファイル駆動のクラス解決
- Service Locator パターン、動的プロパティアクセス、動的 import
- `MAY_DISPATCH_TO`（`CALLS` が Phase 7D-A で DEFER されているため、本フェーズでは作成せず Derived Relation として将来検討）

---

## 2. Relation Semantics (関係の意味論)

曖昧な Edge を防ぐため、以下の通り意味論を厳格に固定する。

### `BINDS_TO`
- **形式**: `Abstraction / Port` --[`BINDS_TO`]--> `Concrete Implementation`
- **意味**: ある静的な Composition Site（`new` 呼び出し箇所）において、この抽象型（Interface, Abstract Class, TypeAlias）に対してこの具象クラスが配線されている事実が存在する。
- **重要点**: 「リポジトリ全体で唯一の実装」を意味しない。同一 Port に複数の Implementation がバインドされる構成（CLI 用 / Desktop 用など）を許容し、Evidence の `sourcePath` / `location` で site を追跡する。

### `INJECTS`
- **形式**: `Consumer` --[`INJECTS`]--> `Concrete Implementation`
- **意味**: ある Composition Site において、Consumer クラスの依存引数へ Concrete Implementation が渡されている。
- **メタデータ**: パラメータ名（`parameterName`）、パラメータ位置（`parameterIndex`）、静的宣言型名（`declaredType`）を Evidence メタデータに保持する。

---

## 3. Supported Composition Patterns (対応パターン)

CodePrep で実用されている以下の 2 パターンを機械的・安全に抽出対象とする。

1. **Pattern A: Direct Inline Construction**
   ```typescript
   new EnrichEntryPointCandidatesUseCase({
     ...
     recommendations: { gitCoChange: new GitCoChangeClient() }
   })
   ```
2. **Pattern B: Local Variable Alias Construction**
   ```typescript
   const resolver = new VSCodeWorkspacePathResolver(deps.root ?? '');
   this.clipboardUseCase = new ClipboardSelectionUseCase(
     deps.useCase.currentSelection,
     resolver
   );
   ```
   同一字句スコープ（メソッド・関数内）で `const` / `let` により `new` 式で初期化されたローカル変数への参照を追跡し、渡された具象クラスを特定する。

---

## 4. Unsupported / Dynamic Patterns (非対応・安全なスキップ)

以下のパターンは推測を行わず、安全にスキップ（Unresolved）とする:
- 再代入（Reassignment）や条件分岐による代入
- 任意のファクトリ関数の戻り値（例: `createImpl()`）
- 動的コンテナ解決（例: `container.resolve(token)`）
- オブジェクトプロパティへの後付け代入・ミューテーション
- 配列インデックスアクセス、動的キーアクセス

---

## 5. DependencyWiringPort (Application Port 設計)

言語非依存の Application レイヤー Port として定義され、TypeScript 固有の型を一切漏洩しない。

```typescript
export interface DependencyWiringPort {
  getCapabilities(): WiringCapabilities;
  analyze(input: WiringAnalysisInput): Promise<WiringAnalysisResult>;
}
```

### DTO
- **`WiringStructuralRelation`**:
  - `relationType`: `'binds_to' | 'injects'`
  - `source`: `LanguageSymbolRef`
  - `target`: `LanguageSymbolRef`
  - `compositionSite`: `{ path: string; location?: NodeLocation }`
  - `parameterName?`: `string`
  - `parameterIndex?`: `number`
  - `declaredType?`: `string`
  - `confidence`: `1.0`
  - `analyzer`: `'typescript-manual-composition'`

---

## 6. TypeScript Adapter (責務分割)

God-Class Killer Policy（150行/15行制限）を徹底し、4つの独立したモジュールに責務を分割。

1. **`TypeScriptArgumentResolver.ts`**:
   - 引数ノードが表す具象実装シンボル（直接の `new` またはローカル変数初期化子）を解決。
2. **`TypeScriptConstructorResolver.ts`**:
   - Consumer クラス宣言、コンストラクタシグネチャ、パラメータ情報（引数名、静的宣言型シンボル）を解決。
3. **`TypeScriptConstructionScanner.ts`**:
   - AST 内の `NewExpression` を走査し、`INJECTS` および `BINDS_TO` の Relation を生成。
4. **`TypeScriptWiringAdapter.ts`**:
   - `DependencyWiringPort` を実装し、セッション再利用およびファイル走査を統括。

---

## 7. Analysis Session Reuse (`TypeScriptAnalysisSession`)

Phase 7D-A の Language Intelligence と Phase 7D-B の Wiring Intelligence が同一プロセス内で連携する際、`ts.createProgram` の重複実行（数秒のコスト）を避けるため、セッション共有機構を導入。

```typescript
export interface TypeScriptAnalysisSession {
  readonly program: ts.Program;
  readonly typeChecker: ts.TypeChecker;
  readonly workspaceRoot: string;
}
```
`TypeScriptLanguageAdapter` および `TypeScriptWiringAdapter` の双方がコンストラクタでこのセッションを受領可能であり、個別のスタンドアロン実行とパイプライン統合実行の両立を実現した。

---

## 8. BINDS_TO の生成規則

以下の全条件を満たす場合にのみ生成する:
1. Consumer のコンストラクタ引数に対応するパラメータ宣言型（Interface, Abstract Class, TypeAlias）が特定できること。
2. 実際に渡された引数の具象クラス（Concrete Implementation）が特定できること。
3. 宣言型シンボルと具象クラスシンボルが異なること（具象クラス自身を要求している場合は BINDS_TO を生成せず、INJECTS のみとする）。

---

## 9. INJECTS の生成規則

以下の全条件を満たす場合に生成する:
1. `NewExpression` の呼び出し対象（Consumer）がワークスペース内のクラスであること。
2. 引数に渡された具象クラスシンボルが特定できること。

---

## 10. Multiple Binding Semantics (複数バインディングの許容)

同一 Port に対して複数の具象クラスがバインドされるケース（例: テスト用と本番用、CLI 用と Desktop 用）は矛盾ではなく正常なアーキテクチャである。
Evidence に `compositionSite`（発生ファイルのパスと行番号）が正確に記録されるため、利用コンテキストごとのバインディングを追跡可能である。

---

## 11. IR Mapping (`WiringRelationMapper`)

抽出された `WiringStructuralRelation` は、`WiringRelationMapper` を通じて `RepositoryIR` の `RepositoryEdge` にマッピングされる。

- **Edge 属性**:
  - `relationType`: `'binds_to' | 'injects'`
  - `isDerived`: `false` (明示的 Composition 事実)
  - `confidence`: `1.0`
- **Evidence 記録**:
  - `category`: `'deterministic-ast'`
  - `analyzer`: `'typescript-manual-composition'`
  - `sourcePath`: `compositionSite.path`
  - `sourceLocation`: `compositionSite.location`
  - `metadata`: `{ parameterName, parameterIndex, declaredType }`
- **未解決 Symbol 捏造防止**: ファイルノード・シンボルノードのどちらも解決できない場合は Edge を生成せず `unresolvedCount` に計上。

---

## 12. Known-path Validation (実機統合テストでの検証結果)

CodePrep 自身の実コードを用いた統合テスト（`TypeScriptWiringKnownPath.integration.test.ts`）において、以下の検証を実施し全件 PASS を確認。

### Case A: Port Binding (`BINDS_TO`)
- **Port**: `WorkspacePathResolver` (`src/features/selection/application/WorkspacePathResolver.ts`)
- **Impl**: `VSCodeWorkspacePathResolver` (`src/features/selection/infrastructure/VSCodeWorkspacePathResolver.ts`)
- **Site**: `src/commands/SelectionActionHandler.ts`
- **結果**: 正常に抽出を確認（confidence: 1.0）。

### Case B: Consumer Injection (`INJECTS`)
- **Consumer**: `ClipboardSelectionUseCase` (`src/features/selection/application/ClipboardSelectionUseCase.ts`)
- **Impl**: `VSCodeWorkspacePathResolver` (`src/features/selection/infrastructure/VSCodeWorkspacePathResolver.ts`)
- **Site**: `src/commands/SelectionActionHandler.ts`
- **結果**: 正常に抽出を確認（confidence: 1.0）。

### Case C: Unsupported / Dynamic Arguments
- プリミティブ値、オブジェクトリテラル、非 `new` 式の引数に対して false edge を捏造しないことを確認。

---

## 13. Coverage (全域走査実績)

スモークテスト（`TypeScriptWiringRepoSmoke.test.ts`）による CodePrep リポジトリ全域の解析結果:

- **Total Wiring Relations**: **138 件**
  - **`BINDS_TO`**: **51 件**
  - **`INJECTS`**: **87 件**
  - **`Unresolved`**: **0 件**

### 抽出された主要な実在配線サンプル:
1. `ClipboardSelectionUseCase` --[INJECTS]--> `VSCodeWorkspacePathResolver` (at `SelectionActionHandler.ts`)
2. `WorkspacePathResolver` --[BINDS_TO]--> `VSCodeWorkspacePathResolver` (at `SelectionActionHandler.ts`)
3. `GitWatcher` --[INJECTS]--> `GitCliClient` (at `src/extension.ts`)
4. `IGitClient` --[BINDS_TO]--> `GitCliClient` (at `src/extension.ts`)
5. `FileTreeProvider` --[INJECTS]--> `Selection` (at `src/extension.ts`)
6. `FileTreeProvider` --[INJECTS]--> `VSCodeFileSystem` (at `src/extension.ts`)
7. `IFileSystem` --[BINDS_TO]--> `VSCodeFileSystem` (at `src/extension.ts`)
8. `SelectionUseCase` --[INJECTS]--> `VSCodeFileValidator` (at `src/extension.ts`)
9. `IFileValidator` --[BINDS_TO]--> `VSCodeFileValidator` (at `src/extension.ts`)
10. `TokenUseCase` --[INJECTS]--> `VSCodeStatusBarPresenter` (at `src/extension.ts`)

---

## 14. Performance (セッション再利用の実測値)

`TypeScriptAnalysisSession` 共有下での実測値:

- **Session Setup Time (`ts.createProgram` + `TypeChecker` 1回生成)**: **3,809 ms**
- **Language Intelligence 実行時間 (全 457 ファイル)**: **3,016 ms**
- **Wiring Intelligence 実行時間 (全 457 ファイル)**: **わずか 167 ms**
- **Total Combined Analysis Time**: **6,992 ms (約 7 秒)**
- **Heap Delta**: +329.47 MB

Wiring Analysis はすでに構築済みの AST と TypeChecker を直接参照するため、わずか 167ms で全域走査が完了し、追加オーバーヘッドがほぼゼロであることが実証された。

---

## 15. Limitations (現在の制約)

1. **スコープ内単一代入に限定**:
   - 現在の変数追跡は同一関数・同一スコープ内で `const x = new Impl()` と単一初期化されたものに限定（再代入やフィールド渡しは非対応）。
2. **ファクトリ関数戻り値の追跡見送り**:
   - `createX()` などの関数経由の生成物は、現時点では戻り値の具象追跡を行わない（DEFER）。
3. **動的 DI コンテナ**:
   - TSyringe や Inversify などの文字列トークンによる実行時コンテナ解決は静的解析の対象外。

---

## 16. Next Phase Input (次フェーズへの提言)

Phase 7D-A（Language: `REFERENCES`, `IMPLEMENTS`, `EXTENDS` 計 3,938件）と Phase 7D-B（Wiring: `BINDS_TO`, `INJECTS` 計 138件）により、リポジトリの主要な静的構造が Repository IR に完全統合された。

次工程の選択肢として以下が挙げられる:
- **Phase 7E: Persistence (Repository IR → SQLite Knowledge Store)**:
  - 今回構築した高精度な 4,000 件超の構造グラフを SQLite に永続化し、キャッシュおよび Task Context での高速クエリ検証に進む。
- **追加 Analyzer (TESTS, USES_CONFIG, READS/WRITES)**:
  - テスト対応や設定ファイル利用の Edge を追加。
- **CALLS Lazy Query**:
  - タスク解決時にオンデマンドで Call Hierarchy を掘り下げ、`BINDS_TO` と合成して `MAY_DISPATCH_TO` を導出する。

現時点で Node / Edge の構造基盤が十分高精度に揃ったため、**Phase 7E (Persistence)** へ進み永続化と Task Query の実証を開始することを推奨する。
