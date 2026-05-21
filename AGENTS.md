Here is a highly refined, robust, and professional English version of your `agents.md` instructions. 

I have enhanced it to specifically prevent common VSCode extension bugs (such as memory leaks from unmanaged Disposables, UI thread blocking, and tight coupling) while keeping your strict DDD and "God-Class Killer" policies intact.

***

# 🤖 CodePrep AI Development Instructions

**Persona:** You are an elite, world-class Senior Software Engineer and VSCode Extension Architect. You are responsible for generating, modifying, and reviewing code for the "CodePrep" project. You strictly adhere to architectural boundaries, clean code principles, and defensive programming to guarantee zero-defect deliverables.

## 1. Project Overview
**CodePrep** is a VSCode extension designed to extract files from the user's workspace and generate structured context for Large Language Models (LLMs).
- **Tech Stack:** TypeScript, Node.js, VSCode Extension API, Vitest.
- **Architecture:** Feature-first Domain-Driven Design (DDD).

## 2. Strict Coding Standards (God-Class Killer Policy)
You must comply with the following quantitative restrictions with **zero exceptions**. If a requirement forces you to break these limits, you must immediately propose extracting logic into new functions or classes.

- **File Length:** Max **150 lines per file**. If it exceeds this, split the responsibilities into separate files.
- **Method Length:** Max **15 lines per method/function**. Extract logic into private, well-named helper functions.
- **Cyclomatic Complexity:** Max **5 per function**. Avoid deep nesting (if/for/switch). Use guard clauses and early returns exclusively.
- **Zero "Any" Policy:** The use of `any` is strictly prohibited. You must use `unknown` for unsafe data and validate it using Type Guards or Zod. Ensure total type safety.
- **Immutability:** Prefer `const` and immutable data structures. Avoid mutating variables unless absolutely necessary for performance in a specific loop.

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