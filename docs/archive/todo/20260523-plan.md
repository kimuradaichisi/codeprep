# CodePrep 公開準備対応 設計書

## 1. 背景

CodePrep は、VSCode上でワークスペース内のファイルを選択し、LLM向けのコンテキストを生成し、ブラウザAIに渡しやすくするVSCode拡張である。

また、AIが生成したコードブロックやパッチをクリップボードから読み取り、対象ファイルを推定し、Diffプレビュー経由で安全に適用する **Patch & Heal** 機能を持つ。

本プロジェクトは、実装の大部分がAIコーディング支援によって生成されている。また、リポジトリをLLM向けにパックする思想については、Repomixのような既存ツールから着想を得ている。

Repomixは、リポジトリ全体をAIが扱いやすい単一ファイルにまとめるツールとして説明されており、XML/Markdown/Plain形式、Git-aware、Secretlintによるセキュリティチェック、トークンカウント、圧縮などの機能を持つ。 [\[repomix.com\]](https://repomix.com/), [\[npmjs.com\]](https://www.npmjs.com/package/repomix)

CodePrepはその思想と一部近いが、CLI中心ではなく、VSCode上での対話的なファイル選択、ブラウザAIワークフロー、AI生成パッチの安全なプレビュー・適用に重点を置く独立プロジェクトとして公開する。

***

## 2. 本対応の目的

本対応の目的は、CodePrepを以下の状態にすることである。

1. **AI生成コードが多いことを透明に明記する**
2. **Repomix等から着想を得ていることを敬意をもって明記する**
3. **Repomixとの混同を避け、独立プロジェクトであることを明記する**
4. **VSCode拡張としての安全性、特にクリップボード読み取り・ファイル読み取り・パッチ適用について説明する**
5. **無保証・利用者レビュー責任を明記する**
6. **公開前チェックリストを追加する**
7. **Marketplace公開前に必要な最小ドキュメントを整備する**
8. **READMEとpackage.jsonの説明を整合させる**
9. **秘密情報・依存ライセンス・AI生成物リスクの確認を実施できるようにする**

***

## 3. 対応範囲

### 3.1 対応対象ファイル

AIエージェントは、以下のファイルを作成または更新する。

```text
README.md
LICENSE
CHANGELOG.md
SECURITY.md
.vscodeignore
package.json
docs/ai-assisted-development.md
docs/safety.md
docs/publication-checklist.md
```

存在しないファイルは新規作成する。

既存ファイルがある場合は、既存内容を破壊せず、必要なセクションを追記・整理する。

***

## 4. 非対応範囲

この対応では、以下は行わない。

* Repomixとの互換性実装
* Repomixの名称を使ったマーケティング強化
* Repomixのコード移植
* Patch & Heal のロジック変更
* VSCode拡張機能の大規模リファクタ
* CLI化
* MCPサーバー化
* 商標・法務判断の断定

***

## 5. 公開時の基本方針

### 5.1 表現方針

避ける表現：

```md
Repomix for VSCode
Better Repomix
Repomix compatible
Drop-in replacement for Repomix
All code is original
No third-party ideas were used
```

採用する表現：

```md
CodePrep is inspired by the general idea of preparing repository context for LLMs, as popularized by tools such as Repomix.
```

```md
CodePrep is an independent project and is not affiliated with Repomix.
```

```md
This project was developed primarily with AI coding assistance.
```

***

## 6. README.md 設計

### 6.1 READMEの目的

READMEは、以下を明確に伝える。

* CodePrepが何をするツールか
* 誰向けか
* Repomix的な思想との関係
* CodePrep独自の価値
* AI生成コードであること
* 安全性
* 無保証
* インストール方法
* 使い方
* コマンド一覧
* 設定一覧
* 既知の制限

***

### 6.2 README推奨構成

README.mdは以下の順序で構成する。

```md
# CodePrep

## Overview

## Why CodePrep?

## Key Features

## Safety

## AI-assisted Development

## Acknowledgements

## Installation

## Usage

## Commands

## Extension Settings

## Known Limitations

## Disclaimer

## License
```

***

## 7. READMEに追加する必須文面

### 7.1 Overview

```md
# CodePrep

CodePrep is a VSCode extension for browser-based AI coding workflows.

It helps you select workspace files visually, generate LLM-friendly context, and safely preview/apply AI-generated patches through VSCode diff editors.
```

日本語を併記する場合：

```md
CodePrep は、ブラウザAIを利用する開発ワークフロー向けのVSCode拡張です。

VSCode上でファイルを直感的に選択し、LLMに渡しやすいコンテキストを生成できます。また、AIが生成したコード変更をVSCodeのDiffエディタで確認しながら安全に適用できます。
```

***

### 7.2 Why CodePrep?

```md
## Why CodePrep?

Many repository packing tools are CLI-first. CodePrep is VSCode-first.

CodePrep is designed for developers who use browser-based AI tools such as ChatGPT, Claude, Gemini, or other LLM interfaces, especially in environments where direct IDE-integrated AI agents are not available.

Instead of switching to a terminal and configuring include/exclude patterns manually every time, CodePrep lets you select files interactively from the VSCode sidebar, generate a prompt, copy it to your browser AI, and bring the AI-generated changes back into VSCode as reviewable diffs.
```

***

### 7.3 Key Features

READMEの機能説明は、Repomixと似ている部分より、CodePrep独自の導線を強調する。

```md
## Key Features

- Visual file and folder selection from the VSCode sidebar
- Markdown, XML, and JSON output formats
- Token estimate display for selected files
- Git diff based file selection
- Related test file discovery
- Custom prompt templates
- Browser-AI friendly prompt generation
- Patch & Heal for AI-generated code
- Patch target resolution and confidence scoring
- Safe diff preview before applying generated changes
- Japanese and English UI support
```

***

### 7.4 Safety

必須セクション。

```md
## Safety

CodePrep does not send your source code to external AI services by itself.

Generated context is copied to your clipboard or opened locally in VSCode. If you paste that content into a browser-based AI tool, the handling of that content is governed by the AI service you choose to use.

AI-generated patches are not applied silently. CodePrep previews detected changes in VSCode diff editors before they are applied.

Please review all generated content and code changes carefully before applying them.
```

日本語版：

```md
## 安全性について

CodePrep自体が、ソースコードを外部AIサービスへ送信することはありません。

生成されたコンテキストは、クリップボードへコピーされるか、VSCode内で表示されます。その内容をブラウザAIへ貼り付けた場合、その取り扱いは利用するAIサービス側の規約・ポリシーに従います。

AIが生成したパッチは、無確認で自動適用されません。検出された変更はVSCodeのDiffエディタで確認してから反映できます。

生成内容および変更内容は、必ず確認したうえで利用してください。
```

***

### 7.5 AI-assisted Development

必須セクション。

```md
## AI-assisted Development

This project was developed primarily with AI coding assistance.

Most of the implementation was generated with AI tools, then reviewed, adjusted, and tested by the maintainer before publication. The project is provided as-is, without warranty.

Please review the code, behavior, and license compatibility carefully before using it in production environments.
```

日本語版：

```md
## AI利用について

本プロジェクトは、主にAIコーディング支援を利用して開発されています。

実装の大部分はAIツールによって生成され、その後メンテナーが確認・修正・テストを行っています。本プロジェクトは無保証で提供されます。

本番環境で利用する場合は、コード、挙動、ライセンス適合性を十分に確認してください。
```

***

### 7.6 Acknowledgements

必須セクション。

```md
## Acknowledgements

CodePrep was inspired by the general idea of preparing repository context for LLMs, as popularized by tools such as Repomix.

Repomix focuses on packing repositories into AI-friendly formats through CLI and related interfaces. CodePrep focuses on a VSCode-first workflow: interactive file selection, browser-AI prompt generation, and safe preview/application of AI-generated patches.

CodePrep is an independent project and is not affiliated with Repomix.
```

補足として、RepomixはリポジトリをAI向け形式にパックするツールであり、CLIやWebなど複数の導線を持つことが公式サイトやnpmページで説明されている。 [\[repomix.com\]](https://repomix.com/), [\[npmjs.com\]](https://www.npmjs.com/package/repomix)

***

### 7.7 Disclaimer

```md
## Disclaimer

AI-generated code may be incorrect, incomplete, insecure, or incompatible with your project.

CodePrep provides context generation, patch parsing, confidence hints, and diff previews, but it does not guarantee correctness or safety of AI-generated changes.

You are responsible for reviewing and validating all changes before applying them.
```

日本語版：

```md
## 免責

AIが生成したコードは、不正確、不完全、安全でない、またはプロジェクトと互換性がない場合があります。

CodePrepは、コンテキスト生成、パッチ解析、信頼度表示、Diffプレビューを提供しますが、AI生成変更の正確性や安全性を保証するものではありません。

すべての変更は、利用者自身の責任で確認・検証してください。
```

***

## 8. docs/ai-assisted-development.md 設計

### 8.1 目的

AI生成コード比率が高いことを明示し、公開姿勢を透明にする。

### 8.2 内容

```md
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
```

***

## 9. docs/safety.md 設計

### 9.1 目的

安全性に関する挙動を詳細化する。

### 9.2 内容

```md
# Safety

## External Communication

CodePrep does not intentionally transmit source code to external services.

The extension generates context locally and either copies it to the clipboard or opens it in a VSCode editor.

## Clipboard Usage

CodePrep may read from or write to the clipboard when the user explicitly invokes related commands.

Examples:

- Generate & Copy
- Preview Patch from Clipboard

## File Access

CodePrep reads files from the active workspace to generate context.

CodePrep writes files only when the user applies a patch.

## Patch Application

AI-generated patches are previewed before being applied.

Users should review all diffs carefully.

## Sensitive Data

Users should not include secrets, credentials, tokens, private keys, or confidential business information in prompts sent to external AI services.

Future versions may include stronger secret detection and redaction.
```

***

## 10. docs/publication-checklist.md 設計

### 10.1 目的

公開前にAIエージェントまたは人間が実行するチェックリストを定義する。

### 10.2 内容

````md
# Publication Checklist

## Required

- [ ] Run all tests
- [ ] Run dependency audit
- [ ] Check dependency licenses
- [ ] Scan for secrets
- [ ] Verify package metadata
- [ ] Verify README safety sections
- [ ] Verify AI-assisted development disclosure
- [ ] Verify acknowledgement section
- [ ] Verify no Repomix branding confusion
- [ ] Verify VSCode package contents
- [ ] Test extension in a clean workspace
- [ ] Test behavior without Git
- [ ] Test behavior in an empty workspace
- [ ] Test patch preview before apply
- [ ] Confirm no silent patch application

## Suggested Commands

```bash
npm test
npm audit
npx license-checker --summary
git grep -n "apiKey"
git grep -n "token"
git grep -n "secret"
git grep -n "password"
git grep -n "BEGIN PRIVATE KEY"
git grep -n "sk-"
````

## Manual Review

* [ ] README does not claim full original authorship
* [ ] README does not present CodePrep as Repomix official/compatible
* [ ] Marketplace description does not use confusing Repomix naming
* [ ] LICENSE is present
* [ ] SECURITY.md is present
* [ ] CHANGELOG.md is present

```
```

***

## 11. SECURITY.md 設計

```md
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
```

***

## 12. CHANGELOG.md 設計

初期版として以下を作成する。

```md
# Changelog

## 0.1.0

Initial beta release.

### Added

- VSCode sidebar file selection
- Prompt generation for browser-based AI tools
- Markdown, XML, and JSON output formats
- Token estimate display
- Git diff based selection
- Related test discovery
- Custom prompt templates
- Patch & Heal workflow
- Patch preview through VSCode diff editors
- Patch confidence scoring
- Japanese and English UI support

### Notes

This project was developed primarily with AI coding assistance and is released as a beta.
```

***

## 13. LICENSE 設計

### 13.1 推奨

個人OSS公開であれば、まずはMITを推奨する。

### 13.2 注意

AIエージェントは、MITライセンス本文を標準形式で追加すること。

ただし、以下はREADMEのDisclaimer側に書く。LICENSE本文自体は改変しない。

```md
This project was developed primarily with AI coding assistance and is provided as-is.
```

***

## 14. .vscodeignore 設計

### 14.1 目的

Marketplaceパッケージに不要ファイルを含めない。

### 14.2 推奨内容

```gitignore
.vscode/**
.vscode-test/**
src/**
test/**
coverage/**
docs/**
node_modules/**
.git/**
.github/**
*.map
*.tsbuildinfo
*.vsix
.env
.env.*
*.pem
*.key
*.p12
.DS_Store
```

ただし、拡張実行に必要なファイルが `src` ではなく `dist` や `out` に出力される前提か確認すること。  
もし現在のビルド出力が `out/` の場合、`out/**` は除外してはいけない。

***

## 15. package.json 更新方針

### 15.1 description

以下のような説明にする。

```json
"description": "VSCode-first context preparation and safe patch preview workflow for browser-based AI coding."
```

### 15.2 keywords

```json
"keywords": [
  "ai",
  "llm",
  "prompt",
  "vscode",
  "browser-ai",
  "code-review",
  "patch",
  "diff",
  "context"
]
```

### 15.3 repository

未設定なら追加する。

```json
"repository": {
  "type": "git",
  "url": "https://github.com/<owner>/<repo>.git"
}
```

### 15.4 license

```json
"license": "MIT"
```

***

## 16. AIエージェント実行手順

AIエージェントは以下の順で作業する。

### Step 1: 現状確認

* `README.md` の有無を確認
* `LICENSE` の有無を確認
* `SECURITY.md` の有無を確認
* `CHANGELOG.md` の有無を確認
* `package.json` のメタ情報を確認
* `.vscodeignore` の有無を確認

### Step 2: README更新

READMEに以下を必ず追加する。

* Overview
* Why CodePrep?
* Safety
* AI-assisted Development
* Acknowledgements
* Disclaimer

既存の機能説明がある場合は破壊せず、重複を整理する。

### Step 3: docs作成

以下を作成する。

```text
docs/ai-assisted-development.md
docs/safety.md
docs/publication-checklist.md
```

### Step 4: SECURITY.md作成

安全性・脆弱性報告方針を書く。

### Step 5: CHANGELOG.md作成

`0.1.0` 初期β版として整理する。

### Step 6: LICENSE確認

なければMITライセンスを追加する。

### Step 7: .vscodeignore確認

VSCode拡張のパッケージに不要ファイルが含まれないよう整理する。

### Step 8: package.json更新

description, keywords, license, repository を確認する。

### Step 9: 最終チェック

以下を実行可能なら実行する。

```bash
npm test
npm audit
npx license-checker --summary
```

また、秘密情報チェックとして以下を実行する。

```bash
git grep -n "apiKey"
git grep -n "token"
git grep -n "secret"
git grep -n "password"
git grep -n "BEGIN PRIVATE KEY"
git grep -n "sk-"
git grep -n "OPENAI"
git grep -n "ANTHROPIC"
```

***

## 17. 受け入れ条件

この対応は、以下をすべて満たしたら完了とする。

### ドキュメント

* [ ] READMEにAI利用の明記がある
* [ ] READMEにRepomix等から着想を得た旨がある
* [ ] READMEにRepomixとは独立プロジェクトである旨がある
* [ ] READMEに安全性セクションがある
* [ ] READMEに無保証・レビュー責任がある
* [ ] SECURITY.mdが存在する
* [ ] CHANGELOG.mdが存在する
* [ ] LICENSEが存在する
* [ ] docs/ai-assisted-development.md が存在する
* [ ] docs/safety.md が存在する
* [ ] docs/publication-checklist.md が存在する

### 表現

* [ ] `Repomix for VSCode` と書いていない
* [ ] `Better Repomix` と書いていない
* [ ] Repomix公式・提携・互換であると誤認させない
* [ ] `All code is original` と書いていない
* [ ] AI生成コードであることを隠していない

### 安全性

* [ ] 外部送信しないことが明記されている
* [ ] クリップボード利用が明記されている
* [ ] パッチはDiff確認後に適用することが明記されている
* [ ] AI生成コードのリスクが明記されている

### package

* [ ] package.jsonにlicenseがある
* [ ] package.jsonにdescriptionがある
* [ ] package.jsonにrepositoryがある
* [ ] package.jsonに適切なkeywordsがある

***

## 18. AIエージェントに渡す実行プロンプト

以下をそのままエージェントに渡せる。

```md
You are working on the CodePrep VSCode extension.

Your task is to prepare the project for public release.

Important context:

- This project was developed primarily with AI coding assistance.
- The maintainer estimates that most of the implementation is AI-generated.
- The project is inspired by the general idea of preparing repository context for LLMs, as popularized by tools such as Repomix.
- CodePrep must not present itself as Repomix, Repomix-compatible, or affiliated with Repomix.
- CodePrep is an independent VSCode-first workflow tool.
- CodePrep focuses on visual file selection, browser-AI prompt generation, and safe preview/application of AI-generated patches.
- The extension may read workspace files, write generated context to clipboard, read clipboard content for patch preview when explicitly invoked, and write files only after user confirmation.
- Safety, transparency, acknowledgement, and disclaimer sections are mandatory.

Please update or create the following files:

- README.md
- LICENSE
- CHANGELOG.md
- SECURITY.md
- .vscodeignore
- docs/ai-assisted-development.md
- docs/safety.md
- docs/publication-checklist.md
- package.json

Requirements:

1. Add a README section explaining that the project was developed primarily with AI coding assistance.
2. Add a README section acknowledging inspiration from repository context packing tools such as Repomix.
3. Clearly state that CodePrep is independent and not affiliated with Repomix.
4. Do not use phrases such as "Repomix for VSCode", "Better Repomix", "drop-in replacement", or "Repomix-compatible".
5. Add a Safety section explaining that CodePrep does not send source code to external services by itself.
6. Explain clipboard behavior and patch preview behavior.
7. Add a Disclaimer section explaining that AI-generated code may be incorrect or unsafe.
8. Add SECURITY.md with a vulnerability reporting policy.
9. Add CHANGELOG.md for version 0.1.0 beta.
10. Add docs files for AI-assisted development, safety, and publication checklist.
11. Add or verify MIT LICENSE.
12. Update package.json metadata if missing.
13. Create or update .vscodeignore to avoid publishing unnecessary files.
14. Preserve existing README content where possible.
15. Do not change core implementation logic unless strictly necessary.

Acceptance criteria:

- README includes Safety, AI-assisted Development, Acknowledgements, and Disclaimer.
- README does not imply affiliation with Repomix.
- README does not claim all code is fully original human-authored code.
- SECURITY.md, CHANGELOG.md, LICENSE, and docs files exist.
- package.json includes license, description, repository, and keywords.
- .vscodeignore does not exclude the actual compiled extension output.
```

***

## 19. 注意事項

AIエージェントには、以下を強く守らせる。

```md
Do not rewrite the entire project.
Do not refactor architecture.
Do not modify patch logic.
Do not remove tests.
Do not remove Japanese documentation if present.
Do not copy Repomix README text.
Do not claim official relationship with Repomix.
Do not overstate legal safety.
```

***

## 20. 最終的な公開メッセージ

公開時の立ち位置はこれに統一する。

```text
CodePrep is a VSCode-first tool for browser-based AI coding workflows.

It was developed primarily with AI assistance, inspired by the general idea of repository context preparation tools such as Repomix, and focused on interactive file selection plus safe AI-generated patch preview.
```

日本語では：

```text
CodePrep は、ブラウザAIを利用する開発者向けのVSCode-firstな支援ツールです。

Repomixなどに見られるリポジトリ文脈整理の考え方に着想を得つつ、VSCode上での対話的なファイル選択、プロンプト生成、AI生成パッチの安全なDiff確認・適用に重点を置いています。
```

