# Safety

## External Communication

CodePrep does not intentionally transmit source code to external services.

The extension generates context locally and either copies it to the clipboard or opens it in VSCode. If you paste that content into a browser-based AI tool, the handling of that content is governed by the AI service you choose to use.

## Clipboard Usage

CodePrep may read from or write to the clipboard when the user explicitly invokes related commands.

Examples:

- `Generate & Copy`
- `Preview Patch from Clipboard`

## File Access

CodePrep reads files from the active workspace to generate context. It writes files only when the user applies a patch.

## Patch Application

AI-generated patches are previewed before being applied. Users should review all diffs carefully.

## Sensitive Data

Do not include secrets, credentials, tokens, private keys, or confidential business information in prompts sent to external AI services.

Future versions may include stronger secret detection and redaction.
