// @vitest-environment jsdom
// apps/desktop/renderer/components/HelpModal.test.tsx
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelpModal } from './HelpModal';

const roots: Array<ReturnType<typeof createRoot>> = [];

afterEach(async () => {
  await act(async () => {
    roots.splice(0).forEach((root) => root.unmount());
  });
});

describe('HelpModal', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  const renderComponent = async (props: { isOpen: boolean; onClose(): void; onOpenSettings?(): void }) => {
    await act(async () => {
      const root = createRoot(container);
      roots.push(root);
      root.render(<HelpModal {...props} />);
    });
  };

  it('renders nothing when closed', async () => {
    await renderComponent({ isOpen: false, onClose: vi.fn() });
    expect(container.textContent).toBe('');
  });

  it('renders guide steps on default workflow tab', async () => {
    await renderComponent({ isOpen: true, onClose: vi.fn() });
    expect(container.textContent).toContain('CodePrep Help & Guide');
    expect(container.textContent).toContain('タスクを入力');
    expect(container.textContent).toContain('Find Context をクリック');
    expect(container.textContent).toContain('Build & Copy Context Pack');
  });

  it('switches tabs and triggers openSettings', async () => {
    const onOpenSettings = vi.fn();
    const onClose = vi.fn();
    await renderComponent({ isOpen: true, onClose, onOpenSettings });

    const semanticTab = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('LLM (Semantic) 検索')
    );
    expect(semanticTab).toBeDefined();
    await act(async () => {
      semanticTab?.click();
    });
    expect(container.textContent).toContain('ollama pull nomic-embed-text');

    const openSettingsBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Open Settings')
    );
    expect(openSettingsBtn).toBeDefined();
    await act(async () => {
      openSettingsBtn?.click();
    });
    expect(onClose).toHaveBeenCalled();
    expect(onOpenSettings).toHaveBeenCalled();

    const gitignoreTab = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('.gitignore と機密保護')
    );
    await act(async () => {
      gitignoreTab?.click();
    });
    expect(container.textContent).toContain('機密ファイルのビルトイン保護');
  });
});
