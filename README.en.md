# 📦 CodePrep for VSCode

**CodePrep** is a powerful VSCode extension designed to efficiently extract code from your workspace and generate the optimal context (prompts) for LLMs like ChatGPT, Claude, and GitHub Copilot.

Beyond intuitive file selection, it features **Autonomous Patch & Heal** for safely integrating AI-generated code and automatic selection based on Git history.

## ✨ Key Features

- 🌳 **Intuitive Tree Selection**: Select files/folders via checkboxes in a dedicated sidebar.
- 🩹 **Autonomous Patch & Heal**: Automatically parse AI-generated code (even with omissions like `// ... existing code ...`) from the clipboard and merge it intelligently. Preview changes in the VSCode Diff editor before applying.
- 🔍 **Git Diff Selection**: Extract modified files and related tests with a single click.
 - 📁 **Select Directories Only**: Extract only parent directories derived from a file list (useful for summarizing project structure).
- 📊 **Real-time Token Counting**: View estimated token counts in the status bar with over-limit warnings.
- 📝 **Flexible Output Formats**: Supports `Markdown` (default), `XML`, and `JSON`.
- 🤖 **Custom Prompts & Auto-Injection**: Manage instructions like "Code Review" or "Refactor". Automatically append patch-formatting instructions to your prompts.
- 🌐 **DocGraph Relation Suggestion (Desktop Only)**: When selecting documentation files (like Markdown), automatically suggests related documents with a **`Related`** badge (green) based on the DocGraph knowledge graph (`.docgraph/graph.db`).
- 🌍 **Full Localization (i18n)**: UI fully localized for both English and Japanese.

## 🚀 Usage

### Desktop distribution

Windows Desktop executables are distributed through GitHub Releases. Use a `desktop-v*` tag for Desktop releases.

```powershell
git tag desktop-v0.8.7
git push origin desktop-v0.8.7
```

To create the executable locally, run `npm run desktop:package`. `npm run desktop:build` only updates the application bundles and does not create an executable. The generated file is `dist-desktop/CodePrepDesktop.exe`.

Existing VSIX releases used `v*` tags, but no further VSIX updates are planned.

### 🌐 DocGraph Integration (Desktop Only)

Enabling `Include related docs (DocGraph)` in the output config panel triggers automatic search for related documents when checking Markdown files.
The `docgraph` executable is resolved in the following priority:
1. Environment variable `CODEPREP_DOCGRAPH_PATH`
2. App relative folder (`docgraph.exe` / `docgraph` in the same directory as the executable)
3. System `PATH`

**Prompt Generation Flow:**
1. Click the **CodePrep** icon in the Activity Bar.
2. Check the files you want to send to the LLM in the tree view.
3. (Optional) Click `Select Prompt` and choose an instruction (e.g., "Patch Mode").
4. Run `Generate & Copy`. The content is copied to the clipboard and opened in a new editor.

**Patch Application Flow (AI Response Integration):**
1. Copy one or more code blocks from the AI's response (including the file path and `// ... existing code ...`).
2. Click the **"+" icon (Preview Patch from Clipboard)** in the CodePrep sidebar.
3. Diff editors for all detected files will open in separate tabs. Review the changes and click **"Apply"** in the top right of each tab.

## ⚙️ Extension Settings

### 🩹 Patch & Heal Settings
| Key                                   | Default | Description                                                                         |
| ------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `codeprep.alwaysAddPatchInstructions` | `true`  | Automatically append patch formatting instructions to the end of generated prompts. |

### 🎨 UI & Output Settings
| Key                          | Default      | Description                                      |
| ---------------------------- | ------------ | ------------------------------------------------ |
| `codeprep.outputFormat`      | `"markdown"` | Output format: `"markdown"`, `"xml"`, `"json"`.  |
| `codeprep.openAfterGenerate` | `true`       | Open the generated content in a new editor tab.  |
| `codeprep.visibleButtons`    | `[...]`      | Customize visible buttons in the view title bar. |

## ⌨️ Commands

- `CodePrep: Preview Patch from Clipboard` - Parse clipboard and preview patches.
- `CodePrep: Apply Patch` - Apply pending changes to files.
- `CodePrep: Open Settings` - Open extension settings.
- `CodePrep: Select All` / `Clear All` - Select or deselect all files.
- `CodePrep: Select Prompt` - Choose a custom prompt to insert.
- `CodePrep: Generate & Copy` - Generate pack, copy to clipboard, and open in editor.

---

## 🆕 What's New

### v0.6.0 (2026-05-04)
- 🩹 **Autonomous Patch & Heal**:
    - **Batch Patching**: Automatically parses multiple code blocks from the clipboard and opens all target files in separate tabs.
    - **Intelligent Merge**: Restores code omissions like `# ... existing code ...` using fuzzy matching and anchor points.
    - **Recursive Directory Creation**: Automatically creates new files and their parent directories (mkdir -p) as suggested by the AI.
    - **VSCode Diff Preview**: Visually verify changes in a split editor before applying them.
- 🤖 **Prompt Auto-Injection**:
    - Automatically append "formatting instructions for patching" to every prompt, ensuring AI responses are always tool-compatible.
- 🌍 **Full i18n Refactoring**:
    - Refactored `package.json` to use NLS variables. UI is now fully localized for English and Japanese environments.
- 🧹 **Streamlined UI**:
    - Removed unused preset features to prioritize core actions like patching and prompt selection.

---

## 🏗️ Architecture & Development Standards

This project follows strict **DDD (Domain-Driven Design)** and **"God-Class Killer"** policies (150 lines/file, 15 lines/method).
See `AGENTS.md` for more details.