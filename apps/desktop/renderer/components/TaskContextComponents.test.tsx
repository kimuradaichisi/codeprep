// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceStatusHeader } from './WorkspaceStatusHeader';
import { TaskInputArea } from './TaskInputArea';
import { ConfidenceSummary } from './ConfidenceSummary';
import { CandidateCardList } from './CandidateCardList';
import { ContextPackViewer } from './ContextPackViewer';
import type { ContextManifest } from '../../../../src/features/repository-context/domain/ContextManifest';

describe('TaskContextComponents', () => {
  describe('WorkspaceStatusHeader', () => {
    it('renders READY index statuses and DEGRADED warning', () => {
      const c1 = render(<WorkspaceStatusHeader indexStatus="ready" knowledgeStatus="ready" semanticStatus="ready" />);
      expect(c1.textContent).toContain('Repository Index:');
      expect(c1.textContent).toContain('READY');
      expect(c1.textContent).not.toContain('Semantic search is unavailable');

      const c2 = render(<WorkspaceStatusHeader indexStatus="ready" knowledgeStatus="ready" semanticStatus="degraded" />);
      expect(c2.textContent).toContain('DEGRADED');
      expect(c2.textContent).toContain('Semantic search is unavailable. Deterministic discovery and structural evidence remain available.');
    });
  });

  describe('TaskInputArea', () => {
    it('validates task input and handles click/Ctrl+Enter', () => {
      const onFind = vi.fn();
      const c1 = render(<TaskInputArea taskInput="   " isBusy={false} onTaskChange={vi.fn()} onFindContext={onFind} />);
      expect(c1.querySelector('button')?.disabled).toBe(true);

      const c2 = render(<TaskInputArea taskInput="返品処理を修正" isBusy={false} onTaskChange={vi.fn()} onFindContext={onFind} />);
      expect(c2.querySelector('button')?.disabled).toBe(false);
      act(() => { c2.querySelector('button')?.click(); });
      expect(onFind).toHaveBeenCalledTimes(1);

      const textarea = c2.querySelector('textarea');
      act(() => { textarea?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true })); });
      expect(onFind).toHaveBeenCalledTimes(2);
    });
  });

  describe('ConfidenceSummary', () => {
    it('renders HIGH and LOW confidence, reasons, and strategy selection', () => {
      const confHigh = { level: 'high' as const, score: 92, reasons: ['largeScoreGap' as const, 'strongExactMatch' as const] };
      const onStrategy = vi.fn();
      const c1 = render(<ConfidenceSummary confidence={confHigh} suggestedStrategy="fast" selectedStrategy="auto" onStrategyChange={onStrategy} />);
      expect(c1.textContent).toContain('確信度: 高');
      expect(c1.textContent).toContain('92 pts');
      expect(c1.textContent).toContain('最有力候補と他の候補に明確なスコア差あり');

      const select = c1.querySelector('select');
      act(() => { if (select) { select.value = 'expanded'; select.dispatchEvent(new Event('change', { bubbles: true })); } });
      expect(onStrategy).toHaveBeenCalledWith('expanded');

      const confLow = { level: 'low' as const, score: 42, reasons: ['weakStructuralSupport' as const] };
      const c2 = render(<ConfidenceSummary confidence={confLow} suggestedStrategy="expanded" selectedStrategy="auto" />);
      expect(c2.textContent).toContain('確信度: 低');
      expect(c2.textContent).toContain('42 pts');
      expect(c2.textContent).toContain('下の候補一覧から関係するファイルを直接チェックしてください');
    });
  });

  describe('CandidateCardList', () => {
    it('displays separated Discovery and Support scores and expands evidence', () => {
      const candidate = { projectId: 'p1', relativePath: 'src/order/OrderService.ts', score: 85, reasons: ['filenameMatch' as const], matchedTerms: [] };
      const enriched = {
        candidate,
        supportScore: 65,
        evidence: [{ kind: 'relatedTest' as const, projectId: 'p1', candidatePath: 'src/order/OrderService.ts', relatedPath: 'tests/OrderService.test.ts', detail: 'test' }],
      };
      const container = render(
        <CandidateCardList
          candidates={[candidate]}
          enrichedCandidates={[enriched]}
          selectedPaths={['src/order/OrderService.ts']}
          manualInput="src/order/OrderService.ts"
          isBusy={false}
          onToggle={vi.fn()}
          onManualInputChange={vi.fn()}
        />
      );
      expect(container.textContent).toContain('Discovery 85');
      expect(container.textContent).toContain('Support 65');
      expect(container.textContent).toContain('Structural Evidence (1)');
      expect(container.textContent).toContain('relatedTest: tests/OrderService.test.ts');
      expect(container.textContent).toContain('折りたたむ ▲');

      const accordionHeader = container.querySelector('[role="button"]');
      act(() => { accordionHeader?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(container.textContent).toContain('展開 ▼');
      expect(container.querySelector('[data-testid="candidate-scroll-container"]')).toBeNull();
    });
  });

  describe('ContextPackViewer', () => {
    it('renders pack summary, allows tab switching, and triggers copy and reset', () => {
      const onCopy = vi.fn();
      const onReset = vi.fn();
      const manifest: ContextManifest = {
        projectId: 'p1',
        task: 'Fix refund',
        entryPoints: ['src/order/OrderService.ts'],
        entries: [{ projectId: 'p1', relativePath: 'src/order/OrderService.ts', role: 'target', packMode: 'full', score: 85, candidateReasons: [], recommendationReasons: [] }],
        budget: { bytes: 2000, estimatedTokens: 500, limit: 40000, withinLimit: true },
      };
      const container = render(
        <ContextPackViewer
          manifest={manifest}
          manifestMarkdown="# Manifest Output"
          packContent="# Pack Output"
          resolvedStrategy="fast"
          activeTab="manifest"
          isBusy={false}
          onTabChange={vi.fn()}
          onCopy={onCopy}
          onReset={onReset}
        />
      );
      expect(container.textContent).toContain('Strategy: FAST');
      expect(container.textContent).toContain('Files: 1');
      expect(container.textContent).toContain('Estimated Tokens: 500');

      const copyBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Copy Context Pack'));
      act(() => { copyBtn?.click(); });
      expect(onCopy).toHaveBeenCalled();

      const resetBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('New Task / Reset'));
      act(() => { resetBtn?.click(); });
      expect(onReset).toHaveBeenCalled();
    });

    it('renders ContextPackV2 with tabs, metrics, and multi-format copy', () => {
      const onCopy = vi.fn();
      const onTabChange = vi.fn();
      const packV2 = {
        schemaVersion: '2' as const,
        task: 'Fix payment timeout',
        strategy: 'knowledge-subgraph' as const,
        confidence: {},
        workingSet: { core: [], supporting: [], recallReserve: [] },
        context: [],
        excluded: [],
        metrics: {
          subgraphNodes: 8,
          workingSetEntries: 2,
          contextFiles: 2,
          contextRanges: 3,
          estimatedTokens: 1250,
          compressionRatio: 0.75,
          budgetDecision: {
            source: 'adaptive' as const,
            scope: 'standard' as const,
            budget: { maxFiles: 10, maxEstimatedTokens: 12000, maxNodes: 30, maxBytes: 50000 },
            recallReserveLimit: 2,
            reasons: ['standard'],
            signals: [],
          },
        },
      };

      const container = render(
        <ContextPackViewer
          contextPackV2={packV2}
          manifestMarkdown="# V2 Markdown"
          packContent="// V2 Code Content"
          resolvedStrategy="knowledge"
          activeTab="manifest"
          isBusy={false}
          onTabChange={onTabChange}
          onCopy={onCopy}
          onReset={vi.fn()}
        />
      );

      expect(container.textContent).toContain('Strategy: KNOWLEDGE');
      expect(container.textContent).toContain('Scope: standard');
      expect(container.textContent).toContain('Compression: 75.0%');
      expect(container.textContent).toContain('Working Set');

      const copyMdBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Copy Markdown'));
      act(() => { copyMdBtn?.click(); });
      expect(onCopy).toHaveBeenCalledWith('markdown');
    });
  });
});


const render = (node: React.ReactNode): HTMLElement => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => { root.render(node); });
  return container;
};
