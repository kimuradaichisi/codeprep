# CodePrep Claude Code Instructions

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
