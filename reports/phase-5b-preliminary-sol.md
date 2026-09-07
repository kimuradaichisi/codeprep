# Phase 5B Preliminary Evaluation (GPT-5.6 Sol)

> **STATUS: PRELIMINARY / EXCLUDED_FROM_PRIMARY_ANALYSIS**
> 
> This dataset was executed with **GPT-5.6 Sol** before the cost correction protocol.
> Due to high operational cost and polling overhead, these trials are **strictly excluded** from the primary A/B aggregate.
> The primary evaluator model has been changed to **GPT-5.6 Luna**.

## Environment
- **Agent:** Codex CLI 0.145.0
- **Model:** GPT-5.6 Sol (gpt-5.6-sol)
- **Reasoning Effort:** high
- **Repository Commit:** af8ea94
- **Date:** 2026-09-07

## Recorded Preliminary Trials

| Task | Condition | Explore Before Edit | Post-Pack Calls | Files Read | Entry Point Correct | Total Calls | Gate Result | Sufficiency |
|---|---|---:|---:|---:|---|---:|---|---|
| TASK-01 | baseline | 0 | 0 | 0 | NO | 16 | PASS | - |
| TASK-01 | codeprep | 0 | 0 | 0 | YES | 54 | PASS | SUFFICIENT |
| TASK-02 | codeprep | 0 | 0 | 0 | YES | 16 | PASS | SUFFICIENT |

## Notes & Observations
1. **TASK-01 (small bug fix):**
   - Baseline executed **0** exploration calls before first edit, reading **0** files.
   - CodePrep condition reduced exploration calls before edit to **0**, with **0** post-pack calls and **0** manual file read.
2. **TASK-02 (new parameter in domain/app):**
   - CodePrep condition executed **0** exploration calls before edit with **0** post-pack calls.
3. **Termination Reason:**
   - Evaluator cost per task under GPT-5.6 Sol was unsustainable for 16–24 full trials.
   - Polling loop overhead consumed excessive agent turns.
   - Execution stopped and reset to start fresh with **GPT-5.6 Luna**.
