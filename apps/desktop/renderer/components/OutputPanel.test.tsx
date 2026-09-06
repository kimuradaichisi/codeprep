// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { OutputPanel } from './OutputPanel';
import type { OutputPanelProps } from '../types';

describe('OutputPanel', () => {
  it('renders Save output button disabled when preview is empty', async () => {
    const props = createDefaultProps({ preview: '' });
    const container = renderPanel(props);
    const saveButton = getButton(container, 'Save output');

    expect(saveButton).not.toBeNull();
    expect(saveButton?.disabled).toBe(true);
    expect(saveButton?.getAttribute('type')).toBe('button');
  });

  it('enables Save output button when preview has content', async () => {
    const props = createDefaultProps({ preview: '# Generated Content' });
    const container = renderPanel(props);
    const saveButton = getButton(container, 'Save output');

    expect(saveButton?.disabled).toBe(false);
  });

  it('calls saveOutput once when Save output button is clicked', async () => {
    const saveOutput = vi.fn().mockResolvedValue(undefined);
    const props = createDefaultProps({ preview: '# Content', saveOutput });
    const container = renderPanel(props);
    const saveButton = getButton(container, 'Save output');

    await act(async () => {
      saveButton?.click();
    });

    expect(saveOutput).toHaveBeenCalledTimes(1);
  });

  it('disables Save output button and displays Saving... when isSaving is true', async () => {
    const props = createDefaultProps({ preview: '# Content', isSaving: true });
    const container = renderPanel(props);
    const savingButton = getButton(container, 'Saving...');

    expect(savingButton).not.toBeNull();
    expect(savingButton?.disabled).toBe(true);
  });

  it('disables Generate output button and displays Generating... when isGenerating is true', async () => {
    const props = createDefaultProps({ preview: '# Content', isGenerating: true });
    const container = renderPanel(props);
    const generatingButton = getButton(container, 'Generating...');

    expect(generatingButton).not.toBeNull();
    expect(generatingButton?.disabled).toBe(true);
  });
});

const renderPanel = (props: OutputPanelProps): HTMLElement => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(<OutputPanel {...props} />);
  });
  return container;
};

const getButton = (container: HTMLElement, text: string): HTMLButtonElement | null => {
  const buttons = Array.from(container.querySelectorAll('button'));
  return (buttons.find(b => b.textContent?.trim() === text) as HTMLButtonElement) ?? null;
};

const createDefaultProps = (overrides: Partial<OutputPanelProps> = {}): OutputPanelProps => ({
  packMode: 'full',
  tokenLimit: 50000,
  format: 'markdown',
  preview: '',
  outputNotice: undefined,
  includeDependencies: false,
  includeRelatedDocs: false,
  autoOptimize: false,
  activeTab: 'preview',
  isSaving: false,
  setFormat: vi.fn(),
  setPackMode: vi.fn(),
  setTokenLimit: vi.fn(),
  setIncludeDependencies: vi.fn(),
  setIncludeRelatedDocs: vi.fn(),
  setAutoOptimize: vi.fn(),
  setActiveTab: vi.fn(),
  generateOutput: vi.fn(async () => undefined),
  copyOutput: vi.fn(async () => undefined),
  saveOutput: vi.fn(async () => undefined),
  ...overrides,
});
