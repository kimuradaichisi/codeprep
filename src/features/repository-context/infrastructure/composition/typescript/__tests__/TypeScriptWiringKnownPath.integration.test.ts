import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TypeScriptWiringAdapter } from '../TypeScriptWiringAdapter';

describe('TypeScript Wiring Intelligence Known-Path Validation', () => {
  const workspaceRoot = path.resolve(__dirname, '../../../../../../../');
  const adapter = new TypeScriptWiringAdapter();

  it('Case A & B: analyzes SelectionActionHandler and extracts real BINDS_TO and INJECTS relations', async () => {
    const result = await adapter.analyze({
      workspaceRoot,
      relativePaths: [
        'src/commands/SelectionActionHandler.ts',
        'src/features/selection/application/ClipboardSelectionUseCase.ts',
        'src/features/selection/application/WorkspacePathResolver.ts',
        'src/features/selection/infrastructure/VSCodeWorkspacePathResolver.ts',
      ],
    });

    expect(result.relations.length).toBeGreaterThanOrEqual(1);

    // Case A: Port BINDS_TO Implementation
    const bindsRelation = result.relations.find(
      r => r.relationType === 'binds_to' &&
           r.source.symbolName === 'WorkspacePathResolver' &&
           r.target.symbolName === 'VSCodeWorkspacePathResolver'
    );
    expect(bindsRelation).toBeDefined();
    expect(bindsRelation?.confidence).toBe(1.0);
    expect(bindsRelation?.compositionSite.path).toContain('SelectionActionHandler.ts');
    expect(bindsRelation?.analyzer).toBe('typescript-manual-composition');

    // Case B: Consumer INJECTS Implementation
    const injectsRelation = result.relations.find(
      r => r.relationType === 'injects' &&
           r.source.symbolName === 'ClipboardSelectionUseCase' &&
           r.target.symbolName === 'VSCodeWorkspacePathResolver'
    );
    expect(injectsRelation).toBeDefined();
    expect(injectsRelation?.confidence).toBe(1.0);
    expect(injectsRelation?.compositionSite.path).toContain('SelectionActionHandler.ts');
  }, 30000);

  it('Case C: does not create bogus edges for unsupported / non-new arguments', async () => {
    const result = await adapter.analyze({
      workspaceRoot,
      relativePaths: ['src/commands/SelectionActionHandler.ts'],
    });

    // Arguments that are object literals, primitive strings, or undefined expressions
    // should not produce bogus binds_to or injects relations
    for (const rel of result.relations) {
      expect(rel.target.symbolName).toBeTruthy();
      expect(rel.source.symbolName).toBeTruthy();
      expect(rel.source.symbolName).not.toBe(rel.target.symbolName);
    }
  });
});
