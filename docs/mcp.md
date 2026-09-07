# CodePrep MCP Server (Phase 5A)

CodePrep MCP Server provides Model Context Protocol (MCP) context and candidate discovery tools for external coding agents (Claude, Cline, Cursor, Roo-Code, etc.).

## 1. Overview

CodePrep MCP Server exposes three tools over the standard stdio transport:
- **codeprep_workspace_status**: Check workspace root binding, repository file scan status, structured knowledge index state, and semantic index state.
- **codeprep_discover_entry_points**: Discover entry point candidates based on task descriptions, ranked with deterministic search, semantic similarity, and enriched with native structural evidence (dependencies, related tests, co-change).
- **codeprep_build_context_pack**: Generate a token-budget bounded Context Pack and manifest for explicit entry points chosen by caller or human.

> **Zero LLM Inside:** CodePrep itself does not invoke any generative LLM or cross-encoders. It operates purely as an efficient repository context and evidence delivery engine.
> **Human/Caller in the Loop:** CodePrep suggests candidates with evidence; the caller decides which entry points to package into the final context.

---

## 2. Production Build & Launch

### Prerequisites
- Node.js >= 18
- Ripgrep (g) installed and available in PATH (optional but recommended)

### Build
Compile the MCP server into standalone production artifacts:
`ash
npm run mcp:build
`
This builds dist-mcp/index.js.

### Production Launch Command
The canonical, production-safe launch command for MCP clients is:
`ash
node dist-mcp/index.js --workspace <path-to-workspace>
`
*(For development convenience, 
pm run mcp -- --workspace <path-to-workspace> is also supported).*

---

## 3. Configuring MCP Clients

### Claude Desktop (claude_desktop_config.json)
`json
{
   mcpServers: {
    codeprep: {
      command: node,
      args: [
        D:/git/codeprep/dist-mcp/index.js,
        --workspace,
        D:/git/my-project
      ]
    }
  }
}
`

### Generic MCP Client (e.g. Cursor, Cline, Roo-Code)
- **Command:** 
ode
- **Args:** [D:/git/codeprep/dist-mcp/index.js, --workspace, /absolute/path/to/target/project]
- **Transport:** Standard input/output (stdio)

---

## 4. Tool Specifications

### 1. codeprep_workspace_status
- **Description:** Inspect current workspace binding, index statuses, and diagnostic info.
- **Input:** None ({})
- **Output:**
`json
{
  workspaceRoot: D:/git/my-project,
  workspaceBound: true,
  repositoryIndex: ready,
  knowledgeIndex: ready,
  semanticIndex: ready,
  diagnostics: []
}
`
*(Note: If the local embedding provider is unavailable, semanticIndex will report "degraded with explanatory diagnostic message, while epositoryIndex and knowledgeIndex remain "ready).*

### 2. codeprep_discover_entry_points
- **Description:** Discover and rank entry point candidates with native structural evidence.
- **Input Schema:**
  - 	ask (string, required): Task description or issue text.
  - maxCandidates (number, optional, default: 10): Maximum candidates to return.
  - nrichTopN (number, optional, default: 5): Number of top candidates to enrich with structural evidence.
- **Output:**
`json
{
  task: Fix duplicate refund calculation in order service,
  candidates: [
    {
      relativePath: src/order/OrderService.ts,
      discoveryScore: 85,
      supportScore: 40,
      reasons: [symbolLikeMatch, semanticMatch],
      matchedTerms: [refund, order],
      evidence: [
        {
          kind: dependency,
          relatedPath: src/payment/RefundCalculator.ts,
          detail: direct dependency: src/payment/RefundCalculator.ts
        },
        {
          kind: relatedTest,
          relatedPath: tests/OrderService.test.ts,
          detail: matching test file: tests/OrderService.test.ts
        }
      ]
    }
  ],
  warnings: []
}
`

### 3. codeprep_build_context_pack
- **Description:** Build a bounded task context pack with manifest and formatted code context.
- **Input Schema:**
  - 	ask (string, required): Task prompt / instruction.
  - selectedEntryPoints (array of strings, required): Chosen relative paths.
  - tokenLimit (number, optional, default: 40000): Token limit budget.
- **Output:**
`json
{
  manifest: {
    projectId: mcp-workspace,
    task: Fix duplicate refund calculation in order service,
    entryPoints: [src/order/OrderService.ts],
    entries: [
      {
        projectId: mcp-workspace,
        relativePath: src/order/OrderService.ts,
        role: target,
        packMode: full,
        score: 100
      }
    ],
    budget: {
      bytes: 1240,
      estimatedTokens: 310,
      limit: 40000,
      withinLimit: true
    }
  },
  content: # Context Manifest\n...\n# File: src/order/OrderService.ts\n...,
  warnings: []
}
`

---

## 5. Security & Isolation Guarantee
- **Realpath & Symlink Verification:** In addition to lexical normalization, ealpath resolution verifies that neither symlinks, directory junctions, nor relative traversals (..) can escape the bound workspace root.
- **Repository Read-Only:** All 3 MCP tools are strictly read-only; no write or mutation is accessible.
- **Pure STDIO Stream:** stdout is exclusively dedicated to JSON-RPC protocol bytes. Startup banners, logs, and error traces are routed to stderr with zero protocol pollution.
