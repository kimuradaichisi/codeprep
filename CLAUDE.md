# CodePrep AI Agent Instructions (Claude Code & Gemini / Antigravity Agent)

## Mechanized Development Workflow (Canonical Policy)
Development execution and quality verification MUST follow [.agents/MECHANIZED_DEVELOPMENT_WORKFLOW.md](file:///D:/git/codeprep/.agents/MECHANIZED_DEVELOPMENT_WORKFLOW.md).
Prefer harness commands (`npm run dev:phase:start`, `npm run dev:verify`, `npm run dev:eval`, `npm run dev:phase:finish`) over manually repeating deterministic verification steps.

## Repository Context with CodePrep

When the implementation area is unclear, use CodePrep before broad repository exploration.

Run:
```bash
npm run context -- --task "<current task>" --format json
```
(Add `--pack` if you need the full auto-packaged context content directly).

Rules:
1. Treat CodePrep output as investigation guidance, not as an authoritative conclusion.
2. Inspect the recommended files and evidence directly before making behavioral claims.
3. Perform targeted follow-up investigation when CodePrep evidence is incomplete.
4. Do not broadly re-explore the repository after sufficient context is available.
5. Do not invoke CodePrep mechanically when the exact target files are already known.
6. CodePrep CLI is an adapter over the current repository-context Application UseCases; do not treat CLI success as proof that newly modified analysis logic is correct.

## CodePrep MCP Guidance
When CodePrep MCP server is available:

1. **Use CodePrep discovery before broad manual repository exploration** when repository context is not already obvious.
2. **Inspect Context Confidence** returned by `codeprep_discover_entry_points`.
3. **HIGH confidence:** Prefer **Fast Pack** (`strategy: "fast"`) and avoid redundant broad repository reads.
4. **MEDIUM confidence:** Use **Standard Pack** (`strategy: "standard"`).
5. **LOW confidence:** Inspect candidates/evidence and use **Expanded Pack** (`strategy: "expanded"`).
6. **Do not repeat broad grep/read exploration** when the context pack already resolves the information need.
7. **Perform additional reads only for a concrete missing fact.**

> Note: Do not automatically call every MCP tool unconditionally on simple or self-evident tasks.
