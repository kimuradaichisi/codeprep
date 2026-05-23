# Security Policy

## Supported Versions

This project is currently in beta. Security fixes are applied to the latest published version.

## Security Model

CodePrep does not intentionally transmit source code to external services.

The extension may:

- read files in the active workspace
- generate local prompt text
- write generated prompt text to the clipboard
- read AI-generated responses from the clipboard when explicitly invoked
- preview generated patches
- write files only after user confirmation

## Reporting a Vulnerability

If you discover a security issue, such as unintended file access, secret leakage, unsafe patch application, or unexpected network communication, please report it via GitHub Issues or contact the maintainer.

Do not include sensitive source code, credentials, tokens, or private data in public issue reports.
