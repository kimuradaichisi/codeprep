// apps/desktop/renderer/components/ProjectPanel.test.tsx
// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ProjectPanel } from './ProjectPanel';
import type { ProjectPanelProps } from '../types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

const setValue = (input: HTMLInputElement, value: string): void => {
  const win = input.ownerDocument.defaultView ?? window;
  const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')?.set;
  if (!setter) throw new Error('Input setter is unavailable.');
  setter.call(input, value);
};

describe('ProjectPanel', () => {
  const createProps = (overrides?: Partial<ProjectPanelProps>): ProjectPanelProps => ({
    projects: [],
    projectNotice: undefined,
    indexStatus: undefined,
    indexTotalFiles: undefined,
    knowledgeStatus: undefined,
    knowledgeEntries: undefined,
    semanticStatus: undefined,
    semanticEntries: undefined,
    refreshIndex: vi.fn(),
    addProject: vi.fn().mockResolvedValue(undefined),
    chooseProjectFolder: vi.fn().mockResolvedValue(undefined),
    removeProject: vi.fn(),
    ...overrides,
  });

  const renderPanel = async (props: ProjectPanelProps): Promise<HTMLDivElement> => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<ProjectPanel {...props} />);
      await flush();
    });
    return container;
  };

  it('空パスのときは Add ボタンが無効であること', async () => {
    const props = createProps();
    const container = await renderPanel(props);
    const addButton = container.querySelectorAll<HTMLButtonElement>('button')[1];

    expect(addButton).not.toBeNull();
    expect(addButton?.textContent).toBe('Add');
    expect(addButton?.disabled).toBe(true);
  });

  it('パス入力後に Add ボタンを押すと Adding... とスピナーが表示され、完了後に戻ること', async () => {
    let resolveAdd: () => void = () => {};
    const addPromise = new Promise<void>((resolve) => { resolveAdd = resolve; });
    const addProject = vi.fn().mockReturnValue(addPromise);

    const props = createProps({ addProject });
    const container = await renderPanel(props);
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Project path"]')!;
    const addButton = container.querySelectorAll<HTMLButtonElement>('button')[1];

    act(() => {
      setValue(input, '/path/to/project');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(addButton.disabled).toBe(false);

    act(() => {
      addButton.click();
    });

    // 処理中の検証
    expect(addButton.disabled).toBe(true);
    expect(addButton.textContent).toContain('Adding...');
    expect(addButton.querySelector('.inline-spinner')).not.toBeNull();

    // 走査インジケーターが表示されていること
    const indicator = container.querySelector('[role="status"]');
    expect(indicator).not.toBeNull();
    expect(indicator?.textContent).toContain('プロジェクトを走査しています...');

    // 完了させる
    await act(async () => {
      resolveAdd();
      await addPromise;
    });

    // 完了後の検証
    expect(addButton.textContent).toBe('Add');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('Choose ボタン押下時も処理中はボタンが無効化され走査インジケーターが表示されること', async () => {
    let resolveChoose: () => void = () => {};
    const choosePromise = new Promise<void>((resolve) => { resolveChoose = resolve; });
    const chooseProjectFolder = vi.fn().mockReturnValue(choosePromise);

    const props = createProps({ chooseProjectFolder });
    const container = await renderPanel(props);
    const chooseButton = container.querySelectorAll<HTMLButtonElement>('button')[0];
    const addButton = container.querySelectorAll<HTMLButtonElement>('button')[1];

    act(() => {
      chooseButton.click();
    });

    expect(chooseButton.disabled).toBe(true);
    expect(addButton.disabled).toBe(true);
    expect(container.querySelector('[role="status"]')).not.toBeNull();

    await act(async () => {
      resolveChoose();
      await choosePromise;
    });

    expect(chooseButton.disabled).toBe(false);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
