# Electron Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Electron desktop MVP while keeping the VSCode extension usable.

**Architecture:** Extract reusable TypeScript core modules first, then add Node adapters and an Electron shell. `ripgrep` is a first-class discovery dependency for the desktop MVP, with Git metadata layered on top for scoring. VSCode-specific code remains in place and consumes shared code only after the core is stable.

**Tech Stack:** TypeScript, Node.js, Vitest, esbuild, Electron, React.

---

## File Structure

- Create: `src/features/desktop-core/domain/Project.ts` — pure project model.
- Create: `src/features/desktop-core/domain/CandidateFile.ts` — candidate and reason model.
- Create: `src/features/desktop-core/domain/FileScorer.ts` — explainable scoring.
- Create: `src/features/desktop-core/application/ports.ts` — registry, rg, git, file ports.
- Create: `src/features/desktop-core/application/AnalyzeProjectsUseCase.ts` — analysis orchestration.
- Create: `src/features/desktop-core/application/BuildDesktopContextUseCase.ts` — output orchestration.
- Create: `src/features/desktop-node/RipgrepClient.ts` — required `rg --json` discovery adapter.
- Create: `src/features/desktop-node/GitMetadataClient.ts` — git status/log adapter.
- Create: `src/features/desktop-node/ProjectRegistryStore.ts` — local JSON registry.
- Create: `apps/desktop/main.ts`, `apps/desktop/preload.ts`, `apps/desktop/renderer/App.tsx`.
- Modify: `package.json`, `tsconfig.json`.

## Task 1: Core Models

**Files:** Create `src/features/desktop-core/domain/Project.ts`, `src/features/desktop-core/domain/CandidateFile.ts`; test `src/features/desktop-core/domain/__tests__/CandidateFile.test.ts`.

- [ ] **Step 1: Write failing tests**
```ts
import { describe, expect, it } from 'vitest';
import { createCandidateFile } from '../CandidateFile';
it('creates a non-excluded candidate with reasons', () => {
  const file = createCandidateFile('p1', 'src/app.ts', ['rgMatch']);
  expect(file).toMatchObject({ projectId: 'p1', relativePath: 'src/app.ts', excluded: false });
  expect(file.reasons).toEqual(['rgMatch']);
});
```
- [ ] **Step 2: Run failure check** — `npx vitest src/features/desktop-core/domain/__tests__/CandidateFile.test.ts --run`; expected FAIL because files do not exist.
- [ ] **Step 3: Implement** — define readonly `Project`, `ProjectId`, `CandidateReason`, `CandidateFile`, and `createCandidateFile`; use `unknown` only if validation is needed.
- [ ] **Step 4: Verify and commit** — run the same test; commit `git add src/features/desktop-core && git commit -m "feat: add desktop core models"`.

## Task 2: File Scoring

**Files:** Create `src/features/desktop-core/domain/FileScorer.ts`; test `src/features/desktop-core/domain/__tests__/FileScorer.test.ts`.

- [ ] **Step 1: Write failing tests**
```ts
import { expect, it } from 'vitest';
import { scoreCandidate } from '../FileScorer';
it('scores rg and git signals higher than path-only matches', () => {
  const scored = scoreCandidate({ reasons: ['rgMatch', 'gitModified', 'pathAffinity'], manualPin: false });
  expect(scored.score).toBe(80);
});
```
- [ ] **Step 2: Implement** — weights: `rgMatch=35`, `gitModified=30`, `recentCommit=20`, `pathAffinity=15`, `fileTypeBoost=10`, `manualPin=100`, `excluded=-1000`.
- [ ] **Step 3: Verify and commit** — `npx vitest src/features/desktop-core/domain/__tests__/FileScorer.test.ts --run`; commit `git add src/features/desktop-core/domain && git commit -m "feat: add explainable file scoring"`.

## Task 3: Analysis Use Case

**Files:** Create `src/features/desktop-core/application/ports.ts`, `src/features/desktop-core/application/AnalyzeProjectsUseCase.ts`; test `src/features/desktop-core/application/__tests__/AnalyzeProjectsUseCase.test.ts`.

- [ ] **Step 1: Write failing orchestration test**
```ts
it('returns sorted candidates from rg and git signals', async () => {
  const result = await useCase.analyze({ query: 'auth', projectIds: ['p1'] });
  expect(result.candidates.map(file => file.relativePath)).toEqual(['src/auth.ts', 'README.md']);
});
```
- [ ] **Step 2: Define ports** — `ProjectRegistryPort`, `RipgrepPort`, `GitMetadataPort`, `FileContentPort`; return `Promise<Result<T, string>>` or readonly arrays.
- [ ] **Step 3: Implement** — merge by `projectId + relativePath`, attach reasons, score, sort descending, and return warnings for missing `rg`, Git failure, unreadable files, and invalid roots.
- [ ] **Step 4: Verify and commit** — `npx vitest src/features/desktop-core/application/__tests__/AnalyzeProjectsUseCase.test.ts --run`; commit `git add src/features/desktop-core/application && git commit -m "feat: add project analysis use case"`.

## Task 4: Node Adapters

**Files:** Create `src/features/desktop-node/RipgrepClient.ts`, `src/features/desktop-node/GitMetadataClient.ts`, `src/features/desktop-node/ProjectRegistryStore.ts`; tests under `src/features/desktop-node/__tests__/`.

- [ ] **Step 1: Write adapter tests** — use fixture strings for `rg --json`, `git status --porcelain`, `git log --name-only --format=`; use temp JSON files for registry persistence.
- [ ] **Step 2: Implement adapters** — use `node:child_process` only here; run `rg --json --hidden --glob` with project excludes; parse stdout into readonly records; convert missing `rg` to a clear warning.
- [ ] **Step 3: Verify and commit** — `npx vitest src/features/desktop-node --run`; commit `git add src/features/desktop-node && git commit -m "feat: add desktop node adapters"`.

## Task 5: Electron Shell

**Files:** Create `apps/desktop/main.ts`, `apps/desktop/preload.ts`, `apps/desktop/renderer/App.tsx`, `apps/desktop/renderer/App.test.tsx`; modify `package.json`, `tsconfig.json`.

- [ ] **Step 1: Add scripts and dependencies** — scripts `desktop:dev`, `desktop:build`, `desktop:test`; add Electron, React, React DOM, and matching type packages; document that `rg` must be installed and on `PATH`.
- [ ] **Step 2: Implement safe IPC** — expose `listProjects`, `addProject`, `removeProject`, `analyzeProjects`, `generateOutput`, `copyOutput`; reject unknown channels.
- [ ] **Step 3: Implement MVP UI** — project list, query input, scored candidate table, output preview, copy button; renderer must not use Node APIs.
- [ ] **Step 4: Verify and commit** — `npm run check-types && npm run desktop:test`; commit `git add apps package.json tsconfig.json && git commit -m "feat: add electron desktop shell"`.

## Task 6: Desktop Output Generation

**Files:** Modify `src/features/engine/domain/OutputEngine.ts`; create `src/features/desktop-core/application/BuildDesktopContextUseCase.ts`; test `src/features/desktop-core/application/__tests__/BuildDesktopContextUseCase.test.ts`.

- [ ] **Step 1: Write output tests** — selected candidate contents generate Markdown, XML, and JSON; assert no physical output file is created.
- [ ] **Step 2: Implement use case** — read selected files through `FileContentPort`, apply max-size policy, call `OutputEngine`, and return preview text plus warnings.
- [ ] **Step 3: Wire Electron output** — call the use case from `main.ts` and pass preview text to `App.tsx` through IPC.
- [ ] **Step 4: Verify and commit** — `npm run check-types && npx vitest src/features/desktop-core/application --run`; commit `git add src/features/desktop-core apps/desktop && git commit -m "feat: generate desktop context output"`.

## Final Verification

- [ ] Run `npm run check-types`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test:unit`.
- [ ] Run `npm run desktop:build`.
- [ ] Manually verify Electron can add two projects, analyze a query, exclude a file, preview output, and copy output.