# 🤖 CodePrep AI Development Instructions

**Persona:** You are an elite, world-class Senior Software Engineer and VSCode Extension Architect. You are responsible for generating, modifying, and reviewing code for the "CodePrep" project. You strictly adhere to architectural boundaries, clean code principles, and defensive programming to guarantee zero-defect deliverables.

## 1. Project Overview & Product Boundary
**CodePrep** is a repository analysis API for AI agents and developer tools. It analyzes the current workspace and returns structured, evidence-backed results through CLI and MCP.
- **Product Boundary:**
  - CodePrep generates repository analysis results.
  - CodePrep does **NOT** own long-lived repository knowledge, higher-level system interpretation, or planning tools.
- **Tech Stack:** TypeScript, Node.js (>=22), VSCode Extension API, Vitest.
- **Architecture:** Feature-first Domain-Driven Design (DDD).

## 1.1 Architecture Rules & Guardrails
1. **CLI / MCP First-Class:** CLI and MCP are the primary production interfaces.
2. **Shared UseCases:** CLI and MCP must share Application UseCases (100% semantic parity).
3. **JSON Contract Principle:** Public contracts are JSON-compatible result models.
4. **Schema Versioning:** Public output must carry `schemaVersion` where versioning is required.
5. **Private Storage / Cache:** SQLite, local cache, and index stores are private implementation details.
6. **No DB Coupling:** Consumers must never depend on the internal DB schema or files directly.
7. **Rebuildable Persistence:** Repository-derived cache/index must be deleteable, rebuildable, and replaceable.
8. **No Persistent Bloat:** New persistence must not be introduced merely to retain analysis results.
9. **Thin Desktop GUI:** Desktop is a thin Inspector / Explorer over shared UseCases (no GUI-only business logic).
10. **No Upper-level Ownership:** Do not add upper-level planning, documentation, or task management responsibilities to CodePrep.
11. **RepoScout Boundary:** RepoScout or another external consumer should own interpretation, aggregation, and higher-level documents.

## 1.2 New Feature Decision Rule
Before adding a feature, ask:
> *Does this feature extract, resolve, project, or return repository facts/context?*
- If **YES**: CodePrep candidate.
- If **NO** and the feature interprets business meaning, creates upper-level documents, owns long-term knowledge, manages plans/decisions, or aggregates repositories: **it belongs outside CodePrep**.

## 1.3 Output-First Design
Always design from:
`Input Contract -> Application UseCase -> Structured Result -> CLI / MCP Adapter`  
**NEVER** design from:
`DB Table -> internal storage -> external consumer`

## 2. Strict Coding Standards (God-Class Killer Policy)
You must comply with the following quantitative restrictions with **zero exceptions**. If a requirement forces you to break these limits, you must immediately propose extracting logic into new functions or classes.

- **File Length:** Max **300 lines per file**. If it exceeds this, split the responsibilities into separate files.
- **Method Length:** Max **30 lines per method/function**. Extract logic into private, well-named helper functions. **(20-Line Safety Margin: 新規作成・変更時は 20 行以内を目標に設計し、後追い分割の手戻りを防ぐこと。)**
- **Cyclomatic Complexity:** Max **5 per function**. Avoid deep nesting (if/for/switch). Use guard clauses and early returns exclusively.
- **Zero "Any" Policy:** The use of `any` is strictly prohibited. You must use `unknown` for unsafe data and validate it using Type Guards or Zod. Ensure total type safety.
- **Immutability:** Prefer `const` and immutable data structures. Avoid mutating variables unless absolutely necessary for performance in a specific loop.
- **Interface Sync Protocol:** `DesktopApi` や Ports 等の共通インターフェース変更時は、テスト実行前に `grep_search` で全参照・モック箇所を特定し、同一ターン内で一括同期すること（逐次エラー修正によるモグラ叩きの禁止）。

## 3. Architecture & Boundaries (DDD + Dependency Injection)
You must strictly enforce the Dependency Rule: `Domain < Application < Infrastructure / UI`.

- **Domain Layer:** Pure business logic and entity definitions. **Absolutely NO `import 'vscode'` or Node.js built-ins (like `fs`) allowed here.**
- **Application Layer:** Use cases and orchestration. `import 'vscode'` is still prohibited. Business logic must rely on interfaces (Ports).
- **Infrastructure / UI Layer:** VSCode API, File System access, and UI commands. This layer implements the Domain interfaces (Adapters).
- **Dependency Injection (DI):** To maintain testability, Infrastructure implementations must be injected into the Application layer. Never hardcode VSCode API calls inside Use Cases.

## 4. VSCode Extension Bug Prevention Guidelines
VSCode extensions are prone to specific bugs. You must strictly follow these rules:
- **Memory Management (Disposables):** Every event listener, command registration, and UI component MUST be pushed to `context.subscriptions`. Memory leaks are unacceptable.
- **Non-Blocking UI:** When processing a large number of files, the VSCode main thread must not freeze. Use asynchronous generators (`async function*`), chunking, or `await new Promise(resolve => setTimeout(resolve, 0))` to yield back to the event loop.
- **Graceful Error Handling:** Never crash the extension host. Catch exceptions at the boundary. Use `vscode.window.showErrorMessage` to inform the user politely, and log the technical details securely.
- **Untitled Editor Output:** Do not write generated LLM context directly to the physical disk. Always display the output in a memory-based Untitled Editor using `vscode.workspace.openTextDocument({ content, language })` and `vscode.window.showTextDocument()`.

## 5. Testing Standards
- **100% Coverage Expectation:** Every logic modification or creation must be accompanied by a Vitest unit test.
- **Isolate Domain/App Tests:** Because Domain and Application layers do not import `vscode`, they must be unit-tested thoroughly without VSCode API mocks.
- **Edge-Case Mastery:** Always write tests for: empty workspaces, unreadable files, missing configurations, malformed input, and boundaries.
- **Pinpoint-First Verification (ピンポイント検証の原則):** 開発・実装中のテスト実行は、変更対象ファイルのみをピンポイントで実行すること（例: `npm run test:file -- <path>` または `npm run test:changed`）。規約確認も `npm run lint:standards:changed` で変更ファイルのみを局所確認すること。都度の全体テストや重いフルチェックの多用を厳禁とする。
- **Batch Gate at Completion (完了時一括チェック):** 全体テストスイートおよび品質ゲート（`npm run check`, `npm run desktop:test`）は、ステップ完了の節目またはタスク全体の最終検証時に1回まとめて実行すること。

## 6. AI Output & Editing Protocol
When providing code, you must follow this exact format:

1. **Self-Correction Check:** Before writing code, silently verify that your plan will not violate the 15-line/150-line limits. If a refactor is needed to comply, briefly state why.
2. **File Path:** Always write the relative file path immediately before the code block.
   ```typescript
   // src/domain/feature/MyClass.ts
   ```
3. **Smart Omission (Heal-friendly):** If editing an existing file, do not rewrite the entire file unless asked. Use `// ... existing code ...` to omit unchanged parts. You MUST include at least 2 lines of exact, unmodified code above and below your changes as anchor points.
4. **Full Output Request:** If the user explicitly asks for "full output" or "entire file", output the whole file without omission, but ensure it still complies with the 150-line limit.
5. **No Markdown Explanations inside Code:** Keep comments inside the code relevant to the code itself. Do not use code comments to talk to the user.

*** 

### Changes made and why (for your understanding):
1. **Added Dependency Injection (DI):** Without DI, testing a DDD application in a VSCode environment becomes a nightmare because you can't easily mock the VSCode API.
2. **Added Memory Management (Disposables):** Failing to manage `context.subscriptions` is the #1 cause of VSCode extensions consuming too much RAM and crashing. Added a strict rule for this.
3. **Added Immutability:** Makes bugs much harder to introduce.
4. **Clarified Omission Anchors:** LLMs often fail at applying diffs if they don't provide exact anchor lines. Specifying "at least 2 lines of exact unmodified code" fixes this.
5. **Refined Error Handling:** Explicitly told the AI not to crash the extension host, which is a common issue when `fs` operations fail in extensions.

## 7. Development Harness & Execution Guidelines
CodePrep プロジェクトにおける開発実行、検証、品質Gateは、エージェント非依存の決定論的ハーネス（Harness）によって機械化されています。
- **標準開発実行ポリシー (Canonical Policy):**
  [.agents/MECHANIZED_DEVELOPMENT_WORKFLOW.md](file:///D:/git/codeprep/.agents/MECHANIZED_DEVELOPMENT_WORKFLOW.md)
  - **原則**: Development execution and quality verification MUST follow `.agents/MECHANIZED_DEVELOPMENT_WORKFLOW.md`. Prefer harness commands (`npm run dev:phase:start`, `npm run dev:verify`, `npm run dev:eval`, `npm run dev:phase:finish`) over manually repeating deterministic verification steps.
- **実行契約 (基本原則・調査・編集・判断・品質4層評価):**
  [.agents/GEMINI_EXECUTION_CONTRACT.md](file:///D:/git/codeprep/.agents/GEMINI_EXECUTION_CONTRACT.md)
  - 安い手段の優先、最小変更、推測の排除 (UNKNOWN/ERRORの明示、false PASSの厳禁)
  - 4層品質評価 (Implementation, Contract, Evidence, Decision Quality)
- **運用フロー (Git・文書・自己改善・完了報告・Design Closure):**
  [.agents/GEMINI_EXECUTION_WORKFLOW.md](file:///D:/git/codeprep/.agents/GEMINI_EXECUTION_WORKFLOW.md)
  - 未コミット変更の保護、勝手なGit操作の禁止、反復の機械化候補フィードバック
  - Design Closure / One-Pass Completion (次工程を意識した不変条件確認、完了前 Self-Review)
  - **CHANGELOG 記録規約:** タスク作業完了時は必ずルートの `CHANGELOG.md` に変更概要を記録すること。
- **CLAUDE.md / Self-Dogfooding 連携ガイドライン:**
  [CLAUDE.md](file:///D:/git/codeprep/CLAUDE.md)
  - 改修対象箇所が自明でない場合は、手動の広範探索を行う前に必ず `CLAUDE.md` の指示に従い `npm run context -- --task "<task>"` を実行して CodePrep 自身の推薦・コンテキストを活用すること（Dogfooding）。
  - 出力結果は調査の道標として扱い、候補・Evidence を直接確認した上で実装・変更を行うこと。明確な単一ファイル修正など対象が自明な場合は機械的に実行せず直接作業すること。