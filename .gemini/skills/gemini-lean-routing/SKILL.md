---
name: gemini-lean-routing
description: Cost-aware routing for Gemini CLI repository work. Use when the user asks to explore code, search or read many files, make small edits, refactor, implement a bounded change, review code, or otherwise minimize model cost. Route clear repetitive low-judgment work to Gemini 2.5 Flash-Lite subagents, bounded implementation to Flash, and keep architecture, ambiguity, difficult debugging, security, migrations, and cross-cutting decisions in the parent model.
---

# Gemini Lean Routing

Minimize expensive-model usage without increasing rework.

Use this order:

1. ELIMINATE unnecessary work.
2. DETERMINISTIC first: glob, grep, exact reads, shell commands, parser, formatter, linter, tests, static analysis.
3. ROUTE bounded work to the cheapest capable subagent.
4. REASON in the parent only when judgment is required.
5. VERIFY mechanically whenever possible.

## Core routing rule

Choose the lowest-cost route that can complete the task safely.

- `cheap-ops`: `gemini-2.5-flash-lite`. Read-oriented exploration, large scans, extraction, classification, inventories, locating symbols, summarizing evidence.
- `cheap-edit`: `gemini-2.5-flash-lite`. Tiny exact edits with explicit target and expected result.
- `cheap-coder`: `gemini-2.5-flash`. Small pattern-following implementation or local refactoring with clear acceptance criteria.
- `reviewer`: inherited parent model. Bounded correctness, regression, risk, and verification review.
- Parent: architecture, ambiguous requirements, difficult debugging, security-sensitive behavior, migrations, concurrency, transactions, and cross-cutting decisions.

Read `references/routing-policy.md` when classification is unclear.

## Do not spawn an agent for one trivial operation

A subagent call has its own prompt and model turn.

For one exact operation such as:

```text
glob one filename pattern
read one known small file
run one exact test command
grep one literal string
```

prefer direct deterministic tooling from the parent.

Delegate when one or more are true:

- several searches or reads are expected;
- many files are involved;
- input/output volume is large;
- the same action repeats across files;
- the result can be summarized before returning to the parent;
- implementation is bounded and mechanically verifiable;
- performing the work in the parent would consume substantial context.

## Cheap-agent contract

Every Flash-Lite delegation must include:

1. a narrow goal;
2. explicit scope;
3. expected output shape;
4. what the agent must not decide;
5. an escalation condition;
6. evidence requirements.

Example:

```text
Use cheap-ops.
Find every call site of FooService.save.
Return path + symbol/line + one-line purpose.
Do not redesign anything.
If ownership or behavior is ambiguous, return ESCALATE with evidence.
```

## Escalation contract

Flash-Lite agents must not reason through material ambiguity.

Return:

```text
ESCALATE
Reason: ...
Evidence: ...
Smallest next question/decision: ...
```

Escalate when any of these appear:

- missing or contradictory requirements;
- multiple materially different valid behaviors;
- public API or persistence semantics may change;
- security/auth/privacy/permission logic is involved;
- schema or data migration is involved;
- concurrency, ordering, transaction, or distributed-state reasoning is central;
- ownership crosses multiple modules/domains and is unclear;
- a failing test cannot be explained from local evidence;
- a new business rule would have to be invented;
- delegated scope must materially expand.

## Task levels

### L0 — deterministic/direct

No subagent unless volume makes delegation worthwhile.

Examples:

- exact `grep_search`;
- `glob` one pattern;
- read one known file;
- run a named formatter/test command;
- make an already-specified one-line change.

### L1 — Flash-Lite

Use `cheap-ops` or `cheap-edit`.

Examples:

- scan a repository for symbols/patterns;
- inventory relevant files;
- extract repeated facts;
- summarize a large set of files or findings;
- classify files/findings by an explicit rule;
- exact replacement in named files;
- mechanical docs/config normalization.

### L2 — Flash

Use `cheap-coder`.

Examples:

- add a small adapter matching nearby adapters;
- write straightforward tests matching existing tests;
- perform a local behavior-preserving refactor;
- add a small CLI option using an established pattern;
- implement a small well-specified change.

### L3 — reviewer / parent

Use stronger reasoning.

Examples:

- diagnose a non-obvious regression;
- inspect meaningful side effects;
- validate a non-trivial change before merge;
- resolve conflicting evidence.

### L4 — parent only

Examples:

- architecture and boundary design;
- ambiguous requirements;
- data-model or persistence strategy;
- auth/security-sensitive decisions;
- concurrency/distributed failure analysis;
- broad redesign or migration strategy.

## Parent workflow

```text
Task
  -> eliminate?
  -> deterministic tool?
  -> narrow + repetitive + low judgment?
       -> cheap-ops / cheap-edit (Flash-Lite)
  -> bounded implementation?
       -> cheap-coder (Flash)
  -> bounded review?
       -> reviewer
  -> otherwise parent
  -> deterministic verification
  -> parent synthesis
```

## Parent context policy

Prefer compact subagent results:

```text
RESULT
Files: ...
Symbols: ...
Findings: ...
Commands/tools used: ...
Changes: ...
Verification: ...
Uncertainty: none | ...
```

Do not re-read all source files after a subagent has returned enough evidence. Read only the pieces necessary for the final judgment.

## Verification

Prefer deterministic checks over another LLM call:

1. targeted test;
2. formatter/lint/type/static checks for touched scope;
3. focused diff inspection;
4. broader test suite only when impact warrants it.

## Retry policy

If Flash-Lite fails because the task is ambiguous, escalate immediately.

If it fails because of a mechanical/tool issue, narrow or reframe the task once and retry once. Do not repeatedly burn cheap calls on a task that actually needs reasoning.

## Success criteria

Optimize for:

- parent-model context reduced;
- high-volume reads delegated;
- unnecessary subagent spawns avoided;
- Flash-Lite tasks remain narrow;
- escalation occurs before guessing;
- deterministic verification passes;
- rework does not increase.
