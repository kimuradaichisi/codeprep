// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { SearchPanel } from '../components/SearchPanel';
import type { DesktopApi } from '../../DesktopApi';
import { defaultRecommendationSettings } from '../../../../src/features/repository-context/domain/Recommendation';

const createWorkflowE2EProps = (api: DesktopApi) => {
  let task = '返品時に二重返金される問題を調査する';
  let selected = '';
  let strategy: 'auto' | 'fast' | 'standard' | 'expanded' = 'auto';
  let activeTab: 'manifest' | 'context' = 'manifest';
  let candidates: any[] = [];
  let confidence: any = undefined;
  let packManifest: any = undefined;
  let packContent = '';
  let resolvedStrategy: any = undefined;

  const renderCurrent = () => render(
    <SearchPanel
      discoveryMode="task"
      taskInput={task}
      entryPointInput={selected}
      recipeKind="text"
      query=""
      contextLines={3}
      searchNotice={undefined}
      presetKind="custom"
      useGitignore={true}
      recommendationSettings={defaultRecommendationSettings()}
      entryPointCandidates={candidates}
      confidence={confidence}
      suggestedPackStrategy={confidence ? 'fast' : undefined}
      adaptiveStrategy={strategy}
      workflowState={packManifest ? 'packReady' : candidates.length > 0 ? 'candidatesReady' : 'idle'}
      packManifest={packManifest}
      packContent={packContent}
      resolvedStrategy={resolvedStrategy}
      preview={packContent}
      activePreviewTab={activeTab}
      setDiscoveryMode={vi.fn()}
      setTaskInput={(t) => { task = t; }}
      setEntryPointInput={(e) => { selected = e; }}
      setRecipeKind={vi.fn()}
      setQuery={vi.fn()}
      setContextLines={vi.fn()}
      setPresetKind={vi.fn()}
      setUseGitignore={vi.fn()}
      setRecommendationSettings={vi.fn()}
      analyze={vi.fn()}
      analyzeTask={async () => {
        const res = await api.buildTaskContext({ projectId: 'p1', task, entryPoints: selected.split(',').map((s) => s.trim()), strategy });
        packManifest = res.manifest;
        packContent = res.content;
        resolvedStrategy = res.resolvedStrategy;
      }}
      discoverEntryPoints={async () => {
        const res = await api.discoverEntryPointCandidates({ projectId: 'p1', task });
        candidates = [...res.candidates];
        confidence = res.confidence;
      }}
      toggleEntryPointCandidate={(path) => {
        selected = selected.includes(path) ? '' : path;
      }}
      setAdaptiveStrategy={(s) => { strategy = s; }}
      setActivePreviewTab={(t) => { activeTab = t; }}
      copyPackContent={async () => { await api.copyOutput(packContent); }}
      clearSearch={vi.fn()}
    />
  );

  return { renderCurrent, getTask: () => task, getSelected: () => selected };
};

describe('Desktop Context Workflow E2E', () => {
  it('executes full workflow: task -> discover -> confidence -> select -> build -> preview -> copy', async () => {
    const copyOutput = vi.fn(async () => {});
    const api = {
      discoverEntryPointCandidates: vi.fn(async () => ({
        candidates: [{ projectId: 'p1', relativePath: 'src/order/OrderService.ts', score: 85, reasons: ['filenameMatch'], matchedTerms: ['order'] }],
        confidence: { level: 'high' as const, score: 90, reasons: ['largeScoreGap' as const, 'strongStructuralSupport' as const] },
        suggestedPackStrategy: 'fast' as const,
        terms: ['order'],
        warnings: [],
      })),
      buildTaskContext: vi.fn(async (req) => ({
        manifest: {
          projectId: 'p1',
          task: req.task,
          entryPoints: req.entryPoints,
          entries: [
            { projectId: 'p1', relativePath: 'src/order/OrderService.ts', role: 'target', packMode: 'full', score: 85, candidateReasons: [], recommendationReasons: [] },
            { projectId: 'p1', relativePath: 'src/order/ReturnPolicy.ts', role: 'dependency', packMode: 'full', score: 60, candidateReasons: [], recommendationReasons: [] },
            { projectId: 'p1', relativePath: 'tests/OrderService.test.ts', role: 'test', packMode: 'full', score: 50, candidateReasons: [], recommendationReasons: [] },
          ],
          budget: { bytes: 4000, estimatedTokens: 1000, limit: 40000, withinLimit: true },
        },
        markdown: '# Context Manifest\nTARGET: src/order/OrderService.ts\nDEPENDENCY: src/order/ReturnPolicy.ts',
        content: '# Packaged Code\nexport class OrderService {}',
        resolvedStrategy: 'fast' as const,
        candidates: [],
        warnings: [],
      })),
      copyOutput,
    } as unknown as DesktopApi;

    const { renderCurrent } = createWorkflowE2EProps(api);

    // 1 & 2: Initial render and task entry
    let container = renderCurrent();
    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();
    act(() => { textarea?.dispatchEvent(new Event('input', { bubbles: true })); });

    // 3: Click Find Context
    const findBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Find Context'));
    await act(async () => { findBtn?.click(); });
    expect(api.discoverEntryPointCandidates).toHaveBeenCalled();

    // 4, 5, 6: Re-render with candidates and confidence
    container = renderCurrent();
    expect(container.textContent).toContain('OrderService.ts');
    expect(container.textContent).toContain('Confidence: high (90 pts)');
    expect(container.textContent).toContain('Suggested: FAST');

    // 7 & 8: Select candidate
    const checkbox = container.querySelector('.candidate-card-list input[type="checkbox"]');
    act(() => { (checkbox as HTMLInputElement)?.click(); });

    // 9: Build Context Pack
    container = renderCurrent();
    const buildBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Build Context Pack'));
    expect(buildBtn?.disabled).toBe(false);
    await act(async () => { buildBtn?.click(); });
    expect(api.buildTaskContext).toHaveBeenCalled();

    // 10 & 11: Pack ready verification (Strategy, Tokens, Preview)
    container = renderCurrent();
    expect(container.textContent).toContain('Strategy: FAST');
    expect(container.textContent).toContain('Files: 3');
    expect(container.textContent).toContain('Estimated Tokens: 1,000');

    // 12: Copy Context Pack
    const copyBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Copy Context Pack'));
    await act(async () => { copyBtn?.click(); });
    expect(copyOutput).toHaveBeenCalledWith('# Packaged Code\nexport class OrderService {}');
  });
});

const render = (node: React.ReactNode): HTMLElement => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => { root.render(node); });
  return container;
};
