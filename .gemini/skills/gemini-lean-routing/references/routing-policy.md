# Routing Policy Reference

Use this table when the correct route is not obvious.

| Work characteristic | Route |
|---|---|
| One exact tool call | Parent direct tool |
| Many read/search operations, no judgment | `cheap-ops` |
| Large input, structured extraction/classification | `cheap-ops` |
| Tiny exact edit, explicit desired output | `cheap-edit` |
| Existing code pattern + small bounded implementation | `cheap-coder` |
| Regression/correctness review needing interpretation | `reviewer` |
| Architecture, requirements, security, migration, concurrency | Parent |

## Prefer Flash-Lite when

All or nearly all of these are true:

- expected result is easy to describe;
- scope is bounded;
- little or no business interpretation is required;
- evidence can be returned compactly;
- failure is cheap to detect;
- deterministic verification exists;
- the task can safely stop on ambiguity.

## Do not use Flash-Lite merely because

- the input is short;
- the code change appears visually small;
- the parent model is expensive;
- the user asked for speed;
- the issue sounds routine.

A one-line authentication change may require more judgment than a 30-file mechanical rename.

## Escalation indicators

Escalate on:

- competing interpretations;
- hidden side effects;
- ownership uncertainty;
- new domain behavior;
- public contract changes;
- persistence/schema changes;
- permission or security changes;
- transactional/concurrent/distributed behavior;
- unexplained failing verification.
