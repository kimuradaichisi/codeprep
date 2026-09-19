import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TypeScriptLanguageAdapter } from '../TypeScriptLanguageAdapter';

describe('TypeScriptKnownPath Integration on CodePrep Repository', () => {
  const workspaceRoot = path.resolve(__dirname, '../../../../../../../');
  const adapter = new TypeScriptLanguageAdapter();

  it('analyzes CodePrep repository and extracts real IMPLEMENTS relation', async () => {
    const targetFiles = [
      'src/features/selection/application/WorkspacePathResolver.ts',
      'src/features/selection/infrastructure/VSCodeWorkspacePathResolver.ts',
    ];

    const result = await adapter.analyze({
      workspaceRoot,
      relativePaths: targetFiles,
    });

    expect(result.relations.length).toBeGreaterThan(0);

    const implementsRel = result.relations.find(
      r => r.relationType === 'implements' &&
           r.source.symbolName === 'VSCodeWorkspacePathResolver' &&
           r.target.symbolName === 'WorkspacePathResolver'
    );

    expect(implementsRel).toBeDefined();
    expect(implementsRel?.confidence).toBe(1.0);
    expect(implementsRel?.analyzer).toBe('typescript-compiler');
  }, 30000);

  it('analyzes CodePrep repository and extracts real REFERENCES relation', async () => {
    const targetFiles = [
      'src/features/selection/application/ClipboardSelectionUseCase.ts',
      'src/features/selection/application/WorkspacePathResolver.ts',
    ];

    const result = await adapter.analyze({
      workspaceRoot,
      relativePaths: targetFiles,
    });

    const ref = result.relations.find(
      r => r.relationType === 'references' &&
           r.target.symbolName === 'WorkspacePathResolver'
    );

    expect(ref).toBeDefined();
    expect(ref?.relationType).toBe('references');
  }, 30000);
});
