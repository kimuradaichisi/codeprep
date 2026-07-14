// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { DesktopApi } from '../DesktopApi';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const projects = [{ id: 'p1', name: 'Demo', rootPath: 'C:/demo' }];
const candidates = [{ projectId: 'p1', relativePath: 'src/auth.ts', reasons: ['rgMatch'] as const, excluded: false, score: 35 }];

describe('App interactions', () => {
  it('executes the desktop workflow and surfaces bridge errors', async () => {
    const api = createApi();
    const container = document.createElement('div');
    const root = createRoot(container);

    await render(root, <App api={api} />);
    await removeProject(container);
    await addProject(container);
    await analyze(container);
    await toggle(container, 'Include src/auth.ts');
    await generate(container);
    await copy(container);

    expect(container.textContent).toContain('Demo');
    expect(api.removeProject).toHaveBeenCalledWith('p1');
    expect(api.addProject).toHaveBeenCalledWith('C:/new');
    expect(api.analyzeProjects).toHaveBeenCalledWith({ query: 'auth', projectIds: ['p1'], contextLines: 3 });
    expect(api.generateOutput).toHaveBeenCalledWith({ candidates, format: 'markdown', maxFileSizeKB: 500, packMode: 'full', tokenLimit: 12000, includeDependencies: false, autoOptimize: false });

    expect(container.textContent).toContain('context');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Clipboard unavailable');
    await act(async () => root.unmount());
  });
});

const createApi = (): DesktopApi => ({
  addProject: vi.fn(async () => projects), analyzeProjects: vi.fn(async () => ({ candidates, warnings: [] })),
  chooseProjectFolder: vi.fn(async () => undefined),
  discoverFiles: vi.fn(async () => ({ candidates, warnings: [] })),
  copyOutput: vi.fn(async () => Promise.reject(new Error('Clipboard unavailable'))),
  generateOutput: vi.fn(async () => ({ preview: 'context', warning: 'Output is temporary.' })),
  listProjectFiles: vi.fn(async () => []), listProjects: vi.fn(async () => projects), removeProject: vi.fn(async () => []),
  readFileContent: vi.fn(async () => ''),
});

const render = async (root: ReturnType<typeof createRoot>, element: ReactElement): Promise<void> => {
  await act(async () => { root.render(element); await flush(); });
};

const addProject = async (container: Element): Promise<void> => {
  setInput(container, 'Project path', 'C:/new');
  await click(container, 'Add project');
};

const removeProject = async (container: Element): Promise<void> =>
  click(container, 'Remove');

const analyze = async (container: Element): Promise<void> => {
  setInput(container, 'Query', 'auth');
  await click(container, 'Analyze');
};

const generate = async (container: Element): Promise<void> => click(container, 'Generate output');
const copy = async (container: Element): Promise<void> => click(container, 'Copy output');

const toggle = async (container: Element, label: string): Promise<void> => {
  const input = findAll<HTMLInputElement>(container, `input[aria-label="${label}"]`)[0];
  if (!input) return;
  await act(async () => { input.click(); await flush(); });
};

const click = async (container: Element, label: string): Promise<void> => {
  await act(async () => { findButton(container, label).click(); await flush(); });
};

const setInput = (container: Element, label: string, value: string): void => {
  const input = findInput(container, label);
  setValue(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const findButton = (container: Element, label: string): HTMLButtonElement =>
  findAll<HTMLButtonElement>(container, 'button').find(button => button.textContent === label) ?? missing(label);

const findInput = (container: Element, label: string): HTMLInputElement =>
  findAll<HTMLInputElement>(container, `input[aria-label="${label}"]`)[0] ?? missing(label);

const findAll = <Value extends Element>(container: Element, selector: string): Value[] =>
  Array.from(container.querySelectorAll<Value>(selector));

const missing = (label: string): never => { throw new Error(`Missing ${label}.`); };

const setValue = (input: HTMLInputElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (!setter) throw new Error('Input setter is unavailable.');
  setter.call(input, value);
};

const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));
