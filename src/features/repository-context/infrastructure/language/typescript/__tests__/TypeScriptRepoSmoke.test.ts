import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TypeScriptLanguageAdapter } from '../TypeScriptLanguageAdapter';

describe('TypeScript Language Intelligence Smoke & Performance', () => {
  const workspaceRoot = path.resolve(__dirname, '../../../../../../../');
  const adapter = new TypeScriptLanguageAdapter();

  it('runs structural analysis on sample core features and measures performance', async () => {
    const startTime = Date.now();
    const result = await adapter.analyze({
      workspaceRoot,
      relativePaths: [
        'src/features/selection/application/ClipboardSelectionUseCase.ts',
        'src/features/selection/application/WorkspacePathResolver.ts',
        'src/features/selection/infrastructure/VSCodeWorkspacePathResolver.ts',
        'src/features/repository-context/application/ir/BuildRepositoryIRUseCase.ts',
        'src/features/repository-context/domain/ir/RepositoryIR.ts',
      ],
    });
    const durationMs = Date.now() - startTime;

    const implementsCount = result.relations.filter(r => r.relationType === 'implements').length;
    const extendsCount = result.relations.filter(r => r.relationType === 'extends').length;
    const referencesCount = result.relations.filter(r => r.relationType === 'references').length;

    console.log(`[Smoke Measurement] Total Relations: ${result.relations.length}, Implements: ${implementsCount}, Extends: ${extendsCount}, References: ${referencesCount}, Duration: ${durationMs}ms`);

    expect(result.relations.length).toBeGreaterThan(0);
    expect(implementsCount).toBeGreaterThanOrEqual(1);
    expect(referencesCount).toBeGreaterThanOrEqual(1);
    expect(durationMs).toBeLessThan(10000); // within 10s
  }, 15000);

  it('runs repository-wide structural smoke on entire Program', async () => {
    const memBefore = process.memoryUsage().heapUsed;
    const startTime = Date.now();
    const result = await adapter.analyze({ workspaceRoot });
    const durationMs = Date.now() - startTime;
    const memAfter = process.memoryUsage().heapUsed;

    const implCount = result.relations.filter(r => r.relationType === 'implements').length;
    const extCount = result.relations.filter(r => r.relationType === 'extends').length;
    const refCount = result.relations.filter(r => r.relationType === 'references').length;
    const uniqueFiles = new Set(result.relations.map(r => r.source.path));

    console.log(`[Repository-Wide Smoke Measurement]`);
    console.log(`- Analyzed Files (with relations): ${uniqueFiles.size}`);
    console.log(`- Total Relations: ${result.relations.length}`);
    console.log(`- REFERENCES: ${refCount}`);
    console.log(`- IMPLEMENTS: ${implCount}`);
    console.log(`- EXTENDS: ${extCount}`);
    console.log(`- Unresolved: ${result.unresolvedCount}`);
    console.log(`- Elapsed Time: ${durationMs}ms`);
    console.log(`- Heap Before: ${(memBefore / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Heap After: ${(memAfter / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Heap Delta: ${((memAfter - memBefore) / 1024 / 1024).toFixed(2)} MB`);

    expect(result.relations.length).toBeGreaterThan(0);
    expect(implCount).toBeGreaterThanOrEqual(1);
  }, 60000);
});
