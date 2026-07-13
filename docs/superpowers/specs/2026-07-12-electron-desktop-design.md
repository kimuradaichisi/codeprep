# CodePrep Electron Desktop Design

## Decision

CodePrep will keep the existing VSCode extension and add an Electron desktop app.
The desktop app targets workflows that exceed VSCode extension ergonomics:
multi-project context preparation, ripgrep-backed discovery, Git-aware scoring,
and wide-screen review of candidate files.

The implementation should not merge code from the separate Python project.
That project can inform behavior, scoring ideas, and UX expectations, but the
CodePrep implementation remains TypeScript-first.

## Goals

- Keep the current VSCode extension usable during the transition.
- Extract shared TypeScript core logic that both apps can call.
- Add a desktop workflow for registering and analyzing multiple projects.
- Use ripgrep and Git metadata to recommend context files automatically.
- Preserve manual review before generating LLM context.
- Make later standalone-only features possible without blocking VSCode usage.

## Non-Goals

- Rewriting CodePrep in Python.
- Removing or replacing the VSCode extension in the first phase.
- Implementing patch application and commit assistance in the MVP.
- Building a browser-served local web app as the primary product.

## Target Structure

```text
CodePrep
├─ packages/core
│  ├─ project model
│  ├─ candidate model
│  ├─ file scoring
│  ├─ output generation
│  └─ selection rules
├─ packages/node-adapters
│  ├─ filesystem adapter
│  ├─ ripgrep adapter
│  ├─ git adapter
│  ├─ config store
│  └─ clipboard adapter
├─ apps/vscode
│  └─ existing extension shell
└─ apps/desktop
   ├─ Electron main process
   └─ React renderer
```

The current repository can move toward this structure incrementally. The first
implementation should avoid a large filesystem reshuffle unless required by the
build system.

## Core Boundaries

`packages/core` must stay free of VSCode, Electron, Node filesystem, and process
APIs. It exposes pure services and interfaces:

- `Project`: registered root, display name, enabled state, and local settings.
- `CandidateFile`: path, project id, score, matched signals, and exclusion state.
- `FileScorer`: combines ripgrep, Git, file type, and recency signals.
- `ContextBuilder`: generates Markdown, XML, or JSON output from selected files.
- `SelectionPolicy`: applies size limits, exclude patterns, and manual overrides.

`packages/node-adapters` implements the impure ports:

- Filesystem reads, stats, and directory walking.
- `rg` invocation and result parsing.
- Git diff, recent commit, touched-file, and status queries.
- Persistent project registry.
- Clipboard integration.

## Electron MVP

The first desktop release should focus on file discovery and context generation.

### Project Screen

- Shows registered projects.
- Supports add, remove, enable, disable, and recent ordering.
- Stores project metadata locally, outside the project repositories.
- Treats each project as an independent root with its own exclude settings.

### Analysis Screen

- Accepts a free-text search query or analysis preset.
- Runs ripgrep across enabled projects.
- Reads Git status and recent commit metadata per project.
- Produces candidate files with signal explanations.
- Handles missing Git repositories and missing `rg` gracefully.

### Candidate Screen

- Shows files sorted by score.
- Displays project, relative path, score, and reason labels.
- Allows include, exclude, and pin actions before output.
- Keeps manual overrides visible and reversible.

### Output Screen

- Generates Markdown, XML, or JSON using existing CodePrep output behavior.
- Shows a preview before copying.
- Copies output to the clipboard.
- Does not write generated context to disk by default.

## Scoring Model

The MVP scoring model should be simple and explainable:

- `rgMatch`: file content matched the query.
- `gitModified`: file is currently changed.
- `recentCommit`: file appeared in recent commits.
- `pathAffinity`: path or filename matched query terms.
- `fileTypeBoost`: source/config/test files receive configurable weights.
- `manualPin`: user explicitly included the file.
- `excluded`: user or policy removed the file.

Each candidate should carry a list of reasons so the UI can explain why it was
selected. The score algorithm can evolve after user feedback, but opaque scores
should be avoided.

## VSCode Extension Role

The VSCode extension remains a first-class entry point for lightweight use:

- Tree selection inside the active workspace.
- Existing context generation commands.
- Existing prompt and output workflows.
- Future reuse of shared core services where practical.

The extension should not be forced to support full multi-project desktop UX.
That responsibility belongs to the Electron app.

## Error Handling

- Missing `rg`: show installation guidance and disable rg-based analysis.
- Git command failure: keep file discovery available and mark Git signals absent.
- Unreadable file: skip the file and record a visible warning.
- Large file: apply max-size policy before reading content.
- Invalid project root: keep the registry entry but mark it unavailable.

Errors should be surfaced at the UI boundary. Core services return typed results
instead of throwing for expected failures.

## Testing Strategy

- Unit-test core scoring, selection, output generation, and policy behavior.
- Unit-test adapter parsers for ripgrep and Git output.
- Add integration tests for analysis orchestration with mocked adapters.
- Keep VSCode-specific tests separate from Electron-specific tests.
- Cover empty projects, missing Git, missing rg, unreadable files, and oversized files.

## Migration Plan

1. Define core ports and models around project registry, candidates, and scoring.
2. Add Node adapters for ripgrep, Git, filesystem, and local settings.
3. Build a small analysis use case that returns explainable candidates.
4. Add Electron shell with project and candidate screens.
5. Reuse existing output generation through the shared core.
6. Gradually move VSCode code to the same core where it reduces duplication.

## Open Decisions

- Whether to physically move to `packages/` and `apps/` immediately.
- Which UI library to use in the Electron renderer.
- Whether to bundle `rg` or require it as a system dependency.
- How many recent commits should affect the default score.
- Whether project registry should be JSON, SQLite, or another local store.