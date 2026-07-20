// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CandidateTree } from './CandidateTree';
import type { CandidateTreeProps } from '../types';
import type { AnalyzedCandidate } from '../../../../src/features/desktop-core/application/ports';

const candidate: AnalyzedCandidate = {
  projectId: 'p1', relativePath: 'src/auth.ts', reasons: ['pathAffinity'], excluded: false, score: 0, size: 400,
};

const createProps = (overrides: Partial<CandidateTreeProps> = {}): CandidateTreeProps => ({
  tree: [], candidates: [candidate], selectedKeys: ['p1:src/auth.ts'], tokenLimit: 80, sortKey: 'name',
  setSortKey: vi.fn(), favorites: [], favoritesOnly: false, toggleTreeNode: vi.fn(), selectAll: vi.fn(),
  clearAll: vi.fn(), viewFile: vi.fn(), setFilePackMode: vi.fn(), setFavoritesOnly: vi.fn(), toggleFavorite: vi.fn(),
  ...overrides,
});

const roots: Array<ReturnType<typeof createRoot>> = [];

afterEach(async () => {
  await act(async () => {
    roots.splice(0).forEach(root => root.unmount());
  });
});

const renderTree = async (props: CandidateTreeProps): Promise<HTMLDivElement> => {
  const container = document.createElement('div');
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(<CandidateTree {...props} />));
  return container;
};

describe('CandidateTree', () => {
  it('shows the selected token summary and file count', async () => {
    const container = await renderTree(createProps());

    expect(container.textContent).toContain('~100 / 80 tokens');
    expect(container.textContent).toContain('1 files');
  });

  it('marks the summary and budget bar as over budget', async () => {
    const container = await renderTree(createProps());

    expect(container.querySelector('.token-summary.over')).not.toBeNull();
    expect(container.querySelector('.budget-bar-fill.over')).not.toBeNull();
  });

  it('omits the budget bar when there are no candidates', async () => {
    const container = await renderTree(createProps({ candidates: [] }));

    expect(container.querySelector('.budget-bar')).toBeNull();
  });

  it('normalizes invalid budget ARIA values and describes overflow', async () => {
    const container = await renderTree(createProps({ tokenLimit: Number.NaN }));
    const budgetBar = container.querySelector('.budget-bar');

    expect(budgetBar?.getAttribute('aria-valuemax')).toBe('1');
    expect(budgetBar?.getAttribute('aria-valuenow')).toBe('1');
    expect(budgetBar?.getAttribute('aria-valuetext')).toContain('over budget');
  });

  it('sort controls are focusable buttons', async () => {
    const setSortKey = vi.fn();
    const container = await renderTree(createProps({ setSortKey }));
    const sizeButton = findButton(container, 'Size');

    sizeButton.click();
    expect(setSortKey).toHaveBeenCalledOnce();
    expect(setSortKey).toHaveBeenCalledWith('size');
    for (const label of ['Size', 'Tokens', 'Name']) {
      const button = findButton(container, label);
      expect(button.tagName).toBe('BUTTON');
      expect(button.type).toBe('button');
      expect(button.tabIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it('toggles a fallback candidate through the tree selection handler', async () => {
    const toggleTreeNode = vi.fn();
    const container = await renderTree(createProps({ toggleTreeNode, selectedKeys: [] }));
    const checkbox = container.querySelector<HTMLInputElement>('input[aria-label="Include src/auth.ts"]');

    checkbox?.click();

    expect(toggleTreeNode).toHaveBeenCalledOnce();
    expect(toggleTreeNode).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1:src/auth.ts' }), 'p1:src/auth.ts');
  });

  it('labels fallback favorite and pack mode controls', async () => {
    const container = await renderTree(createProps());
    const favorite = container.querySelector<HTMLButtonElement>('.fav-btn');
    const packMode = container.querySelector<HTMLSelectElement>('.tree-node-mode select');

    expect(favorite?.type).toBe('button');
    expect(favorite?.getAttribute('aria-label')).toBe('Add favorite src/auth.ts');
    expect(packMode?.getAttribute('aria-label')).toBe('Pack mode for src/auth.ts');
  });
});

const findButton = (container: Element, label: string): HTMLButtonElement =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === label)
  ?? (() => { throw new Error(`Missing ${label}.`); })();