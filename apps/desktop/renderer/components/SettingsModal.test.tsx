// @vitest-environment jsdom
// apps/desktop/renderer/components/SettingsModal.test.tsx
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsModal } from './SettingsModal';

const roots: Array<ReturnType<typeof createRoot>> = [];

afterEach(async () => {
  await act(async () => {
    roots.splice(0).forEach((root) => root.unmount());
  });
});

describe('SettingsModal', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  const renderComponent = async (props: { onClose(): void; onSaved?(s: unknown): void }) => {
    await act(async () => {
      const root = createRoot(container);
      roots.push(root);
      root.render(<SettingsModal {...props} />);
    });
  };

  it('renders default settings and handles input changes', async () => {
    await renderComponent({ onClose: vi.fn() });

    expect(container.textContent).toContain('LLM & Context Generation Settings');
    const input = container.querySelector('input[placeholder="http://localhost:11434"]') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe('http://localhost:11434');

    await act(async () => {
      input.value = 'http://127.0.0.1:11434';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(input.value).toBe('http://127.0.0.1:11434');
  });

  it('handles Save Settings button click', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    await renderComponent({ onClose, onSaved });

    const saveBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Save Settings');
    expect(saveBtn).toBeDefined();

    await act(async () => {
      saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
