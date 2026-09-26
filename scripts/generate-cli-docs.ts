/*
 * Copyright 2026 CodePrep Contributors
 */
import * as fs from 'fs';
import * as path from 'path';
import { CANONICAL_COMMAND_CATALOG } from '../apps/cli/catalog/commandCatalog';
import { renderCliReferenceMarkdown } from '../apps/cli/catalog/catalogRenderer';

const DOC_PATH = path.resolve(__dirname, '../docs/reference/cli-reference.md');

function normalizeContent(str: string): string {
  return str.replace(/\r\n/g, '\n').trim();
}

function main(): void {
  const isCheck = process.argv.includes('--check');
  const generated = renderCliReferenceMarkdown(CANONICAL_COMMAND_CATALOG);

  if (isCheck) {
    if (!fs.existsSync(DOC_PATH)) {
      process.stderr.write(`[cli:docs:check:error] File not found: ${DOC_PATH}\n`);
      process.stderr.write(`Run "npm run cli:docs" to generate it.\n`);
      process.exit(1);
    }
    const current = fs.readFileSync(DOC_PATH, 'utf-8');
    if (normalizeContent(current) !== normalizeContent(generated)) {
      process.stderr.write(`[cli:docs:check:error] Documentation drift detected in ${DOC_PATH}!\n`);
      process.stderr.write(`The committed cli-reference.md does not match the Canonical Command Catalog.\n`);
      process.stderr.write(`Run "npm run cli:docs" to regenerate and commit the update.\n`);
      process.exit(1);
    }
    process.stdout.write(`[cli:docs:check] PASS: docs/reference/cli-reference.md is in sync with Command Catalog.\n`);
    return;
  }

  const dir = path.dirname(DOC_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DOC_PATH, generated + '\n', 'utf-8');
  process.stdout.write(`[cli:docs] Generated ${DOC_PATH} successfully.\n`);
}

main();
