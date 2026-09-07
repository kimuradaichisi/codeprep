// evaluation/kairos-exploration/metricsAggregator.ts
import type { ExplorationMetrics, ParsedToolEvent } from './types';

function extractMetricsJson(lines: readonly string[]) {
  let costUsd = 0, inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, durationMs = 0;
  for (const line of lines) {
    if (!line.trim().startsWith('{')) continue;
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (obj.type === 'result' && obj.total_cost_usd !== undefined) costUsd = Number(obj.total_cost_usd || 0);
      if (obj.type === 'result' && obj.duration_ms !== undefined) durationMs = Number(obj.duration_ms || 0);
      const usage = (obj.message as any)?.usage || (obj as any).usage;
      if (usage) {
        inputTokens += Number(usage.input_tokens || 0);
        outputTokens += Number(usage.output_tokens || 0);
        cacheReadTokens += Number(usage.cache_read_input_tokens || 0);
      }
    } catch {}
  }
  return { costUsd, inputTokens, outputTokens, cacheReadTokens, durationMs };
}

function countCategories(files: Set<string>) {
  let src = 0, docs = 0;
  const dirs = new Set<string>();
  for (const f of files) {
    const norm = f.replace(/\\/g, '/').toLowerCase();
    if (norm.endsWith('.py') || norm.endsWith('.ts') || norm.endsWith('.js')) src++;
    if (norm.endsWith('.md') || norm.includes('docs/')) docs++;
    const parts = norm.split('/');
    if (parts.length > 1) dirs.add(parts.slice(0, parts.length - 1).join('/'));
  }
  return { src, docs, dirCount: dirs.size };
}

export function aggregateMetrics(events: readonly ParsedToolEvent[], lines: readonly string[]): ExplorationMetrics {
  const m = extractMetricsJson(lines);
  const readEvents = events.filter((e) => e.kind === 'read' && e.target);
  const allReadFiles = new Set(readEvents.map((e) => e.target!));
  const cat = countCategories(allReadFiles);
  const duplicateReads = readEvents.length - allReadFiles.size;

  return {
    totalDurationMs: m.durationMs,
    uniqueFilesRead: allReadFiles.size,
    uniqueSourceFilesRead: cat.src,
    uniqueDocsRead: cat.docs,
    uniqueDirectoriesExplored: cat.dirCount,
    searchGrepCalls: events.filter((e) => e.kind === 'search').length,
    mcpCalls: events.filter((e) => e.kind === 'mcp').length,
    contextPackCalls: events.filter((e) => e.toolName.includes('build_context_pack') || e.toolName.includes('prepare_context')).length,
    postCodePrepManualReads: readEvents.length,
    duplicateReads: Math.max(0, duplicateReads),
    totalToolCalls: events.length,
    inputTokens: m.inputTokens,
    cacheReadTokens: m.cacheReadTokens,
    outputTokens: m.outputTokens,
    totalCostUsd: m.costUsd,
  };
}
