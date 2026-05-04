# 📦 CodePrep for VSCode

**CodePrep** is a powerful VSCode extension designed to efficiently extract code from your workspace and generate the optimal context (prompts) for LLMs like ChatGPT, Claude, and GitHub Copilot.

Beyond intuitive file selection, it features **Autonomous Patch & Heal** for safely integrating AI-generated code and automatic selection based on Git history.

## ✨ Key Features

- 🌳 **Intuitive Tree Selection**: Select files/folders via checkboxes in a dedicated sidebar.
- 🩹 **Autonomous Patch & Heal**: Automatically parse AI-generated code (even with omissions like `// ... existing code ...`) from the clipboard and merge it intelligently. Preview changes in the VSCode Diff editor before applying.
- 🔍 **Git Diff Selection**: Extract modified files and related tests with a single click.
- 📊 **Real-time Token Counting**: View estimated token counts in the status bar with over-limit warnings.
- 📝 **Flexible Output Formats**: Supports `Markdown` (default), `XML`, and `JSON`.
- 🤖 **Custom Prompts & Auto-Injection**: Manage instructions like "Code Review" or "Refactor". Automatically append patch-formatting instructions to your prompts.
- 🌍 **Full Localization (i18n)**: UI fully localized for both English and Japanese.

## 🚀 Usage

**Prompt Generation Flow:**
1. Click the **CodePrep** icon in the Activity Bar.
2. Check the files you want to send to the LLM in the tree view.
3. (Optional) Click `Select Prompt` and choose an instruction (e.g., "Patch Mode").
4. Run `Generate & Copy`. The content is copied to the clipboard and opened in a new editor.

**Patch Application Flow (AI Response Integration):**
1. Copy the code block from the AI's response (including the file path and `// ... existing code ...`).
2. Click the **"+" icon (Preview Patch from Clipboard)** in the CodePrep sidebar.
3. Review the changes in the Diff editor and click **"Apply"** in the top right.

## ⚙️ Extension Settings

### 🩹 Patch & Heal Settings
| Key | Default | Description |
|-----|---------|-------------|
| `codeprep.alwaysAddPatchInstructions` | `true` | Automatically append patch formatting instructions to the end of generated prompts. |

### 🎨 UI & Output Settings
| Key | Default | Description |
|-----|---------|-------------|
| `codeprep.outputFormat` | `"markdown"` | Output format: `"markdown"`, `"xml"`, `"json"`. |
| `codeprep.openAfterGenerate` | `true` | Open the generated content in a new editor tab. |
| `codeprep.visibleButtons` | `[...]` | Customize visible buttons in the view title bar. |

## 🆕 What's New

### v0.6.0 (2026-05-04)
- 🩹 **Autonomous Patch & Heal**:
    - Intelligently merge AI-generated code with omissions like `# ... existing code ...` into your local files.
    - **Multiple Omissions**: Accurately restores code even with multiple omissions in a single file using anchor points.
    - **VSCode Diff Preview**: Visually verify changes in a split editor before applying them.
    - **Automatic File Creation**: Automatically creates new files and parent directories suggested by the AI.
- 🤖 **Prompt Auto-Injection**:
    - Automatically append "formatting instructions for patching" to every prompt, ensuring AI responses are always tool-compatible.
- 🌍 **Full i18n Refactoring**:
    - Refactored `package.json` to use NLS variables. UI is now fully localized for English and Japanese environments.
- 🧹 **Streamlined UI**:
    - Removed unused preset features to prioritize core actions like patching and prompt selection.

---

## 🏗️ Architecture & Development Standards

This project follows strict **DDD (Domain-Driven Design)** and **"God-Class Killer"** policies (150 lines/file, 15 lines/method).
See `AI_AGENTS.md` for more details.