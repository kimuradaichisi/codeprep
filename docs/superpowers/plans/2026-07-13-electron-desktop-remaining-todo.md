# Electron Desktop Remaining TODO

**Created:** 2026-07-13

**Worktree:** `D:\tmp\codeprep-worktrees\electron-desktop`

**Branch:** `feat/electron-desktop`

**Current State:** Task 1 through Task 4 implementation exists. Subagent usage limit stopped the planned Task 4 final review and the remaining implementation tasks.

## Verified Checkpoint

- [x] Task 1 core models implemented.
- [x] Task 2 file scoring implemented.
- [x] Task 3 analysis use case implemented.
- [x] Task 4 node adapters implemented.
- [x] `npx vitest src/features/desktop-node --run` passes: 3 files, 13 tests.
- [x] `npm run check-types` passes.

## Immediate Review TODO

- [ ] Re-run Task 4 spec review manually or with a fresh reviewer.
  - Confirm `ProjectRegistryStore` preserves `excludePatterns`.
  - Confirm registry tests cover `excludePatterns` through `saveAll` and `getByIds`.
  - Confirm Git test output strings use fixture constants.
  - Confirm `RipgrepClient` test callbacks are 15 lines or fewer.
  - Confirm malformed `rg --json` lines are ignored without producing `missingRg`.
  - Confirm constructor and project excludes become argv pairs: `--glob`, `!pattern`.

- [ ] Re-run Task 4 quality review manually or with a fresh reviewer.
  - Check no shell interpolation is used for `rg` or `git`.
  - Check missing `rg` maps to `missingRg` only for spawn failure.
  - Check `rg` exit code `1` means no matches, not failure.
  - Check `git` command failures return `gitFailure` and empty path arrays.
  - Check all Task 4 files are under 150 lines and functions are under 15 lines.

## Implementation TODO

- [ ] Task 5: Add Electron desktop shell.
  - Create `apps/desktop/main.ts`.
  - Create `apps/desktop/preload.ts`.
  - Create `apps/desktop/renderer/App.tsx`.
  - Create `apps/desktop/renderer/App.test.tsx`.
  - Update `package.json` with `desktop:dev`, `desktop:build`, and `desktop:test`.
  - Update `tsconfig.json` to include desktop files.
  - Document that `rg` must be installed and available on `PATH`.

- [ ] Task 5 review checklist.
  - Renderer must not import Node APIs.
  - IPC must expose only known channels.
  - IPC channels: `listProjects`, `addProject`, `removeProject`, `analyzeProjects`, `generateOutput`, `copyOutput`.
  - UI must include project list, query input, scored candidate table, output preview, and copy button.
  - Run `npm run check-types` and `npm run desktop:test`.

- [ ] Task 6: Add desktop output generation.
  - Create `src/features/desktop-core/application/BuildDesktopContextUseCase.ts`.
  - Create `src/features/desktop-core/application/__tests__/BuildDesktopContextUseCase.test.ts`.
  - Reuse `src/features/engine/domain/OutputEngine.ts` without writing generated context to disk.
  - Read selected files through `FileContentPort`.
  - Apply max-size policy before output generation.
  - Return preview text plus warnings.
  - Wire Electron main process to renderer output preview.

- [ ] Task 6 review checklist.
  - Markdown, XML, and JSON outputs are tested.
  - Oversized and unreadable files produce warnings.
  - No VSCode, Electron, or Node imports enter `desktop-core`.
  - Run `npm run check-types` and `npx vitest src/features/desktop-core/application --run`.

## Final Verification TODO

- [ ] Run `npm run check-types`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test:unit`.
- [ ] Run `npm run desktop:build` after desktop scripts exist.
- [ ] Manually verify Electron can add two projects.
- [ ] Manually verify Electron can analyze a query with `ripgrep`.
- [ ] Manually verify candidate include/exclude works.
- [ ] Manually verify output preview and copy work.

## Git TODO

- [ ] Decide whether to commit the design and implementation plan with Task 1-4 work.
- [ ] Review `git status --short` before staging.
- [ ] Do not stage `node_modules` junction or temporary files.
- [ ] Preserve worktree path until the branch is merged or explicitly cleaned up.