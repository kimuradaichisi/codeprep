// apps/desktop/renderer/components/SearchPanel.test.tsx
// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { SearchPanel } from './SearchPanel';
import type { SearchPanelProps } from '../types';
import { defaultRecommendationSettings } from '../../../../src/features/desktop-core/domain/Recommendation';

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
  recipeKind: 'text',
  query: '',
  contextLines: 3,
  searchNotice: undefined,
  presetKind: 'custom',
  useGitignore: true,
  recommendationSettings: defaultRecommendationSettings(),
  isAnalyzing: false,
  setRecipeKind: vi.fn(),
  setQuery: vi.fn(),
  setContextLines: vi.fn(),
  setPresetKind: vi.fn(),
  setUseGitignore: vi.fn(),
  setRecommendationSettings: vi.fn(),
  analyze: vi.fn(async () => undefined),
  clearSearch: vi.fn(async () => undefined),
  ...overrides,
});
