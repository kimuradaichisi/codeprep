# Desktop Workspace UI Design

## Goal

Replace the Electron MVP's unstructured form with a desktop workspace that
offers VS Code Explorer-like project navigation, candidate selection, and
context output review on a single screen.

## Layout

The renderer uses a three-pane desktop layout:

1. **Project pane**: registered projects, a native folder-picker action, and
   project add/remove controls.
2. **Explorer pane**: query controls and a hierarchical candidate tree grouped
   as project, directory, then file.
3. **Context pane**: selected-file count, output options, generated preview,
   and copy action.

The first pane is narrow and persistent. The Explorer receives the largest
share of horizontal space. The Context pane remains visible while users change
the tree selection. On narrow windows, panes stack in reading order.

## Renderer Boundaries

```text
apps/desktop/renderer/
├─ App.tsx                       # compose the view and hook only
├─ hooks/useDesktopWorkspace.ts  # renderer state and IPC orchestration
├─ components/
│  ├─ AppShell.tsx               # page layout
│  ├─ ProjectPanel.tsx           # project actions and project list
│  ├─ SearchPanel.tsx            # query input and analyze action
│  ├─ CandidateTree.tsx          # explorer-level tree rendering
│  ├─ CandidateTreeNode.tsx      # one expandable/selectable node
│  ├─ OutputPanel.tsx            # output settings and preview
│  └─ InlineNotice.tsx           # action-local status and errors
├─ model/candidateTree.ts        # pure candidate-to-tree transformation
├─ styles/desktop.css            # desktop tokens and component styles
└─ DesktopWorkflow.ts            # renderer-to-preload calls only
```

`candidateTree.ts` has no React or Electron imports. It converts analyzed
candidates to immutable tree nodes and preserves candidate keys. Components do
not invoke IPC directly. The hook owns asynchronous actions and passes typed
props to components. `DesktopWorkflow.ts` remains the only renderer boundary
to the preload API.

## Explorer Behaviour

The Explorer initially expands each project root and keeps directory expansion
state in the renderer. A folder checkbox selects or clears all selectable child
files; a file checkbox changes only that candidate. Parent checkboxes reflect
checked, unchecked, or mixed child state. Scores and reason labels appear on
file rows, while folders show selected-file counts. Selection is preserved when
folders are collapsed.

The initial version renders only analyzed candidates, not every filesystem
entry. This makes the tree responsive and keeps its purpose aligned with
context selection. A clear empty state explains that a query is needed and
provides one action: focus the query field.

## Action Validation and Errors

The UI prevents known invalid calls before IPC:

- Add project is disabled until the selected path is non-empty.
- Analyze is disabled until a non-empty trimmed query and one project exist.
- Generate is disabled until at least one candidate is selected.
- Copy is disabled until generated output exists.

Validation feedback is displayed adjacent to the relevant action. IPC failures
are caught by the workspace hook and surface in the originating panel, without
clearing prior successful results. Main-process validation remains unchanged as
the security boundary.

## Visual and Accessibility Rules

Use a neutral dark desktop palette, one blue accent, clear pane dividers, and
system fonts. Controls retain native keyboard semantics: buttons are buttons,
tree items use buttons for expansion, and checkboxes have visible labels.
Icon-only controls require accessible names. No automatic animations are added.

## Testing

Unit-test tree conversion for nested paths, multiple projects, and empty
results. Unit-test selection helpers for descendants and mixed states.
Component tests cover hierarchy rendering, expand/collapse, file and directory
selection, empty states, disabled actions, and action-local IPC errors. Existing
workflow tests cover valid payloads; new tests ensure blank inputs do not call
the preload API.

## Out of Scope

The UI will not scan arbitrary filesystem directories or replace the VS Code
extension's full explorer. It will not write generated output to disk.
