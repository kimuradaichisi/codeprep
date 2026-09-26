# CodePrep CLI Reference

> **NOTE:** This document is automatically generated from the Canonical Command Catalog.
> Do not edit manually. Run `npm run cli:docs` to regenerate, or `npm run cli:docs:check` to verify.

## Recommended Agent Flow

When an AI Agent starts working on a task in a workspace, follow this standard sequential pattern:

```bash
# 1. Discover available commands and capabilities
codeprep commands --json

# 2. Inspect workspace binding and index readiness
codeprep status --format json

# 3. Check knowledge base statistics if using graph features
codeprep knowledge status --format json

# 4. Prepare task-specific context projection or candidates
codeprep context prepare --task "<your task description>" --format json

# 5. (Optional) Build bounded context pack for selected files
codeprep context pack --task "<task>" --file "<file1>" --file "<file2>" --format json
```

---

## Command Catalog Summary

| Command | Category | Purpose | MCP Equivalent |
| :--- | :--- | :--- | :--- |
| `codeprep commands` | `system` | List all available CodePrep CLI commands and their canonical metadata. | - |
| `codeprep status` | `repository` | Inspect workspace binding, repository scan, knowledge index, and semantic index state. | `codeprep_workspace_status` |
| `codeprep knowledge status` | `knowledge` | Inspect knowledge graph store statistics and snapshot details. | - |
| `codeprep context prepare` | `context` | Prepare task-oriented context (Context Projection, Context Pack v2, or candidate entry points). | `codeprep_prepare_context` |
| `codeprep context pack` | `context` | Build a bounded task context pack for specified file entry points. | `codeprep_build_context_pack` |

---

## Detailed Command Specifications

### `codeprep commands`

**Purpose:** List all available CodePrep CLI commands and their canonical metadata.

Self-discovery interface for AI agents and human operators. Can output formatted terminal table or structured JSON.

**Syntax:** `codeprep commands [options]`

**Category:** `system`
**Default Output Format:** `text` (Supported: `text`, `json`)

#### Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--json` | `boolean` | - | Output machine-readable catalog as structured JSON (alias for --format json). |
| `--format` | `string` | `text` | Output format (json, text). |

#### Exit Codes

| Code | Meaning | Description |
| :--- | :--- | :--- |
| `0` | `SUCCESS` | Command executed successfully. |
| `1` | `UNEXPECTED_FAILURE` | Internal runtime error or unhandled exception. |
| `2` | `INVALID_ARGUMENTS` | Missing required options or invalid argument values. |
| `5` | `REPOSITORY_UNAVAILABLE` | Target workspace directory not found or unreadable. |

#### Examples

- **Discover all commands as JSON for automated agent planning**:
  ```bash
  codeprep commands --json
  ```
- **View human-readable command list**:
  ```bash
  codeprep commands
  ```

---

### `codeprep status`

**Purpose:** Inspect workspace binding, repository scan, knowledge index, and semantic index state.

Validates repository accessibility and reports readiness of structural/semantic knowledge stores. Parity with MCP codeprep_workspace_status.

**Syntax:** `codeprep status [options]`

**Category:** `repository`
**Default Output Format:** `json` (Supported: `json`, `text`)
**MCP Equivalent:** `codeprep_workspace_status` (Shared UseCase: `checkMcpStatus`)

#### Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--workspace`, `-w` | `string` | - | Target workspace root directory (default: current directory). |
| `--format` | `string` | `json` | Output format (json, text). |
| `--output`, `-o` | `string` | - | File path to save the output. |
| `--quiet` | `boolean` | - | Suppress non-essential progress output on stderr. |

#### Exit Codes

| Code | Meaning | Description |
| :--- | :--- | :--- |
| `0` | `SUCCESS` | Command executed successfully. |
| `1` | `UNEXPECTED_FAILURE` | Internal runtime error or unhandled exception. |
| `2` | `INVALID_ARGUMENTS` | Missing required options or invalid argument values. |
| `5` | `REPOSITORY_UNAVAILABLE` | Target workspace directory not found or unreadable. |

#### Examples

- **Check workspace readiness as JSON**:
  ```bash
  codeprep status
  ```
- **Check workspace readiness as plain text**:
  ```bash
  codeprep status --format text
  ```

---

### `codeprep knowledge status`

**Purpose:** Inspect knowledge graph store statistics and snapshot details.

Reports SQLite knowledge database presence, node count, relation count, and snapshot metadata.

**Syntax:** `codeprep knowledge status [options]`

**Category:** `knowledge`
**Default Output Format:** `json` (Supported: `json`, `text`)

#### Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--workspace`, `-w` | `string` | - | Target workspace root directory (default: current directory). |
| `--format` | `string` | `json` | Output format (json, text). |
| `--output`, `-o` | `string` | - | File path to save the output. |
| `--quiet` | `boolean` | - | Suppress stderr diagnostics. |

#### Exit Codes

| Code | Meaning | Description |
| :--- | :--- | :--- |
| `0` | `SUCCESS` | Command executed successfully. |
| `1` | `UNEXPECTED_FAILURE` | Internal runtime error or unhandled exception. |
| `2` | `INVALID_ARGUMENTS` | Missing required options or invalid argument values. |
| `5` | `REPOSITORY_UNAVAILABLE` | Target workspace directory not found or unreadable. |

#### Examples

- **Inspect knowledge DB status**:
  ```bash
  codeprep knowledge status
  ```

---

### `codeprep context prepare`

**Purpose:** Prepare task-oriented context (Context Projection, Context Pack v2, or candidate entry points).

Primary agent context entry point. Analyzes task goals, scores relevant repository files, and generates structured context.

**Syntax:** `codeprep context prepare [options]`

**Category:** `context`
**Default Output Format:** `json` (Supported: `json`, `markdown`)
**MCP Equivalent:** `codeprep_prepare_context` (Shared UseCase: `PrepareContextProjectionUseCase`)
**Legacy Aliases:** `codeprep context`

#### Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--task` | `string` | - | Task or bug description (required unless --task-file or --stdin is used). |
| `--task-file` | `string` | - | Path to a file containing the task description. |
| `--goal` | `string` | - | Explicit goal description (synonym for --task). |
| `--stdin` | `boolean` | - | Read task description from standard input. |
| `--format` | `string` | `json` | Output format (json, markdown). |
| `--strategy` | `string` | - | Preparation strategy (knowledge, standard, fast). |
| `--pack` | `boolean` | - | Include packed file contents alongside candidate metadata. |
| `--projection` | `boolean` | - | Output structured ContextProjection (when strategy=knowledge). |
| `--intent` | `string` | `change` | Context intent mode. |
| `--scope` | `string` | `auto` | Scope restriction (auto, repo, dir, file, feature). |
| `--scope-target` | `string` | - | Target path or feature name for scoped searches. |
| `--file`, `--anchor-file` | `string` | - | Anchor file path (can be specified multiple times). |
| `--symbol`, `--anchor-symbol` | `string` | - | Anchor symbol name (can be specified multiple times). |
| `--max-files` | `number` | - | Maximum number of candidate files to return. |
| `--max-tokens` | `number` | - | Budget token limit for packaged content. |
| `--workspace`, `-w` | `string` | - | Target workspace root directory. |
| `--output`, `-o` | `string` | - | Write output directly to file path. |
| `--quiet` | `boolean` | - | Suppress non-essential progress output on stderr. |

#### Exit Codes

| Code | Meaning | Description |
| :--- | :--- | :--- |
| `0` | `SUCCESS` | Command executed successfully. |
| `1` | `UNEXPECTED_FAILURE` | Internal runtime error or unhandled exception. |
| `2` | `INVALID_ARGUMENTS` | Missing required options or invalid argument values. |
| `5` | `REPOSITORY_UNAVAILABLE` | Target workspace directory not found or unreadable. |
| `3` | `KNOWLEDGE_MISSING` | Knowledge database not found when strategy="knowledge" requested. |
| `4` | `KNOWLEDGE_STALE` | Knowledge snapshot is stale or needs refresh. |
| `6` | `ENTITY_NOT_FOUND` | Specified file or symbol anchor could not be located. |

#### Examples

- **Prepare context for a change task in JSON**:
  ```bash
  codeprep context prepare --task "Fix payment retry policy"
  ```
- **Prepare context using knowledge subgraph projection**:
  ```bash
  codeprep context prepare --task "Optimize checkout" --strategy knowledge --projection
  ```
- **Prepare context via pipeline from stdin**:
  ```bash
  echo "Add validation to user auth" | codeprep context prepare --stdin
  ```

---

### `codeprep context pack`

**Purpose:** Build a bounded task context pack for specified file entry points.

Packages specified files with dependencies and budgets into a structured context bundle. Parity with MCP codeprep_build_context_pack.

**Syntax:** `codeprep context pack [options]`

**Category:** `context`
**Default Output Format:** `json` (Supported: `json`, `markdown`)
**MCP Equivalent:** `codeprep_build_context_pack` (Shared UseCase: `BuildTaskContextUseCase`)

#### Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--task` **(required)** | `string` | - | Task or bug description. |
| `--file`, `-f` **(required)** | `string` | - | Relative path of file to pack (can be specified multiple times). |
| `--token-limit` | `number` | - | Token budget for context pack (default: 40000). |
| `--strategy` | `string` | `auto` | Packaging strategy (auto, fast, standard, expanded). |
| `--format` | `string` | `json` | Output format (json, markdown). |
| `--workspace`, `-w` | `string` | - | Target workspace root directory. |
| `--output`, `-o` | `string` | - | Write output directly to file path. |
| `--quiet` | `boolean` | - | Suppress non-essential progress output on stderr. |

#### Exit Codes

| Code | Meaning | Description |
| :--- | :--- | :--- |
| `0` | `SUCCESS` | Command executed successfully. |
| `1` | `UNEXPECTED_FAILURE` | Internal runtime error or unhandled exception. |
| `2` | `INVALID_ARGUMENTS` | Missing required options or invalid argument values. |
| `5` | `REPOSITORY_UNAVAILABLE` | Target workspace directory not found or unreadable. |

#### Examples

- **Build context pack for explicit files**:
  ```bash
  codeprep context pack --task "Refactor checkout" --file src/checkout.ts
  ```

---

