/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CANONICAL_COMMAND_CATALOG } from '../catalog/commandCatalog';
import { renderCliReferenceMarkdown } from '../catalog/catalogRenderer';
import { ALL_TOOLS } from '../../mcp/toolRegistry';

describe('Catalog Drift Tests', () => {
  it('committed cli-reference.md exactly matches generated catalog markdown', () => {
    const docPath = path.resolve(__dirname, '../../../docs/reference/cli-reference.md');
    expect(fs.existsSync(docPath)).toBe(true);

    const committed = fs.readFileSync(docPath, 'utf-8').replace(/\r\n/g, '\n').trim();
    const generated = renderCliReferenceMarkdown(CANONICAL_COMMAND_CATALOG).replace(/\r\n/g, '\n').trim();

    expect(committed).toBe(generated);
  });

  it('all MCP equivalents in catalog exist in MCP ALL_TOOLS registry', () => {
    const mcpToolNames = new Set<string>(ALL_TOOLS.map((t) => t.name));
    for (const cmd of CANONICAL_COMMAND_CATALOG) {
      if (cmd.mcpEquivalent) {
        expect(
          mcpToolNames.has(cmd.mcpEquivalent),
          `Command "${cmd.name}" references non-existent MCP tool "${cmd.mcpEquivalent}"`
        ).toBe(true);
      }
    }
  });

  it('all example commands only use valid options defined for the command or global flags', () => {
    const globalFlags = new Set(['--help', '-h', '--version', '-v']);
    for (const cmd of CANONICAL_COMMAND_CATALOG) {
      const validFlags = new Set(globalFlags);
      for (const opt of cmd.options) {
        validFlags.add(opt.name);
        if (opt.alias) validFlags.add(opt.alias);
      }

      for (const eg of cmd.examples) {
        const tokens = eg.command.split(/\s+/);
        for (const token of tokens) {
          if (token.startsWith('-')) {
            const flag = token.split('=')[0];
            expect(
              validFlags.has(flag),
              `Example in "${cmd.name}" uses undefined option "${flag}": ${eg.command}`
            ).toBe(true);
          }
        }
      }
    }
  });

  it('every command has defined exit codes including SUCCESS (0) and UNEXPECTED_FAILURE (1)', () => {
    for (const cmd of CANONICAL_COMMAND_CATALOG) {
      const codes = cmd.exitCodes.map((c) => c.code);
      expect(codes).toContain(0);
      expect(codes).toContain(1);
    }
  });
});
