## Cost-aware Gemini routing

For repository and engineering work, use the `gemini-lean-routing` skill when applicable.

- Prefer deterministic tools before model reasoning.
- Do not spawn a subagent for a single trivial tool call when direct execution is cheaper.
- Delegate repetitive, read-heavy, high-volume, or structured extraction work to `cheap-ops`.
- Delegate tiny exact edits to `cheap-edit`.
- Delegate small pattern-following implementation to `cheap-coder`.
- Use `reviewer` or the parent for reasoning-heavy review.
- Architectureや曖昧な仕様判断は親モデルで処理する。
- Cheap agentは推測せず、必要なら `ESCALATE` する。