# Changelog

All notable changes to this project will be documented in this file.

## [0.7.4] - 2026-05-13
- feat: Add `codeprep.hideExcludedDirectories` setting to hide excluded directories in the file tree
- feat: `FileTreeProvider` hides directories based on `codeprep.exclude` and workspace `.gitignore` when the setting is enabled
- fix: `VSCodeWorkspaceRepository` now respects `.gitignore` when collecting workspace files (prevents `.vscode-test` from being selected)
- test: Add unit tests for `.gitignore` handling and tree hiding behavior

## [0.7.3] - (previous)
- Initial release notes placeholder
