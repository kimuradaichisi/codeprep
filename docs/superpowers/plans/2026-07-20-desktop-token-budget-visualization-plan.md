# Desktop Token Budget Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the selected files' estimated tokens against the token limit (with an over-budget warning and a budget bar), and let the user sort the Candidates tree by Size/Tokens.

**Architecture:** Add a small pure renderer model (`tokenBudget.ts`) for token math and budget status so the logic is unit-testable without the DOM. Add a pure `sortCandidateTree` post-processor to the existing tree model. Wire new state (`sortKey`) and the existing `tokenLimit` through the workspace hook into `CandidateTree`, which renders the summary, budget bar, and clickable sort headers.

**Tech Stack:** TypeScript, React, Vitest, esbuild. Renderer must not import Node/Electron APIs.

---

## File Structure

- Create: `apps/desktop/renderer/model/tokenBudget.ts` — pure token/budget helpers (`estimateTokens`, `formatTokens`, `selectedTokenTotal`, `budgetSummary`).
- Create: `apps/desktop/renderer/model/tokenBudget.test.ts` — unit tests for the helpers.
- Modify: `apps/desktop/renderer/model/candidateTree.ts` — add `TreeSort` type and pure `sortCandidateTree`.
- Modify: `apps/desktop/renderer/model/candidateTree.test.ts` — add a size-sort test.
- Modify: `apps/desktop/renderer/hooks/useDesktopWorkspace.ts` — add `sortKey` state, apply `sortCandidateTree`, pass `tokenLimit`/`sortKey`/`setSortKey` to `treePanel`.
- Modify: `apps/desktop/renderer/types.ts` — extend `CandidateTreeProps` and `DesktopWorkspace` with `tokenLimit`, `sortKey`, `setSortKey`.
- Modify: `apps/desktop/renderer/components/CandidateTree.tsx` — use `tokenBudget` helpers, render budget summary + budget bar + clickable sort headers.
- Modify: `apps/desktop/renderer/styles/desktop.css` — styles for `.token-summary`, `.budget-bar`, `.tree-sortable`.

**Constraints (from `AGENTS.md`):** files under 150 lines, functions under 15 lines, no `any`, prefer `const`/immutable data, guard clauses over deep nesting.

---

## Task 1: Pure token/budget model

**Files:**
- Create: `apps/desktop/renderer/model/tokenBudget.ts`
- Test: `apps/desktop/renderer/model/tokenBudget.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/renderer/model/tokenBudget.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { budgetSummary, estimateTokens, formatTokens, selectedTokenTotal } from './tokenBudget';
import type { AnalyzedCandidate } from '../../../../src/features/desktop-core/application/ports';

const candidate = (projectId: string, relativePath: string, size: number): AnalyzedCandidate => ({
  projectId, relativePath, reasons: ['pathAffinity'], excluded: false, score: 0, size,
});

describe('tokenBudget', () => {
  it('estimates 1 token per 4 bytes rounding up', () => {
    expect(estimateTokens(400)).toBe(100);
    expect(estimateTokens(401)).toBe(101);
  });

  it('formats thousands with a k suffix', () => {
    expect(formatTokens(999)).toBe('999');
    expect(formatTokens(1500)).toBe('1.5k');
  });

  it('sums tokens for selected candidates only', () => {
    const candidates = [candidate('p1', 'a.ts', 400), candidate('p1', 'b.ts', 800)];
    expect(selectedTokenTotal(candidates, ['p1:a.ts'])).toBe(100);
  });

  it('flags over budget when selected tokens exceed the limit', () => {
    expect(budgetSummary(120, 100)).toMatchObject({ over: true, ratio: 1 });
    expect(budgetSummary(50, 100)).toMatchObject({ over: false });
    expect(budgetSummary(50, 100).label).toBe('~50 / 100 tokens');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest apps/desktop/renderer/model/tokenBudget.test.ts --run`

Expected: FAIL — cannot resolve `./tokenBudget`.

- [ ] **Step 3: Write the minimal implementation**

Create `apps/desktop/renderer/model/tokenBudget.ts`:

```ts
import type { AnalyzedCandidate } from '../../../../src/features/desktop-core/application/ports';

export type BudgetSummary = Readonly<{ label: string; over: boolean; ratio: number }>;

export const estimateTokens = (bytes: number): number => Math.ceil(bytes / 4);

export const formatTokens = (tokens: number): string =>
  tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : `${tokens}`;

export const selectedTokenTotal = (
  candidates: readonly AnalyzedCandidate[],
  selectedKeys: readonly string[],
): number =>
  candidates.reduce((sum, c) =>
    selectedKeys.includes(`${c.projectId}:${c.relativePath}`) && c.size !== undefined
      ? sum + estimateTokens(c.size)
      : sum, 0);

export const budgetSummary = (selectedTokens: number, limit: number): BudgetSummary => ({
  label: `~${formatTokens(selectedTokens)} / ${formatTokens(limit)} tokens`,
  over: limit > 0 && selectedTokens > limit,
  ratio: limit > 0 ? Math.min(selectedTokens / limit, 1) : 0,
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest apps/desktop/renderer/model/tokenBudget.test.ts --run`

Expected: PASS — all four tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/renderer/model/tokenBudget.ts apps/desktop/renderer/model/tokenBudget.test.ts
git commit -m "feat: add desktop token budget model"
```

---

## Task 2: Sortable candidate tree by size

**Files:**
- Modify: `apps/desktop/renderer/model/candidateTree.ts`
- Test: `apps/desktop/renderer/model/candidateTree.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `apps/desktop/renderer/model/candidateTree.test.ts`. First ensure the import line pulls in `sortCandidateTree` (extend the existing import from `./candidateTree`, e.g. `import { buildCandidateTree, sortCandidateTree, ... } from './candidateTree';`):

```ts
it('sorts file nodes by size descending when sort is size', () => {
  const candidates = [
    { projectId: 'a', relativePath: 'src/small.ts', reasons: ['pathAffinity'] as const, excluded: false, score: 0, size: 100 },
    { projectId: 'a', relativePath: 'src/big.ts', reasons: ['pathAffinity'] as const, excluded: false, score: 0, size: 900 },
  ];
  const projects = [{ id: 'a', name: 'a', rootPath: '' }];
  const tree = sortCandidateTree(buildCandidateTree(candidates, projects), 'size');
  const src = tree[0].children[0];
  expect(src.children.map(node => node.name)).toEqual(['big.ts', 'small.ts']);
});

it('keeps directories before files and name order when sort is name', () => {
  const candidates = [
    { projectId: 'a', relativePath: 'z.ts', reasons: ['pathAffinity'] as const, excluded: false, score: 0, size: 10 },
    { projectId: 'a', relativePath: 'src/a.ts', reasons: ['pathAffinity'] as const, excluded: false, score: 0, size: 10 },
  ];
  const projects = [{ id: 'a', name: 'a', rootPath: '' }];
  const tree = sortCandidateTree(buildCandidateTree(candidates, projects), 'name');
  expect(tree[0].children.map(node => node.name)).toEqual(['src', 'z.ts']);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest apps/desktop/renderer/model/candidateTree.test.ts --run`

Expected: FAIL — `sortCandidateTree` is not exported.

- [ ] **Step 3: Write the minimal implementation**

In `apps/desktop/renderer/model/candidateTree.ts`, add the `TreeSort` type next to the other exported types (near `NodeCheckState`):

```ts
export type TreeSort = 'name' | 'size';
```

Then add these two functions at the end of the file (after `toggleKeys`):

```ts
export const sortCandidateTree = (
  nodes: readonly CandidateTreeNode[],
  sort: TreeSort,
): readonly CandidateTreeNode[] =>
  [...nodes]
    .map(node => ({ ...node, children: sortCandidateTree(node.children, sort) }))
    .sort(treeComparator(sort));

const treeComparator = (sort: TreeSort) =>
  (left: CandidateTreeNode, right: CandidateTreeNode): number => {
    if ((left.kind === 'file') !== (right.kind === 'file')) {
      return left.kind === 'file' ? 1 : -1;
    }
    return sort === 'size'
      ? (right.size ?? 0) - (left.size ?? 0)
      : left.name.localeCompare(right.name);
  };
```

Note: with `sort === 'name'` this reproduces the existing "directories first, then name-ascending" ordering, so default behavior is unchanged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest apps/desktop/renderer/model/candidateTree.test.ts --run`

Expected: PASS — both new tests and all existing tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/renderer/model/candidateTree.ts apps/desktop/renderer/model/candidateTree.test.ts
git commit -m "feat: add candidate tree size sort"
```

---

## Task 3: Wire tokenLimit and sortKey through the workspace hook

**Files:**
- Modify: `apps/desktop/renderer/types.ts`
- Modify: `apps/desktop/renderer/hooks/useDesktopWorkspace.ts`

- [ ] **Step 1: Extend the types**

In `apps/desktop/renderer/types.ts`, add the import for `TreeSort` (extend the existing `candidateTree` import):

```ts
import type { CandidateTreeNode, TreeSort } from './model/candidateTree';
```

Add these three members to `CandidateTreeProps` (after `selectedKeys`):

```ts
  tokenLimit: number;
  sortKey: TreeSort;
  setSortKey(value: TreeSort): void;
```

Add these two members to `DesktopWorkspace` (after the existing `favoritesOnly: boolean;` line):

```ts
  sortKey: TreeSort;
  setSortKey(value: TreeSort): void;
```

- [ ] **Step 2: Add `sortKey` state and apply the sort in the hook**

In `apps/desktop/renderer/hooks/useDesktopWorkspace.ts`, extend the existing import from `../model/candidateTree` to include the sort helpers:

```ts
import { buildCandidateTree, toggleTreeNode as toggleNode, sortCandidateTree } from '../model/candidateTree';
import type { CandidateTreeNode, TreeSort } from '../model/candidateTree';
```

Add `sortKey` state next to the other `useState` calls in `useDesktopWorkspace`:

```ts
  const [sortKey, setSortKey] = useState<TreeSort>('name');
```

Replace the existing `tree` memo:

```ts
  const tree = useMemo(() => buildCandidateTree(filteredCandidates, state.projects), [filteredCandidates, state.projects]);
```

with:

```ts
  const tree = useMemo(
    () => sortCandidateTree(buildCandidateTree(filteredCandidates, state.projects), sortKey),
    [filteredCandidates, state.projects, sortKey]
  );
```

- [ ] **Step 3: Thread `sortKey`/`setSortKey` into `workspace()`**

Add two parameters to the `workspace(...)` call at the end of `useDesktopWorkspace` (append after `toggleFavorite`):

```ts
    toggleFavorite,
    sortKey,
    setSortKey
```

Add the matching parameters to the `workspace` function signature (append after `toggleFavorite: (projectId: string, relativePath: string) => void`):

```ts
  toggleFavorite: (projectId: string, relativePath: string) => void,
  sortKey: TreeSort,
  setSortKey: (value: TreeSort) => void
): DesktopWorkspace => {
```

- [ ] **Step 4: Expose the new fields on `treePanel` and the workspace return**

In `workspace()`, update the `treePanel` object to include the new fields:

```ts
  const treePanel = { tree, candidates: state.candidates, selectedKeys: state.selectedKeys, tokenLimit: state.tokenLimit, sortKey, setSortKey, favorites, favoritesOnly, toggleTreeNode: actions.toggleTreeNode, selectAll, clearAll, viewFile, setFilePackMode, setFavoritesOnly, toggleFavorite };
```

Add `sortKey` and `setSortKey` to the final returned object (append inside the `return { ... }` at the end of `workspace`, e.g. right after `setFavoritesOnly`):

```ts
    setFavoritesOnly, sortKey, setSortKey,
```

- [ ] **Step 5: Verify types compile**

Run: `npm run check-types`

Expected: exit 0 (no type errors). The renderer still builds; `CandidateTree` will be updated in Task 4.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/renderer/types.ts apps/desktop/renderer/hooks/useDesktopWorkspace.ts
git commit -m "feat: expose token limit and sort key to tree panel"
```

---

## Task 4: Render budget summary, budget bar, and sort headers

**Files:**
- Modify: `apps/desktop/renderer/components/CandidateTree.tsx`
- Modify: `apps/desktop/renderer/styles/desktop.css`

- [ ] **Step 1: Replace local helpers with the shared model**

In `apps/desktop/renderer/components/CandidateTree.tsx`, replace the top imports and the two local helper functions:

```ts
import type { AnalyzedCandidate } from '../../../../src/features/desktop-core/application/ports';
import type { CandidateTreeProps } from '../types';
import { CandidateTreeNode } from './CandidateTreeNode';

const selectedTokenTotal = (
  candidates: readonly AnalyzedCandidate[],
  selectedKeys: readonly string[]
): number =>
  candidates.reduce((sum, c) =>
    selectedKeys.includes(`${c.projectId}:${c.relativePath}`) && c.size !== undefined
      ? sum + Math.ceil(c.size / 4)
      : sum, 0);

const formatTokens = (tokens: number): string =>
  tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : `${tokens}`;
```

with:

```ts
import type { CandidateTreeProps } from '../types';
import { CandidateTreeNode } from './CandidateTreeNode';
import { budgetSummary, formatTokens, selectedTokenTotal } from '../model/tokenBudget';
```

(The per-row `Math.ceil(candidate.size / 4)` token label inside the list stays as-is.)

- [ ] **Step 2: Destructure the new props and compute the summary**

Update the component parameter list to also destructure `tokenLimit`, `sortKey`, `setSortKey`, and switch the arrow body to a block that computes the summary. Replace:

```tsx
export const CandidateTree = ({ tree, candidates = [], selectedKeys, favorites = [], favoritesOnly, toggleTreeNode, selectAll, clearAll, viewFile, setFilePackMode, setFavoritesOnly, toggleFavorite }: CandidateTreeProps) => (
  <section className="candidate-tree">
```

with:

```tsx
export const CandidateTree = ({ tree, candidates = [], selectedKeys, tokenLimit, sortKey, setSortKey, favorites = [], favoritesOnly, toggleTreeNode, selectAll, clearAll, viewFile, setFilePackMode, setFavoritesOnly, toggleFavorite }: CandidateTreeProps) => {
  const summary = budgetSummary(selectedTokenTotal(candidates, selectedKeys), tokenLimit);
  return (
  <section className="candidate-tree">
```

Then add a closing `};` for the new function body: change the final two lines of the component from:

```tsx
  </section>
);
```

to:

```tsx
  </section>
  );
};
```

- [ ] **Step 3: Render the budget summary and budget bar**

Replace the existing token summary span:

```tsx
        <span className="count" style={{ marginLeft: '6px', fontSize: '11px' }}>{selectedKeys.length} files</span>
        <span className="count" style={{ fontSize: '11px', color: '#76a9ff' }}>~{formatTokens(selectedTokenTotal(candidates, selectedKeys))} tokens</span>
      </div>
    </div>
```

with:

```tsx
        <span className="count" style={{ marginLeft: '6px', fontSize: '11px' }}>{selectedKeys.length} files</span>
        <span className={`token-summary${summary.over ? ' over' : ''}`}>{summary.over ? '⚠ ' : ''}{summary.label}</span>
      </div>
    </div>
    {(tree.length > 0 || candidates.length > 0) && (
      <div className="budget-bar">
        <div className={`budget-bar-fill${summary.over ? ' over' : ''}`} style={{ width: `${summary.ratio * 100}%` }} />
      </div>
    )}
```

- [ ] **Step 4: Make the Size/Tokens headers sort controls**

Replace the header row:

```tsx
    {(tree.length > 0 || candidates.length > 0) && (
      <div className="tree-header-row">
        <span className="tree-header-name">Name</span>
        <span className="tree-header-size">Size</span>
        <span className="tree-header-tokens">Tokens</span>
        <span className="tree-header-mode">Mode</span>
      </div>
    )}
```

with:

```tsx
    {(tree.length > 0 || candidates.length > 0) && (
      <div className="tree-header-row">
        <span className="tree-header-name tree-sortable" onClick={() => setSortKey('name')}>Name{sortKey === 'name' ? ' ▲' : ''}</span>
        <span className="tree-header-size tree-sortable" onClick={() => setSortKey('size')}>Size{sortKey === 'size' ? ' ▼' : ''}</span>
        <span className="tree-header-tokens tree-sortable" onClick={() => setSortKey('size')}>Tokens{sortKey === 'size' ? ' ▼' : ''}</span>
        <span className="tree-header-mode">Mode</span>
      </div>
    )}
```

- [ ] **Step 5: Add styles**

Append to `apps/desktop/renderer/styles/desktop.css`:

```css
.token-summary { font-size: 11px; color: #76a9ff; white-space: nowrap; }
.token-summary.over { color: #ff7676; font-weight: bold; }
.budget-bar { height: 3px; width: 100%; background: #243044; border-radius: 2px; margin: 4px 0 2px; overflow: hidden; }
.budget-bar-fill { height: 100%; background: #76a9ff; border-radius: 2px; transition: width 0.15s ease; }
.budget-bar-fill.over { background: #ff7676; }
.tree-sortable { cursor: pointer; user-select: none; }
.tree-sortable:hover { color: #cdd9ea; }
```

- [ ] **Step 6: Verify types and run the desktop tests**

Run: `npm run check-types && npx vitest apps/desktop/renderer --run`

Expected: exit 0; all renderer tests pass (no test asserts the old `"N selected"` string, so nothing regresses).

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/renderer/components/CandidateTree.tsx apps/desktop/renderer/styles/desktop.css
git commit -m "feat: show token budget bar and sortable candidate columns"
```

---

## Task 5: Full verification

- [ ] **Step 1: Run checks**

Run: `npm run check-types && npm run desktop:test && npm run compile`

Expected: all commands exit 0.

- [ ] **Step 2: Manual Electron verification**

Run: `npm run desktop:dev`

Expected:
- Add a project and analyze so candidates appear.
- Select files: the header shows `N files` and `~X / Y tokens`; the budget bar grows.
- Lower the Token limit (in Output panel) below the selected total: the summary turns red with `⚠` and the budget bar turns red.
- Click the `Size` or `Tokens` header: files reorder largest-first (`▼`); click `Name`: files return to directories-first, name order (`▲`).

- [ ] **Step 3: Commit final integration**

```bash
git add apps/desktop/renderer
git commit -m "feat: desktop token budget visualization"
```

---

## Self-Review Notes

- **Spec coverage:** Over-limit warning (Task 4 Step 3), budget bar (Task 4 Step 3), Size/Tokens sort (Tasks 2–4). All covered.
- **Type consistency:** `TreeSort` defined in Task 2, imported in Tasks 3–4; `budgetSummary`/`selectedTokenTotal`/`formatTokens` defined in Task 1 and consumed in Task 4; `tokenLimit`/`sortKey`/`setSortKey` added to both `CandidateTreeProps` and `DesktopWorkspace` in Task 3 and passed via `treePanel`.
- **No placeholders:** Every code step shows exact content.
- **Constraints:** New helpers are ≤15 lines each; `tokenBudget.ts` is a small focused file; `CandidateTree.tsx` gains ~10 net lines and stays under 150.
