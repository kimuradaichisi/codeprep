# Context Packager Core Design

## Goal

Evolve CodePrep Desktop from a file picker into an AI context packager. The
first usable release lets users discover files through explicit search recipes,
review them in an independently scrolling Explorer, stay within a context
budget, and generate focused packs in several output modes.

## Scope

This release includes:

- Explorer-only scrolling while the discovery controls remain visible.
- Search recipes: text, Git diff, Git commit, clipboard paths, extension, and
  directory.
- Pack modes: full content, skeleton, directory tree only, and diff only.
- Estimated token and byte budget shown before generation.
- Markdown, XML, and JSON output using the existing formatter boundary.

It does not include dependency graph suggestions, persistent recipes, context
manifests, remote AI-provider integration, or secret classification. Those are
the next product increment after this release validates the workflow.

## Layered Architecture

```text
desktop-core/domain
  SearchRecipe, PackMode, ContextBudget
desktop-core/application
  DiscoverFilesUseCase, BuildContextPackUseCase
desktop-core/application/ports
  ClipboardPort, GitMetadataPort, ProjectFilePort
desktop-node
  ClipboardReader, GitHistoryReader, ProjectFileTree
apps/desktop
  IPC handlers and preload allowlist
apps/desktop/renderer
  workspace hook, recipe controls, Explorer, budget, output controls
```

The domain defines mode and validation types only. The application layer maps a
recipe to candidate files through ports and returns explainable results. Node
and Electron provide clipboard, Git, and filesystem adapters. The renderer
never uses Node or Electron APIs directly.

## Search Recipes

| Recipe | Input | Candidate rule |
|---|---|---|
| Text | query | Existing ripgrep and Git-aware ranking |
| Git diff | none | Changed paths from enabled projects |
| Git commit | commit ref | Paths touched by the specified commit |
| Clipboard paths | none | Extract only paths inside registered roots |
| Extension | comma-separated extensions | All matching project files |
| Directory | relative directory | All files below the directory |

Each result records one or more reasons, such as `gitModified`,
`clipboardPath`, `extensionMatch`, or `directoryMatch`. Invalid input,
missing Git data, unreadable files, and no matches produce action-local
warnings without clearing prior results.

## Explorer and Budget

The Explorer pane is a flex column. Its header and recipe controls do not
scroll; only the tree body has `overflow: auto`. The tree continues to support
project, directory, and file selection.

The right pane displays selected files, total bytes, and an estimated token
count. Estimation uses a deterministic character-to-token approximation and
marks it as an estimate. Users can set a budget; values over the limit block
generation until the selection or mode changes.

## Pack Modes

- **Full content:** current file contents.
- **Skeleton:** extract structural declarations when supported, otherwise show a
  clearly marked compact fallback.
- **Directory tree only:** output normalized selected paths without content.
- **Diff only:** output the available Git diff for selected files.

Pack mode is independent from the serializer format. The current Markdown, XML,
and JSON format selector remains unchanged.

## UI Flow

1. Add or choose a project.
2. Select a search recipe and supply the recipe-specific input when needed.
3. Review the result in the Explorer and refine selection.
4. Select pack mode and output format.
5. Check token/byte budget, then generate and copy.

## Testing

- Domain tests cover recipe validation, budget calculation, and pack mode
  selection.
- Application tests use fake ports for every recipe and expected warning.
- Node tests cover parsing Git output, clipboard path filtering, extension and
  directory traversal.
- Renderer tests cover recipe control visibility, disabled actions, internal
  Explorer scrolling classes, budget warnings, and output mode payloads.
- Test empty projects, missing Git, clipboard paths outside roots, malformed
  commit refs, empty extensions, unreadable files, and budget boundaries.

## Success Criteria

A user can package a changed feature, a set of clipboard-referenced files, or a
directory of source files without manually locating every file. Before copying,
they can see why files were selected, the mode used, and an approximate context
size.

