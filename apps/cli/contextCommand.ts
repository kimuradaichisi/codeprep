/*
 * Copyright 2026 CodePrep Contributors
 */
import * as fs from 'fs';
import type { CliArguments } from './argumentParser';
import type { CliCandidateDto, CliContextPackDto, CliContextResult } from './types';
import { createCliContainer } from './composition';
import { formatAsMarkdown } from './markdownFormatter';
import type { PrepareContextResult } from '../../src/features/repository-context/application/PrepareTaskContextUseCase';
import type { RepositoryContextContainer } from '../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer';
import type { EnrichedEntryPointCandidate } from '../../src/features/repository-context/domain/CandidateEvidence';

export async function runContextCommand(
  args: CliArguments,
  containerFactory: (ws: string) => RepositoryContextContainer = createCliContainer
): Promise<CliContextResult> {
  logStderr(`Analyzing repository for task: "${args.task}" in ${args.workspace}`);
  const container = containerFactory(args.workspace);
  const res = await container.prepareContextUseCase.execute({ task: args.task });
  const result = buildCliResult(args, res);
  const formatted = renderOutput(result, args.format);
  writeOutput(formatted, args.output);
  return result;
}

function buildCliResult(args: CliArguments, res: PrepareContextResult): CliContextResult {
  const candidates = transformCandidates(res.candidates);
  const pack: CliContextPackDto | null =
    args.pack && res.contextPack
      ? { manifest: res.contextPack.manifest, content: res.contextPack.content, warnings: res.contextPack.warnings }
      : null;

  return Object.freeze({
    schemaVersion: '1',
    task: args.task,
    workspace: args.workspace,
    result: {
      decision: res.decision.decision,
      confidence: res.confidence,
      requiresSelection: res.decision.requiresSelection,
      strategy: res.decision.strategy,
      candidates,
      contextPack: pack,
    },
  });
}

function transformCandidates(enriched: readonly EnrichedEntryPointCandidate[]): readonly CliCandidateDto[] {
  return enriched.map((item) => ({
    relativePath: item.candidate.relativePath,
    score: item.candidate.score,
    supportScore: item.supportScore,
    reasons: item.candidate.reasons,
    matchedTerms: item.candidate.matchedTerms,
    evidence: item.evidence.map((ev) => ({
      kind: ev.kind,
      relatedPath: ev.relatedPath,
      relatedSymbol: ev.relatedSymbol,
      score: ev.score,
      detail: ev.detail,
    })),
  }));
}

function renderOutput(data: CliContextResult, format: 'json' | 'markdown'): string {
  if (format === 'markdown') return formatAsMarkdown(data);
  return JSON.stringify(data, null, 2);
}

function writeOutput(text: string, outputPath?: string): void {
  if (outputPath) {
    fs.writeFileSync(outputPath, text, 'utf-8');
    logStderr(`Output written to ${outputPath}`);
  } else {
    process.stdout.write(text + '\n');
  }
}

function logStderr(message: string): void {
  process.stderr.write(`[codeprep-cli] ${message}\n`);
}
