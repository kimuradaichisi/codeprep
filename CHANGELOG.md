# Changelog

All notable changes to this project will be documented in this file.

## [0.8.2] - 2026-05-14
- chore: Bump version to 0.8.2
- feat: Add `Generate Directory Structure` command and `codeprep.generateStructure` button
- ux: Add "Clear Prompt" option to prompt selection (clears currently selected prompt)

## [0.7.5] - 2026-05-13
- feat: Add `Select Directories Only` action to selection menu (select parent directories only)
- feat: `codeprep.hideExcludedDirectories` setting — hide excluded dirs in file tree using `codeprep.exclude` and workspace `.gitignore`
- chore: Swap `gitMenu` and `applyAllPatches` order in view title bar
- docs: i18n and README updates for the new features

## [0.7.4] - 2026-05-13
- feat: Add `codeprep.hideExcludedDirectories` setting to hide excluded directories in the file tree
- feat: `FileTreeProvider` hides directories based on `codeprep.exclude` and workspace `.gitignore` when the setting is enabled
- fix: `VSCodeWorkspaceRepository` now respects `.gitignore` when collecting workspace files (prevents `.vscode-test` from being selected)
- test: Add unit tests for `.gitignore` handling and tree hiding behavior

## [0.7.3] - (previous)
- Initial release notes placeholder

## [0.8.0] - 2026-05-13
- chore: Bump version to 0.8.0
- docs: Update CHANGELOG for 0.8.0 release
- build: Package VSIX for 0.8.0
 - feat: Full i18n (NLS) conversion for user-facing strings
 - feat: Add context-menu commands to copy file paths (`codeprep.copyPathRelative`, `codeprep.copyPathAbsolute`)
 - feat: Use icons for copy actions and show hover/tooltips instead of long titles
 - feat: File tree improvements: respect `.gitignore`, hide excluded directories, single-click to open files
 - fix: Prevent `.gitignore`-excluded folders (e.g. `.vscode-test`) from being selected
 - fix: Make i18n helper robust (lazy-load `vscode.l10n`), replace dynamic requires with static imports where needed
 - test: Update tests and ensure full unit test suite passes
 - chore: Generated `codeprep-vscode-0.8.0.vsix`

## [0.8.1] - 2026-05-13
- fix: 全ユーザー向け文字列を追加で日本語化（QuickPick、設定、コマンドタイトルなどの未翻訳箇所を補完）
- feat: 拡張子で選択 (正規表現対応) を追加 — カンマ区切りで複数の正規表現を指定可能
- feat: 右クリックメニューでのパスコピーなどの微修正とi18nキーの同期
- test: 単体テスト（Vitest）全 198 テストを確認済み
