# Context Recommendation v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add explainable, user-controlled related-document recommendations to CodePrep Desktop while preserving the existing token-budget and output flows.

**Architecture:** Keep recommendation contracts, candidate merging, and deterministic scoring in `desktop-core`. Keep Markdown, file listing, Git, and DocGraph parsing in `desktop-node`. Expose one typed recommendation request through the existing Electron IPC boundary, then let the renderer display unselected suggestions and their reasons. Recommendation failures are warnings and never replace existing candidates.

**Tech Stack:** TypeScript, React, Electron, Vitest, esbuild.

**Constraints:** Preserve the existing 150-line file, 15-line function, no-`any`, and layer-boundary rules in `AGENTS.md`. Do not introduce a vector database, embeddings, network LLM calls, DocIndexer implementation, or automatic recommendation selection.

---

## File Map

- Create `src/features/desktop-core/domain/Recommendation.ts` for source types, reasons, settings, and validated recommendation records.
- Create `src/features/desktop-core/application/MergeRecommendationsUseCase.ts` for candidate-key normalization, duplicate merging, deterministic ordering, and score aggregation.
- Modify `src/features/desktop-core/application/ports.ts` to define recommendation inputs and source ports.
- Modify `src/features/desktop-core/application/DiscoverFilesUseCase.ts` to request enabled sources and preserve base candidates on partial failure.
- Create `src/features/desktop-node/MarkdownRecommendationClient.ts` for relative-link and filename/heading extraction.
- Create `src/features/desktop-node/GitCoChangeClient.ts` for bounded Git co-change results.
- Modify `src/features/desktop-node/DocGraphClient.ts` to replace unvalidated JSON parsing with a type guard and finite-score filtering.
- Modify `apps/desktop/DesktopRequestParser.ts`, `DesktopApi.ts`, `IpcAllowlist.ts`, and `DesktopHandlers.ts` for the typed recommendation request.
- Modify `apps/desktop/renderer/types.ts`, `hooks/useDesktopWorkspace.ts`, and `components/SearchPanel.tsx` for source toggles and recommendation state.
- Modify `apps/desktop/renderer/components/CandidateTree.tsx` and `CandidateTreeNode.tsx` for recommendation reason display and unselected suggested rows.
- Add focused tests beside each domain, adapter, IPC, hook, and component change.

---

## Task 1: Define Recommendation Contracts

**Files:**
- Create: `src/features/desktop-core/domain/Recommendation.ts`
- Modify: `src/features/desktop-core/application/ports.ts`
- Test: `src/features/desktop-core/domain/__tests__/Recommendation.test.ts`

- [ ] **Step 1: Write failing domain tests**

Add tests for valid source settings, unknown source rejection, finite score normalization, and immutable recommendation records:

```ts
it('accepts the four fallback sources and enables them by default', () => {
  expect(defaultRecommendationSettings()).toEqual({
    markdownLink: true,
    nameHeading: true,
    gitCoChange: true,
    directoryProximity: true,
  });
});

it('rejects non-finite or negative scores', () => {
  expect(createRecommendation({
    projectId: 'p1', relativePath: 'docs/auth.md', source: 'markdownLink',
    score: Number.NaN, detail: 'link from docs/index.md',
  })).toBeUndefined();
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```text
npx vitest src/features/desktop-core/domain/__tests__/Recommendation.test.ts --run
```

Expected: FAIL because the recommendation domain module does not exist.

- [ ] **Step 3: Implement the validated contracts**

Define `RecommendationSource`, `RecommendationReason`, `RecommendationSettings`, `RecommendationRecord`, `defaultRecommendationSettings`, `isRecommendationSource`, and `createRecommendation`. Use readonly types, finite positive scores, normalized forward-slash paths, and no Node/Electron imports. Add recommendation-related ports to `ports.ts` without changing existing port contracts unnecessarily.

- [ ] **Step 4: Run the focused test**

Run the same Vitest command. Expected: PASS.

- [ ] **Step 5: Run type checking**

Run:

```text
npm run check-types
```

Expected: exit code 0.

---

## Task 2: Merge and Score Recommendations

**Files:**
- Create: `src/features/desktop-core/application/MergeRecommendationsUseCase.ts`
- Test: `src/features/desktop-core/application/__tests__/MergeRecommendationsUseCase.test.ts`

- [ ] **Step 1: Write failing merge tests**

Cover duplicate candidate keys, multiple reasons, stable ordering, base-candidate preservation, and unselected recommendation state:

```ts
it('merges duplicate recommendations without duplicating candidates', () => {
  const result = mergeRecommendations(baseCandidates, [
    recommendation('docs/auth.md', 'markdownLink', 0.8),
    recommendation('docs\\auth.md', 'gitCoChange', 0.6),
  ]);
  expect(result).toHaveLength(1);
  expect(result[0].reasons).toEqual(expect.arrayContaining(['markdownLink', 'gitCoChange']));
  expect(result[0].selected).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```text
npx vitest src/features/desktop-core/application/__tests__/MergeRecommendationsUseCase.test.ts --run
```

Expected: FAIL because the merge function does not exist.

- [ ] **Step 3: Implement candidate merge behavior**

Use the existing `candidateKey(projectId, relativePath)` helper. Merge by normalized key, retain the existing candidate object when present, append unique recommendation reasons, and calculate a deterministic aggregate score without mutating inputs. Keep recommendations unselected. Sort by aggregate score descending and normalized key ascending as the tie-breaker.

- [ ] **Step 4: Add failure-preservation tests**

Verify that an empty or failed source result returns the original candidates and does not clear `selectedKeys`, existing reasons, or existing scores.

- [ ] **Step 5: Run domain/application tests and type checking**

Run:

```text
npx vitest src/features/desktop-core/domain/__tests__ src/features/desktop-core/application/__tests__/MergeRecommendationsUseCase.test.ts --run
npm run check-types
```

Expected: all focused tests pass and type checking exits 0.

---

## Task 3: Implement Markdown and Git Recommendation Adapters

**Files:**
- Create: `src/features/desktop-node/MarkdownRecommendationClient.ts`
- Create: `src/features/desktop-node/GitCoChangeClient.ts`
- Test: `src/features/desktop-node/__tests__/MarkdownRecommendationClient.test.ts`
- Test: `src/features/desktop-node/__tests__/GitCoChangeClient.test.ts`

- [ ] **Step 1: Write Markdown parser tests**

Cover relative Markdown links, Wiki links, URL exclusion, root escape prevention, missing targets, headings, filename matching, and Windows separators:

```ts
it('returns only existing project-local Markdown targets', () => {
  const result = extractMarkdownRecommendations(
    'See [auth](../docs/auth.md) and [external](https://example.com).',
    'docs/design.md',
    ['docs/auth.md', 'docs/design.md']
  );
  expect(result.map(item => item.relativePath)).toEqual(['docs/auth.md']);
});
```

- [ ] **Step 2: Write Git parser tests**

Use fixture Git output and verify co-change counts, document filtering, malformed lines, and bounded history arguments. Verify command arguments are passed as an argv array and no shell interpolation is used.

- [ ] **Step 3: Run tests and verify failure**

Run:

```text
npx vitest src/features/desktop-node/__tests__/MarkdownRecommendationClient.test.ts src/features/desktop-node/__tests__/GitCoChangeClient.test.ts --run
```

Expected: FAIL because the adapters do not exist.

- [ ] **Step 4: Implement Markdown extraction**

Keep parsing deterministic and dependency-free. Resolve only project-relative links against the source document directory, normalize separators, reject paths outside the project, and return typed recommendation records. Use heading and filename token normalization with an explicit minimum token length and a small stop-word set.

- [ ] **Step 5: Implement Git co-change extraction**

Reuse the existing process-runner port. Request a bounded `git log` format, parse commit file groups, count co-change occurrences for the selected document, and return warnings rather than throwing for missing Git or non-zero exit codes.

- [ ] **Step 6: Run adapter tests and type checking**

Run:

```text
npx vitest src/features/desktop-node/__tests__/MarkdownRecommendationClient.test.ts src/features/desktop-node/__tests__/GitCoChangeClient.test.ts --run
npm run check-types
```

Expected: all focused tests pass and type checking exits 0.

---

## Task 4: Harden DocGraph and Add Application Orchestration

**Files:**
- Modify: `src/features/desktop-node/DocGraphClient.ts`
- Modify: `src/features/desktop-node/__tests__/DocGraphClient.test.ts`
- Modify: `src/features/desktop-core/application/DiscoverFilesUseCase.ts`
- Modify: `src/features/desktop-core/application/__tests__/DiscoverFilesUseCase.test.ts`

- [ ] **Step 1: Add malformed-response tests**

Test missing `related`, non-array `related`, entries without string paths, non-finite confidence, malformed JSON, and command failure. Confirm all invalid records are ignored and the client never throws.

- [ ] **Step 2: Implement a type guard for DocGraph JSON**

Replace `any` with `unknown` and a narrow validator. Accept only project-relative string paths, non-empty reasons, and finite confidence values in the supported range. Preserve the existing custom command and local binary resolution behavior.

- [ ] **Step 3: Add application orchestration tests**

Verify enabled source settings invoke only the selected ports, recommendation candidates are appended without auto-selection, duplicate keys merge, and a source failure leaves base candidates intact while returning a warning.

- [ ] **Step 4: Implement source orchestration**

Add a typed recommendation input to `DiscoverFilesUseCase`. Run enabled sources per selected candidate, merge results through `MergeRecommendationsUseCase`, and preserve current text, extension, directory, Git diff, clipboard, commit, and DocGraph recipe behavior. Keep source failures isolated and deterministic.

- [ ] **Step 5: Run focused application and adapter tests**

Run:

```text
npx vitest src/features/desktop-core/application/__tests__/DiscoverFilesUseCase.test.ts src/features/desktop-node/__tests__/DocGraphClient.test.ts --run
npm run check-types
```

Expected: all tests pass and type checking exits 0.

---

## Task 5: Add Typed IPC and Renderer Source Controls

**Files:**
- Modify: `apps/desktop/DesktopApi.ts`
- Modify: `apps/desktop/DesktopRequestParser.ts`
- Modify: `apps/desktop/IpcAllowlist.ts`
- Modify: `apps/desktop/DesktopHandlers.ts`
- Modify: `apps/desktop/renderer/types.ts`
- Modify: `apps/desktop/renderer/hooks/useDesktopWorkspace.ts`
- Modify: `apps/desktop/renderer/components/SearchPanel.tsx`
- Test: `apps/desktop/DesktopRequestParser.test.ts`
- Test: `apps/desktop/IpcAllowlist.test.ts`
- Test: `apps/desktop/renderer/hooks/useDesktopWorkspace.test.tsx`

- [ ] **Step 1: Add request parser tests**

Verify valid source settings are accepted, unknown sources and non-boolean values are rejected, and absent settings receive the four-source defaults.

- [ ] **Step 2: Add API and IPC contracts**

Add one typed request shape that carries the selected project IDs, source file keys, and enabled recommendation settings. Register only the existing known recommendation request channel or extend the current `discoverFiles` payload; do not expose arbitrary command names. Keep the preload surface unchanged unless the typed request requires a new method.

- [ ] **Step 3: Add hook state tests**

Verify toggling one source updates the Search panel state, triggers recommendation discovery with the selected settings, preserves existing selected keys, and leaves recommendation candidates unchecked.

- [ ] **Step 4: Implement renderer controls**

Add accessible checkboxes or a grouped toggle control to `SearchPanel.tsx`. Label every source, provide a short reason-oriented description, and pass the state through the existing workspace analysis flow. Keep source toggles local to Search state and do not add automatic selection.

- [ ] **Step 5: Run IPC and hook tests**

Run:

```text
npx vitest apps/desktop/DesktopRequestParser.test.ts apps/desktop/IpcAllowlist.test.ts apps/desktop/renderer/hooks/useDesktopWorkspace.test.tsx --run
npm run check-types
```

Expected: all focused tests pass and type checking exits 0.

---

## Task 6: Display Reasons and Preserve Budget Semantics

**Files:**
- Modify: `apps/desktop/renderer/components/CandidateTree.tsx`
- Modify: `apps/desktop/renderer/components/CandidateTreeNode.tsx`
- Modify: `apps/desktop/renderer/components/SearchPanel.tsx`
- Modify: `apps/desktop/renderer/styles/desktop-tree.css`
- Modify: `apps/desktop/renderer/styles/desktop-base.css`
- Test: `apps/desktop/renderer/components/CandidateTree.test.tsx`
- Test: `apps/desktop/renderer/App.interaction.test.tsx`

- [ ] **Step 1: Add component tests**

Verify recommendation rows expose their source and score, their checkbox starts unchecked, selecting one updates the token summary, and duplicate reasons are rendered without duplicate rows. Verify keyboard-accessible source toggles and controls.

- [ ] **Step 2: Implement recommendation presentation**

Render a compact recommendation badge/reason list using the existing tree style. Use accessible labels that identify the candidate path and action. Keep the token budget calculation based only on `selectedKeys`; do not alter the existing `selectedTokenTotal` contract.

- [ ] **Step 3: Add failure-state tests**

Verify the base candidate list remains visible when recommendation discovery returns warnings or no results, and the Search panel shows the warning through the existing inline notice path.

- [ ] **Step 4: Run renderer tests**

Run:

```text
npx vitest apps/desktop/renderer --run
```

Expected: all renderer tests pass, including existing token-budget and sort regressions.

- [ ] **Step 5: Run type checking and lint**

Run:

```text
npm run check-types
npm run lint
```

Expected: type checking exits 0 and lint has no errors. Existing warnings may be reported but must not increase.

---

## Task 7: Full Verification and Documentation

**Files:**
- Modify: `docs/superpowers/status/electron-desktop-workspace-progress.md`
- Modify: `docs/superpowers/plans/2026-07-13-electron-desktop-remaining-todo.md`
- Modify: `README.md` or the Desktop guide that documents external tools, if the final behavior requires user setup instructions.

- [ ] **Step 1: Run the complete allowed verification set**

Run through VS Code tasks or equivalent:

```text
npm run check-types
npm run lint
npm run desktop:test
npm run desktop:build
npm run compile
```

Expected: all commands exit 0. Do not use a custom PowerShell `-Command` argument; use the standard VS Code PowerShell profile or the existing task definitions.

- [ ] **Step 2: Run manual Electron smoke checks**

Start the existing Desktop development command and verify:

- Add a project and select a Markdown source file.
- Toggle each recommendation source independently.
- Confirm recommendations appear unchecked with visible source/reason.
- Select a recommendation and confirm token totals increase.
- Trigger a missing DocGraph/Git condition and confirm base candidates remain.
- Generate output and confirm only selected candidates are included.

- [ ] **Step 3: Update status documentation**

Mark only verified tasks complete in the progress and remaining-TODO documents. Record any environment-only Electron launch blocker separately from code failures. Keep the design and implementation plan paths linked.

- [ ] **Step 4: Run a final diff and standards check**

Run:

```text
git diff --check
npm run lint:standards
```

Expected: no whitespace errors and standards validation exits 0.

---

## Requirement Mapping

| Design requirement                   | Implementation task |
| ------------------------------------ | ------------------- |
| DocGraph response validation         | Task 4              |
| Markdown and Wiki links              | Task 3              |
| Filename and heading matching        | Task 3              |
| Git co-change                        | Task 3              |
| Directory proximity                  | Task 4              |
| Source toggles in Search panel       | Task 5              |
| Unselected recommendation candidates | Tasks 2, 4, 6       |
| Reason and score display             | Task 6              |
| Duplicate merge and Windows keys     | Task 2              |
| Partial failure preservation         | Tasks 2, 4, 6       |
| Token budget integration             | Task 6              |
| IPC and boundary validation          | Task 5              |
| Final verification and documentation | Task 7              |

## Plan Self-Review

- All ten acceptance criteria in the design specification map to at least one implementation task.
- No placeholder instructions such as `TBD`, `TODO`, or "implement later" are used.
- Types are introduced in Task 1 before they are consumed by Tasks 2 through 6.
- Existing `candidateKey`, `selectedKeys`, token-budget, IPC allowlist, and warning paths are reused rather than replaced.
- The plan does not require a commit or modify user settings; implementation commits are optional and must not include generated `dist` or `out` artifacts.
