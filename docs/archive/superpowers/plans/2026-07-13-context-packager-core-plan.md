# Context Packager Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit search recipes, pack modes, token budgeting, and a self-scrolling Explorer to CodePrep Desktop.

**Architecture:** Domain types model recipes, pack modes, and deterministic budgets. Application use cases resolve recipes through ports; Electron adapts Git, clipboard, and project files; the renderer selects a recipe and sends one typed request over the existing allowlisted IPC boundary.

**Tech Stack:** TypeScript, Electron, React, Vitest, esbuild.

---

## File Structure

- Create: `src/features/desktop-core/domain/SearchRecipe.ts` — validated recipe union.
- Create: `src/features/desktop-core/domain/ContextBudget.ts` — byte/token estimates and limit status.
- Create: `src/features/desktop-core/domain/PackMode.ts` — full, skeleton, tree, diff modes.
- Create: `src/features/desktop-core/application/DiscoverFilesUseCase.ts` — recipe orchestration.
- Modify: `src/features/desktop-core/application/ports.ts` — recipe-specific ports.
- Create: `src/features/desktop-node/ClipboardPathReader.ts`, `GitHistoryReader.ts` — impure adapters.
- Modify: `apps/desktop/DesktopApi.ts`, `IpcAllowlist.ts`, `DesktopHandlers.ts` — one typed discovery IPC endpoint.
- Modify: `apps/desktop/renderer/hooks/useDesktopWorkspace.ts`, `types.ts` — recipe, mode, budget state.
- Modify: `apps/desktop/renderer/components/SearchPanel.tsx`, `CandidateTree.tsx`, `OutputPanel.tsx`, `styles/desktop.css` — recipe controls and self-scrolling Explorer.
- Modify: `src/features/desktop-core/application/BuildDesktopContextUseCase.ts`, `DesktopContextFormatter.ts` — pack-mode output.

### Task 1: Define the pure Context Pack domain

**Files:**
- Create: `src/features/desktop-core/domain/SearchRecipe.ts`
- Create: `src/features/desktop-core/domain/ContextBudget.ts`
- Create: `src/features/desktop-core/domain/PackMode.ts`
- Test: matching `__tests__/*.test.ts`

- [ ] **Step 1: Write failing domain tests**

```ts
expect(createSearchRecipe('extension', '.ts,.tsx')).toEqual({
  kind: 'extension', extensions: ['.ts', '.tsx'],
});
expect(evaluateBudget(400, 100)).toMatchObject({ estimatedTokens: 100, withinLimit: true });
expect(evaluateBudget(404, 100).withinLimit).toBe(false);
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npx vitest src/features/desktop-core/domain/__tests__ --run`

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Implement immutable, validated types**

```ts
export type SearchRecipe =
  | Readonly<{ kind: 'text'; query: string }>
  | Readonly<{ kind: 'gitDiff' | 'clipboardPaths' }>
  | Readonly<{ kind: 'gitCommit'; ref: string }>
  | Readonly<{ kind: 'extension'; extensions: readonly string[] }>
  | Readonly<{ kind: 'directory'; path: string }>;

export type PackMode = 'full' | 'skeleton' | 'directoryTree' | 'diffOnly';

export const evaluateBudget = (bytes: number, limit: number) => ({
  bytes, estimatedTokens: Math.ceil(bytes / 4), limit,
  withinLimit: Math.ceil(bytes / 4) <= limit,
});
```

Keep validation helpers and union branches under the project size limits.

- [ ] **Step 4: Verify and commit**

Run: `npx vitest src/features/desktop-core/domain/__tests__ --run`

Expected: PASS for valid and invalid recipes and exact budget boundaries.

```bash
git add src/features/desktop-core/domain
git commit -m "feat: add context pack domain"
```

### Task 2: Add recipe discovery ports and use case

**Files:**
- Modify: `src/features/desktop-core/application/ports.ts`
- Create: `src/features/desktop-core/application/DiscoverFilesUseCase.ts`
- Test: `src/features/desktop-core/application/__tests__/DiscoverFilesUseCase.test.ts`

- [ ] **Step 1: Write failing use-case tests**

```ts
it('limits clipboard paths to registered project roots', async () => {
  const result = await useCase.discover({ kind: 'clipboardPaths' }, ['p1']);
  expect(result.candidates.map(item => item.relativePath)).toEqual(['src/auth.ts']);
  expect(result.warnings).toContainEqual(expect.objectContaining({ kind: 'outsideProject' }));
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npx vitest src/features/desktop-core/application/__tests__/DiscoverFilesUseCase.test.ts --run`

Expected: FAIL because discovery does not exist.

- [ ] **Step 3: Implement one route per recipe**

Add `ClipboardPort`, `ProjectFilePort`, and `GitHistoryPort`. The use case dispatches recipe kinds with guard clauses, returns candidates with reasons, and preserves warnings. Reuse the existing ripgrep and Git metadata ports for text and diff discovery.

- [ ] **Step 4: Verify and commit**

Run: `npx vitest src/features/desktop-core/application/__tests__/DiscoverFilesUseCase.test.ts --run`

Expected: PASS for text, diff, commit, clipboard, extension, directory, invalid input, and missing Git.

```bash
git add src/features/desktop-core/application
git commit -m "feat: discover context files by recipe"
```

### Task 3: Implement Node and Electron recipe adapters

**Files:**
- Create: `src/features/desktop-node/ClipboardPathReader.ts`
- Create: `src/features/desktop-node/GitHistoryReader.ts`
- Modify: `src/features/desktop-node/ProjectFileTree.ts`
- Modify: `apps/desktop/DesktopApi.ts`, `IpcAllowlist.ts`, `DesktopHandlers.ts`
- Test: adapter and allowlist tests

- [ ] **Step 1: Write failing adapter tests**

```ts
expect(extractPaths('C:/repo/src/a.ts\nC:/other/x.ts', roots)).toEqual([
  { projectId: 'p1', relativePath: 'src/a.ts' },
]);
expect(parseCommitPaths('src/a.ts\nREADME.md\n')).toEqual(['src/a.ts', 'README.md']);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest src/features/desktop-node/__tests__ apps/desktop/IpcAllowlist.test.ts --run`

Expected: FAIL for missing adapters and IPC method.

- [ ] **Step 3: Implement adapters and one IPC request**

Expose `discoverFiles(input)` only. The main handler instantiates ports, validates unknown input, and returns typed candidates and warnings. Clipboard paths outside every registered root are never returned as candidates. Project traversal retains exclusion directories.

- [ ] **Step 4: Verify and commit**

Run: `npx vitest src/features/desktop-node/__tests__ apps/desktop --run`

Expected: PASS for parsing, path containment, missing Git, allowlist rejection, and malformed recipe payloads.

```bash
git add src/features/desktop-node apps/desktop
git commit -m "feat: add desktop search recipe adapters"
```

### Task 4: Support pack modes and budget-aware context output

**Files:**
- Modify: `src/features/desktop-core/application/BuildDesktopContextUseCase.ts`
- Modify: `src/features/desktop-node/DesktopContextFormatter.ts`
- Test: `src/features/desktop-core/application/__tests__/BuildDesktopContextUseCase.test.ts`

- [ ] **Step 1: Write failing output tests**

```ts
expect(result.preview).toContain('src/auth.ts');
expect(treeOnly.preview).not.toContain('export const token');
expect(diffOnly.warnings).toContainEqual(expect.objectContaining({ kind: 'gitFailure' }));
expect(overBudget.blocked).toBe(true);
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npx vitest src/features/desktop-core/application/__tests__/BuildDesktopContextUseCase.test.ts --run`

Expected: FAIL because mode and budget input are absent.

- [ ] **Step 3: Implement full, skeleton, tree, and diff output**

Extend the build input with `packMode` and `tokenLimit`. Reuse `OutputEngine` with `skeletonMode: true` for skeleton. Build directory-only text from normalized selected paths. Diff-only uses the Git port. Return budget metadata and block output above the explicit limit.

- [ ] **Step 4: Verify and commit**

Run: `npx vitest src/features/desktop-core/application/__tests__/BuildDesktopContextUseCase.test.ts --run`

Expected: PASS for every mode, serializer, empty selection, unreadable file, and budget boundary.

```bash
git add src/features/desktop-core src/features/desktop-node
git commit -m "feat: add context pack modes and budget"
```

### Task 5: Build recipe, budget, and scrollable Explorer UI

**Files:**
- Modify: `apps/desktop/renderer/hooks/useDesktopWorkspace.ts`, `types.ts`
- Modify: `apps/desktop/renderer/components/SearchPanel.tsx`, `CandidateTree.tsx`, `OutputPanel.tsx`
- Modify: `apps/desktop/renderer/styles/desktop.css`
- Test: `apps/desktop/renderer/App.interaction.test.tsx`

- [ ] **Step 1: Write failing renderer tests**

```ts
expect(screen.getByLabelText('Search recipe')).toHaveValue('text');
await user.selectOptions(screen.getByLabelText('Search recipe'), 'extension');
expect(screen.getByLabelText('Extensions')).toBeVisible();
expect(screen.getByText('Estimated tokens')).toBeVisible();
expect(treeBody.className).toContain('tree-scroll');
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npx vitest apps/desktop/renderer --run`

Expected: FAIL because recipe, budget, and scroll controls do not exist.

- [ ] **Step 3: Implement controlled UI**

Use a recipe selector with mode-specific input. Keep Search controls outside `.tree-scroll`; make that element flex-grow with `overflow: auto`. Add pack-mode selector, token limit input, and budget status to OutputPanel. Disable Generate only when the budget is over its explicit limit, and show the reason next to the button.

- [ ] **Step 4: Verify and commit**

Run: `npx vitest apps/desktop/renderer --run`

Expected: PASS for recipe switch, validation, local error, independent tree scroll, budget warning, mode payload, and copy flow.

```bash
git add apps/desktop/renderer
git commit -m "feat: add context packer workspace controls"
```

### Task 6: Full verification

- [ ] **Step 1: Run checks**

Run: `npm run check-types && npm run lint && npm run desktop:test && npm run desktop:build`

Expected: all commands exit 0.

- [ ] **Step 2: Manual Electron verification**

Run: `npm run desktop:dev`

Expected: add a project; expand only the Explorer tree; discover files through every recipe; change pack modes; observe budget block; generate and copy Markdown, XML, and JSON output.

- [ ] **Step 3: Commit final integration**

```bash
git add apps src/features
git commit -m "feat: deliver context packager core"
```

