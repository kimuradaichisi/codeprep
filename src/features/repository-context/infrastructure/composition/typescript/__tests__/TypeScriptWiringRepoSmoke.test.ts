import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAnalysisSession } from '../../../language/typescript/TypeScriptAnalysisSession';
import { TypeScriptLanguageAdapter } from '../../../language/typescript/TypeScriptLanguageAdapter';
import { TypeScriptWiringAdapter } from '../TypeScriptWiringAdapter';

describe('TypeScript Wiring & Language Intelligence Session Reuse Smoke', () => {
  const workspaceRoot = path.resolve(__dirname, '../../../../../../../');

  it('runs language analysis and wiring analysis with shared TypeScriptAnalysisSession', async () => {
    const memInitial = process.memoryUsage().heapUsed;
    const sessionStart = Date.now();

    // 1. Create shared session
    const session = createAnalysisSession(workspaceRoot);
    const sessionDurationMs = Date.now() - sessionStart;

    // 2. Language Intelligence with shared session
    const langAdapter = new TypeScriptLanguageAdapter(session);
    const langStart = Date.now();
    const langResult = await langAdapter.analyze({ workspaceRoot });
    const langDurationMs = Date.now() - langStart;

    // 3. Wiring Intelligence with shared session
    const wiringAdapter = new TypeScriptWiringAdapter(session);
    const wiringStart = Date.now();
    const wiringResult = await wiringAdapter.analyze({ workspaceRoot });
    const wiringDurationMs = Date.now() - wiringStart;

    const totalDurationMs = Date.now() - sessionStart;
    const memFinal = process.memoryUsage().heapUsed;

    const bindsCount = wiringResult.relations.filter(r => r.relationType === 'binds_to').length;
    const injectsCount = wiringResult.relations.filter(r => r.relationType === 'injects').length;

    console.log('[Smoke Measurement: Shared Session Performance]');
    console.log(`- Session Setup Time: ${sessionDurationMs}ms`);
    console.log(`- Language Analysis Time (Shared Session): ${langDurationMs}ms`);
    console.log(`- Wiring Analysis Time (Shared Session): ${wiringDurationMs}ms`);
    console.log(`- Total Analysis Time: ${totalDurationMs}ms`);
    console.log(`- Heap Delta: ${((memFinal - memInitial) / 1024 / 1024).toFixed(2)} MB`);
    console.log('--- Wiring Results ---');
    console.log(`- Total Wiring Relations: ${wiringResult.relations.length}`);
    console.log(`- BINDS_TO: ${bindsCount}`);
    console.log(`- INJECTS: ${injectsCount}`);
    console.log(`- Unresolved: ${wiringResult.unresolvedCount}`);

    // Sample edges (up to 10)
    console.log('--- Sample Wiring Edges (Top 10) ---');
    wiringResult.relations.slice(0, 10).forEach((r, idx) => {
      console.log(`  [${idx + 1}] ${r.source.symbolName} --[${r.relationType.toUpperCase()}]--> ${r.target.symbolName} (at ${r.compositionSite.path})`);
    });

    expect(wiringResult.relations.length).toBeGreaterThanOrEqual(1);
    expect(bindsCount).toBeGreaterThanOrEqual(1);
    expect(injectsCount).toBeGreaterThanOrEqual(1);
    expect(langResult.relations.length).toBeGreaterThan(0);
  }, 60000);
});
