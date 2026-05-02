# 📦 CodePrep for VSCode

**CodePrep** is a powerful VSCode extension designed to efficiently extract your workspace's codebase and generate the optimal context (prompts) for LLMs like ChatGPT, Claude, and GitHub Copilot.

Beyond intuitive file tree selection, it seamlessly integrates into your workflow with features like **automatic selection based on Git history** and extraction of related test files.

## ✨ Key Features

- 🌳 **Intuitive Tree Selection**: Select files/folders via checkboxes in a dedicated sidebar.
- 🔍 **Git Diff Selection**: Extract changed files and their related tests with one click.
- 📊 **Real-time Token Counting**: Displays estimated token counts in the status bar with overflow warnings.
- 📝 **Flexible Output Formats**: Supports `Markdown` (default), `XML`, and `JSON`.
- ✂️ **Context Optimization**: Option to remove comments and empty lines to save LLM tokens.
- 💾 **Clean Workspace**: Results are opened in an **Untitled editor**, not saved as physical files, keeping your project clutter-free.
- 🤖 **Custom Prompts**: Manage and insert instructions like "Code Review" or "Refactor" at the top of the output.
- 🖱️ **Explorer Integration**: Add files to CodePrep directly from the VSCode standard explorer context menu.

## 🚀 Usage

**Basic Flow:**
1. Click the **CodePrep** icon in the Activity Bar.
2. Check the files you want to send to the LLM in the tree view, or use the `Git Actions` menu to select modified files.
3. (Optional) Click `Select Prompt` to choose an instruction (e.g., "Refactor").
4. Run the `Generate & Copy` command.
5. The generated text is copied to your clipboard and opened in a **new Untitled editor tab** for instant review.

## ⚙️ Extension Settings

### 🎨 UI & Output
| Key | Default | Description |
|-----|---------|-------------|
| `codeprep.outputFormat` | `"markdown"` | Output format: `"markdown"`, `"xml"`, or `"json"`. |
| `codeprep.openAfterGenerate` | `true` | Opens the content in a new Untitled editor after generation. |

### ⚡ Engine & Optimization
| Key | Default | Description |
|-----|---------|-------------|
| `codeprep.nativeEngine.removeComments` | `false` | Automatically remove comments from the output. |
| `codeprep.nativeEngine.includeEmptyLines` | `true` | Whether to include blank lines in the output. |

## 🏗️ Architecture & Development Standards

This project is built on strict **DDD (Domain-Driven Design)** and a unique **"God-Class Killer" policy** to ensure long-term maintainability.

### Core Philosophy
1. **VSCode API Isolation**: `import 'vscode'` is forbidden in Domain/Application layers. Communication happens via Adapters in the Infrastructure layer.
2. **Quantitative Constraints**:
   - Max **150 lines** per file.
   - Max **15 lines** per method.
   - Cyclomatic complexity **under 5**.
3. **Zero "Any" Policy**: All external inputs are validated with Type Guards.
4. **Test-Driven**: 100% unit test pass rate with Vitest is mandatory.

## 🆕 What's New

### v0.5.0 (2026-05-02)
- 🤖 **Intelligent Prompt Variables**: Variables like `{{language}}`, `{{datetime}}`, and `{{tree}}` (file tree) are now automatically replaced within custom prompts.
- 🛡️ **Big File Guard**: Files exceeding a specified size (default 500KB) are automatically omitted to prevent freezes and out-of-memory issues when sending data to LLMs.

### v0.4.0 (2026-05-02)
- ⚡ **Dramatic Performance Boost**: Migrated the search engine to VSCode's built-in ripgrep (`vscode.executeTextSearch`), enabling instant searches even in projects with thousands of files.
- 🔄 **Asynchronous Git Status Caching**: Introduced `GitWatcher` to handle Git status updates in the background, improving UI responsiveness.
- 🌳 **Faster Tree Rendering**: Optimized the exclusion logic with pre-compiled patterns for smooth browsing in large-scale repositories.
- 🎨 **UI Enhancements**: Added dedicated icons (`git-commit`) and decoration colors for Git-modified files. Toolbar buttons can now be fully toggled via settings.
- 🛠️ **Internal Quality**: Reduced redundant activation events and resolved all ESLint warnings.