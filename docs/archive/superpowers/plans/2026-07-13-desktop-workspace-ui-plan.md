# Desktop Workspace UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a VS Code Explorer-like Electron workspace with safe project selection, hierarchical candidate review, and action-local validation.

**Architecture:** Keep Electron dialog and IPC access in the main/preload boundary. Build immutable candidate-tree and selection helpers without React or Electron imports. The renderer hook owns asynchronous state while presentational components receive typed props only.

**Tech Stack:** TypeScript, React 19, Electron, Vitest, jsdom, CSS.

---

## File Structure

- Create: `apps/desktop/renderer/model/candidateTree.ts` — immutable tree and selection helpers.
- Create: `apps/desktop/renderer/model/candidateTree.test.ts` — pure tree unit tests.
- Create: `apps/desktop/renderer/hooks/useDesktopWorkspace.ts` — renderer state and IPC orchestration.
- Create: `apps/desktop/renderer/components/AppShell.tsx`, `ProjectPanel.tsx`, `SearchPanel.tsx`, `CandidateTree.tsx`, `CandidateTreeNode.tsx`, `OutputPanel.tsx`, and `InlineNotice.tsx` — focused presentation.
- Create: `apps/desktop/renderer/styles/desktop.css` — renderer visual system.
- Modify: `apps/desktop/DesktopApi.ts`, `IpcAllowlist.ts`, `IpcAllowlist.test.ts`, and `DesktopHandlers.ts` — limited folder-picker IPC.
- Modify: `apps/desktop/renderer/App.tsx`, `App.test.tsx`, `App.interaction.test.tsx`, `bootstrap.tsx`, and `index.html` — compose and load the new UI.

### Task 1: Add the safe native folder-picker boundary

**Files:**
- Modify: `apps/desktop/DesktopApi.ts`, `apps/desktop/IpcAllowlist.ts`, `apps/desktop/IpcAllowlist.test.ts`, `apps/desktop/DesktopHandlers.ts`
- Test: `apps/desktop/DesktopHandlers.test.ts`

- [ ] **Step 1: Write the failing allowlist test**

```ts
it('exposes folder selection and no extra IPC methods', () => {
  const api = createDesktopApi(createSafeIpcInvoker(async () => []));
  expect(Object.keys(api).sort()).toContain('chooseProjectFolder');
  expect(Object.keys(api)).toHaveLength(7);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest apps/desktop/IpcAllowlist.test.ts --run`

Expected: FAIL because `chooseProjectFolder` is absent.

- [ ] **Step 3: Write the minimal implementation**

```ts
export type DesktopApi = Readonly<{
  chooseProjectFolder(): Promise<string | undefined>;
  listProjects(): Promise<readonly Project[]>;
  addProject(rootPath: string): Promise<readonly Project[]>;
  removeProject(projectId: string): Promise<readonly Project[]>;
  analyzeProjects(input: AnalyzeProjectsInput): Promise<AnalyzeProjectsResult>;
  generateOutput(input: BuildDesktopContextInput): Promise<DesktopOutput>;
  copyOutput(text: string): Promise<void>;
}>;

export const desktopChannels = [
  'chooseProjectFolder', 'listProjects', 'addProject', 'removeProject',
  'analyzeProjects', 'generateOutput', 'copyOutput',
] as const;
```

Register `chooseProjectFolder` in the main process. Inject `dialog.showOpenDialog` into a small handler factory; call it with `properties: ['openDirectory']`, return `undefined` when cancelled, and otherwise return the first path.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest apps/desktop/IpcAllowlist.test.ts apps/desktop/DesktopHandlers.test.ts --run`

Expected: PASS for the allowlist, cancellation, and selected directory.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/DesktopApi.ts apps/desktop/IpcAllowlist.ts apps/desktop/IpcAllowlist.test.ts apps/desktop/DesktopHandlers.ts apps/desktop/DesktopHandlers.test.ts
git commit -m "feat: add safe desktop folder picker"
```

### Task 2: Build and test the pure Explorer tree model

**Files:**
- Create: `apps/desktop/renderer/model/candidateTree.ts`
- Test: `apps/desktop/renderer/model/candidateTree.test.ts`

- [ ] **Step 1: Write failing tree tests**

```ts
it('groups candidates by project and every path segment', () => {
  const tree = buildCandidateTree([
    candidate('p1', 'Demo', 'src/components/Button.tsx'),
    candidate('p1', 'Demo', 'src/app.tsx'),
  ], projects);
  expect(tree[0]).toMatchObject({ label: 'Demo', kind: 'project' });
  expect(tree[0].children[0].children[0].label).toBe('components');
});

it('selects every descendant of a directory immutably', () => {
  expect(toggleTreeNode(tree, 'p1:src', [])).toEqual([
    'p1:src/app.tsx', 'p1:src/components/Button.tsx',
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest apps/desktop/renderer/model/candidateTree.test.ts --run`

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
export type CandidateTreeNode = Readonly<{
  id: string;
  kind: 'project' | 'directory' | 'file';
  label: string;
  children: readonly CandidateTreeNode[];
  candidate?: AnalyzedCandidate;
}>;

export const buildCandidateTree = (
  candidates: readonly AnalyzedCandidate[],
  projects: readonly Project[],
): readonly CandidateTreeNode[] => /* immutable grouping */;

export const nodeCheckState = (
  node: CandidateTreeNode,
  keys: readonly string[],
): 'checked' | 'unchecked' | 'mixed' => /* leaf-key comparison */;
```

Normalize `\\` to `/`, sort directories before files, retain candidate keys, and extract insertion, sorting, and descendant-key helpers so every function is at most 15 lines.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest apps/desktop/renderer/model/candidateTree.test.ts --run`

Expected: PASS for nested paths, multiple projects, no candidates, mixed selection, and separator normalization.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/renderer/model
git commit -m "feat: add immutable desktop candidate tree"
```

### Task 3: Extract workspace state and block invalid actions

**Files:**
- Create: `apps/desktop/renderer/hooks/useDesktopWorkspace.ts`
- Modify: `apps/desktop/renderer/DesktopWorkflow.ts`, `apps/desktop/renderer/DesktopWorkflow.test.ts`
- Test: `apps/desktop/renderer/hooks/useDesktopWorkspace.test.tsx`

- [ ] **Step 1: Write failing hook tests**

```ts
it('does not invoke addProject for a blank path', async () => {
  const { result } = renderWorkspace(api);
  await result.current.addProject('   ');
  expect(api.addProject).not.toHaveBeenCalled();
  expect(result.current.projectNotice).toMatch(/path/i);
});

it('does not analyze a blank query', async () => {
  const { result } = renderWorkspace(api);
  await result.current.analyze('');
  expect(api.analyzeProjects).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest apps/desktop/renderer/hooks/useDesktopWorkspace.test.tsx --run`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Write the minimal implementation**

The hook loads projects once and exposes typed project, search, tree, and output props. It keeps `projectNotice`, `searchNotice`, and `outputNotice` distinct. It trims inputs, returns before invalid IPC calls, and preserves prior candidates after failures. A cancelled folder picker makes no state change; a chosen folder calls the existing add-project workflow.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest apps/desktop/renderer/DesktopWorkflow.test.ts apps/desktop/renderer/hooks/useDesktopWorkspace.test.tsx --run`

Expected: PASS for valid calls, cancellation, blank-input prevention, and action-local bridge failures.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/renderer/DesktopWorkflow.ts apps/desktop/renderer/DesktopWorkflow.test.ts apps/desktop/renderer/hooks
git commit -m "feat: validate desktop workspace actions"
```

### Task 4: Implement accessible three-pane components

**Files:**
- Create: `apps/desktop/renderer/components/AppShell.tsx`, `ProjectPanel.tsx`, `SearchPanel.tsx`, `CandidateTree.tsx`, `CandidateTreeNode.tsx`, `OutputPanel.tsx`, `InlineNotice.tsx`
- Modify: `apps/desktop/renderer/App.tsx`
- Test: `apps/desktop/renderer/components/CandidateTree.test.tsx`, `apps/desktop/renderer/App.interaction.test.tsx`

- [ ] **Step 1: Write failing component tests**

```ts
it('renders nested candidates and toggles a directory', async () => {
  render(<CandidateTree candidates={candidates} projects={projects} />);
  await user.click(screen.getByRole('button', { name: 'Expand src' }));
  expect(screen.getByRole('checkbox', { name: 'Include src/app.tsx' })).toBeVisible();
  await user.click(screen.getByRole('checkbox', { name: 'Include src' }));
  expect(onSelectionChange).toHaveBeenCalledWith(['p1:src/app.tsx']);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest apps/desktop/renderer/components/CandidateTree.test.tsx --run`

Expected: FAIL because the Explorer components do not exist.

- [ ] **Step 3: Write the minimal implementation**

```tsx
export const App = ({ api = defaultApi() }: AppProps) => {
  const workspace = useDesktopWorkspace(api);
  return <AppShell
    projects={<ProjectPanel {...workspace.projectPanel} />}
    explorer={<><SearchPanel {...workspace.searchPanel} />
      <CandidateTree {...workspace.tree} /></>}
    output={<OutputPanel {...workspace.outputPanel} />}
  />;
};
```

Use landmark `aside` and `section` elements. Expansion uses labelled buttons; all checkboxes have readable labels. Set directory checkbox indeterminate state through a ref. Project and search panels disable invalid actions and render `InlineNotice` directly underneath. Output disables Generate with zero selections and Copy with no preview.

- [ ] **Step 4: Run UI tests**

Run: `npx vitest apps/desktop/renderer/App.test.tsx apps/desktop/renderer/App.interaction.test.tsx apps/desktop/renderer/components/CandidateTree.test.tsx --run`

Expected: PASS for hierarchy, collapse preservation, directory/file selection, disabled actions, notices, generation, and copy failure.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/renderer/App.tsx apps/desktop/renderer/App.test.tsx apps/desktop/renderer/App.interaction.test.tsx apps/desktop/renderer/components
git commit -m "feat: build desktop explorer workspace"
```

### Task 5: Add the visual system and verify the desktop build

**Files:**
- Create: `apps/desktop/renderer/styles/desktop.css`
- Modify: `apps/desktop/renderer/bootstrap.tsx`, `apps/desktop/renderer/index.html`, `apps/desktop/renderer/App.test.tsx`

- [ ] **Step 1: Write a failing static render assertion**

```ts
expect(markup).toContain('desktop-workspace');
expect(markup).toContain('Explorer');
expect(markup).toContain('Selected files');
```

- [ ] **Step 2: Run the assertion to verify it fails**

Run: `npx vitest apps/desktop/renderer/App.test.tsx --run`

Expected: FAIL until the new shell is composed.

- [ ] **Step 3: Write the minimal visual implementation**

```ts
import './styles/desktop.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

Define neutral color tokens plus one blue accent. Use a three-column responsive grid above 960px and a single-column layout below it. Give panes independent overflow, visible focus treatment, and no gradients or animation. Use `text-wrap: balance` for headings and `text-wrap: pretty` for explanatory copy.

- [ ] **Step 4: Verify type, lint, tests, and build**

Run: `npm run check-types && npm run lint && npm run desktop:test && npm run desktop:build`

Expected: every command exits 0 and the renderer bundle is written.

- [ ] **Step 5: Manually verify Electron**

Run: `npm run desktop:dev`

Expected: blank controls do not invoke IPC; choose a project folder; analyze a query; expand nested nodes; select a directory; generate and copy output.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/renderer/styles apps/desktop/renderer/bootstrap.tsx apps/desktop/renderer/index.html
git commit -m "style: polish desktop workspace"
```

