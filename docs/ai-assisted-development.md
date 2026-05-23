# AI-assisted Development

CodePrep was developed primarily with AI coding assistance.

## Development Policy

- AI tools were used to generate, refactor, and test large portions of the codebase.
- The maintainer reviewed the generated code before publication.
- Automated tests are used to reduce regression risk.
- AI-generated code is treated as implementation assistance, not as a substitute for review.

## Maintainer Responsibility

Even though AI tools were used heavily, the maintainer is responsible for:

- reviewing behavior
- running tests
- checking for secrets
- checking dependency licenses
- reviewing safety-sensitive behavior
- documenting limitations

## Known Risks

AI-generated code may:

- contain hidden bugs
- resemble existing implementations
- miss edge cases
- introduce security issues
- produce overly complex abstractions
- fail in platform-specific environments

## User Guidance

Before using CodePrep in production or sensitive repositories, review the code and behavior carefully.
