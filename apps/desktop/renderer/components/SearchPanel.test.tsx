// apps/desktop/renderer/components/SearchPanel.test.tsx
// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { SearchPanel } from './SearchPanel';
import type { SearchPanelProps } from '../types';
import { defaultRecommendationSettings } from '../../../../src/features/repository-context/domain/Recommendation';

describe('SearchPanel', () => {
  it('disables Analyze button and shows Analyzing... when isAnalyzing is true', () => {
    const props = createProps({ isAnalyzing: true, query: 'test' });
    const container = renderPanel(props);
    const button = getButton(container, 'Analyzing...');

    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
    expect(button?.querySelector('.inline-spinner')).not.toBeNull();
  });

  it('disables inputs and clear button when isAnalyzing is true', () => {
    const props = createProps({ isAnalyzing: true, query: 'test' });
    const container = renderPanel(props);
    const clearBtn = getButton(container, 'Clear');
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Query"]');

    expect(clearBtn?.disabled).toBe(true);
    expect(input?.disabled).toBe(true);
  });

  it('shows regular Analyze button when isAnalyzing is false', () => {
    const props = createProps({ isAnalyzing: false, query: 'test' });
    const container = renderPanel(props);
    const button = getButton(container, 'Analyze');

    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(false);
  });

  it('supports clipboardPaths recipe without query input', () => {
    const props = createProps({ recipeKind: 'clipboardPaths', isAnalyzing: false });
    const container = renderPanel(props);
    const button = getButton(container, 'Analyze');

    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(false);
  });

  it('renders Task Context mode inputs and buttons', () => {
    const props = createProps({
      discoveryMode: 'task',
      taskInput: '返品処理を追加',
      entryPointInput: 'src/order/OrderService.ts',
    });
    const container = renderPanel(props);

    const taskInput = container.querySelector<HTMLInputElement>('input[aria-label="Task description"]');
    const epInput = container.querySelector<HTMLInputElement>('input[aria-label="Entry points"]');
    const button = getButton(container, 'Build Context');

    expect(taskInput?.value).toBe('返品処理を追加');
    expect(epInput?.value).toBe('src/order/OrderService.ts');
    expect(button?.disabled).toBe(false);

    act(() => {
      button?.click();
    });
    expect(props.analyzeTask).toHaveBeenCalled();
  });

  it('renders Find Entry Points button and candidate list', () => {
    const discoverEntryPoints = vi.fn(async () => {});
    const toggleEntryPointCandidate = vi.fn();
    const props = createProps({
      discoveryMode: 'task',
      taskInput: '返品二重返金',
      discoverEntryPoints,
      toggleEntryPointCandidate,
      entryPointCandidates: [
        { projectId: 'p1', relativePath: 'src/Refund.ts', score: 95, reasons: ['filenameMatch'], matchedTerms: ['Refund'] },
      ],
    });
    const container = renderPanel(props);

    const findBtn = getButton(container, 'Find Entry Points');
    expect(findBtn).not.toBeNull();
    act(() => {
      findBtn?.click();
    });
    expect(discoverEntryPoints).toHaveBeenCalled();
    expect(container.textContent).toContain('Refund.ts');
    expect(container.textContent).toContain('95 pts');
  });
});

const renderPanel = (props: SearchPanelProps): HTMLElement => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(<SearchPanel {...props} />);
  });
  return container;
};

const getButton = (container: HTMLElement, text: string): HTMLButtonElement | null => {
  const buttons = Array.from(container.querySelectorAll('button'));
  return (buttons.find(b => b.textContent?.trim() === text) as HTMLButtonElement) ?? null;
};

const createProps = (overrides: Partial<SearchPanelProps> = {}): SearchPanelProps => ({
  discoveryMode: 'search',
  taskInput: '',
  entryPointInput: '',
  recipeKind: 'text',
  query: '',
  contextLines: 3,
  searchNotice: undefined,
  presetKind: 'custom',
  useGitignore: true,
  recommendationSettings: defaultRecommendationSettings(),
  isAnalyzing: false,
  setDiscoveryMode: vi.fn(),
  setTaskInput: vi.fn(),
  setEntryPointInput: vi.fn(),
  setRecipeKind: vi.fn(),
  setQuery: vi.fn(),
  setContextLines: vi.fn(),
  setPresetKind: vi.fn(),
  setUseGitignore: vi.fn(),
  setRecommendationSettings: vi.fn(),
  analyze: vi.fn(async () => undefined),
  analyzeTask: vi.fn(async () => undefined),
  clearSearch: vi.fn(async () => undefined),
  ...overrides,
});
