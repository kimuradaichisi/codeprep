// apps/desktop/renderer/hooks/workspaceDocGraph.ts
import type { DesktopApi } from '../../DesktopApi';
import type { CandidateReason } from '../../../../src/features/repository-context/domain/CandidateFile';
import { desktopErrorMessage } from '../DesktopWorkflow';
import { candidateKey } from '../model/tokenBudget';
import type { SetWorkspace } from './workspaceState';
import { update } from './workspaceState';

export const handleDocGraphRelations = async (
  api: DesktopApi,
  set: SetWorkspace,
  addedKeys: readonly string[]
): Promise<void> => {
  for (const key of addedKeys) {
    const [projectId, ...pathParts] = key.split(':');
    const relativePath = pathParts.join(':');
    if (relativePath.toLowerCase().endsWith('.md')) {
      await fetchRelatedDocs(api, set, projectId, relativePath);
    }
  }
};

const fetchRelatedDocs = async (
  api: DesktopApi,
  set: SetWorkspace,
  projectId: string,
  relativePath: string
): Promise<void> => {
  try {
    const result = await api.discoverFiles({
      projectIds: [projectId],
      recipe: { kind: 'docGraph', path: relativePath },
    });
    set((current) => mergeDocGraphCandidates(current, result.candidates));
  } catch (error) {
    update(set, { outputNotice: `DocGraph 関連の読み込みに失敗しました: ${desktopErrorMessage(error)}` });
  }
};

function mergeDocGraphCandidates(
  current: import('./workspaceState').WorkspaceState,
  newCandidates: readonly import('../../../../src/features/repository-context/application/ports').AnalyzedCandidate[]
): import('./workspaceState').WorkspaceState {
  const nextCandidates = [...current.candidates];
  const newKeys: string[] = [];
  for (const c of newCandidates) {
    mergeSingleCandidate(c, current.selectedKeys, nextCandidates, newKeys);
  }
  return { ...current, candidates: nextCandidates, selectedKeys: [...current.selectedKeys, ...newKeys] };
}

function mergeSingleCandidate(
  c: import('../../../../src/features/repository-context/application/ports').AnalyzedCandidate,
  selectedKeys: readonly string[],
  nextCandidates: import('../../../../src/features/repository-context/application/ports').AnalyzedCandidate[],
  newKeys: string[]
): void {
  const key = candidateKey(c.projectId, c.relativePath);
  const idx = nextCandidates.findIndex((item) => candidateKey(item.projectId, item.relativePath) === key);
  if (idx !== -1) {
    updateExistingCandidate(c, nextCandidates, idx, key, selectedKeys, newKeys);
  } else {
    nextCandidates.push(c);
    newKeys.push(key);
  }
}

function updateExistingCandidate(
  c: import('../../../../src/features/repository-context/application/ports').AnalyzedCandidate,
  nextCandidates: import('../../../../src/features/repository-context/application/ports').AnalyzedCandidate[],
  idx: number,
  key: string,
  selectedKeys: readonly string[],
  newKeys: string[]
): void {
  const existing = nextCandidates[idx];
  const reasons: readonly CandidateReason[] = existing.reasons.includes('docgraph')
    ? existing.reasons
    : [...existing.reasons, 'docgraph'];
  nextCandidates[idx] = { ...existing, reasons, score: c.score };
  if (!selectedKeys.includes(key)) newKeys.push(key);
}
