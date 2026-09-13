import { describe, expect, it } from 'vitest';
import {
  buildEdgeId,
  buildSymbolNodeId,
  createEvidence,
  createRepositoryEdge,
  createRepositoryNode,
  type RepositoryEdge,
  type RepositoryNode,
} from '../index';

describe('RepositoryIR Integration Scenarios (LSP, DI, and Derived Runtime)', () => {
  const snapshotId = 'snap-2026';

  // Nodes
  const useCaseMethodNode: RepositoryNode = createRepositoryNode({
    id: buildSymbolNodeId(snapshotId, 'src/features/selection/ClipboardSelectionUseCase.ts', 'method', 'resolve', 45),
    snapshotId,
    kind: 'symbol',
    name: 'ClipboardSelectionUseCase.resolve',
    path: 'src/features/selection/ClipboardSelectionUseCase.ts',
    language: 'typescript',
  });

  const portMethodNode: RepositoryNode = createRepositoryNode({
    id: buildSymbolNodeId(snapshotId, 'src/features/selection/WorkspacePathResolver.ts', 'method', 'resolve', 12),
    snapshotId,
    kind: 'symbol',
    name: 'WorkspacePathResolver.resolve',
    path: 'src/features/selection/WorkspacePathResolver.ts',
    language: 'typescript',
  });

  const adapterMethodNode: RepositoryNode = createRepositoryNode({
    id: buildSymbolNodeId(snapshotId, 'src/features/selection/VSCodeWorkspacePathResolver.ts', 'method', 'resolve', 25),
    snapshotId,
    kind: 'symbol',
    name: 'VSCodeWorkspacePathResolver.resolve',
    path: 'src/features/selection/VSCodeWorkspacePathResolver.ts',
    language: 'typescript',
  });

  it('expresses LSP CALLS fact with language-server evidence', () => {
    const lspEvidence = createEvidence({
      id: 'ev-lsp-1',
      category: 'language-server',
      analyzer: 'typescript-language-server',
      confidence: 1.0,
      sourcePath: useCaseMethodNode.path,
      sourceLocation: { startLine: 48, endLine: 48, startColumn: 10, endColumn: 35 },
      details: { capability: 'callHierarchy' },
    });

    const callsEdge: RepositoryEdge = createRepositoryEdge({
      id: buildEdgeId(snapshotId, useCaseMethodNode.id, 'calls', portMethodNode.id),
      snapshotId,
      sourceNodeId: useCaseMethodNode.id,
      targetNodeId: portMethodNode.id,
      relationType: 'calls',
      isDerived: false,
      confidence: 1.0,
      evidences: [lspEvidence],
    });

    expect(callsEdge.relationType).toBe('calls');
    expect(callsEdge.isDerived).toBe(false);
    expect(callsEdge.evidences[0].category).toBe('language-server');
  });

  it('expresses DI BINDS_TO fact with framework-analyzer evidence', () => {
    const diEvidence = createEvidence({
      id: 'ev-di-1',
      category: 'framework-analyzer',
      analyzer: 'manual-composition',
      confidence: 1.0,
      sourcePath: 'src/features/selection/composition.ts',
      details: { container: 'RepositoryContextContainer', lifetime: 'singleton' },
    });

    const bindsToEdge: RepositoryEdge = createRepositoryEdge({
      id: buildEdgeId(snapshotId, portMethodNode.id, 'binds-to', adapterMethodNode.id),
      snapshotId,
      sourceNodeId: portMethodNode.id,
      targetNodeId: adapterMethodNode.id,
      relationType: 'binds-to',
      isDerived: false,
      confidence: 1.0,
      evidences: [diEvidence],
    });

    expect(bindsToEdge.relationType).toBe('binds-to');
    expect(bindsToEdge.isDerived).toBe(false);
    expect(bindsToEdge.evidences[0].category).toBe('framework-analyzer');
  });

  it('expresses Derived Runtime MAY_DISPATCH_TO edge derived from CALLS + BINDS_TO', () => {
    const callsEdgeId = buildEdgeId(snapshotId, useCaseMethodNode.id, 'calls', portMethodNode.id);
    const bindsToEdgeId = buildEdgeId(snapshotId, portMethodNode.id, 'binds-to', adapterMethodNode.id);

    const derivationEvidence = createEvidence({
      id: 'ev-der-dispatch',
      category: 'rule-derived',
      analyzer: 'runtime-dispatch-deriver',
      confidence: 0.95,
      derivation: {
        derivedFromEdgeIds: [callsEdgeId, bindsToEdgeId],
        ruleName: 'port-to-adapter-dispatch',
        description: 'Resolved polymorphic call to concrete adapter via container binding',
      },
    });

    const dispatchEdge: RepositoryEdge = createRepositoryEdge({
      id: buildEdgeId(snapshotId, useCaseMethodNode.id, 'may-dispatch-to', adapterMethodNode.id),
      snapshotId,
      sourceNodeId: useCaseMethodNode.id,
      targetNodeId: adapterMethodNode.id,
      relationType: 'may-dispatch-to',
      isDerived: true,
      confidence: 0.95,
      evidences: [derivationEvidence],
    });

    expect(dispatchEdge.relationType).toBe('may-dispatch-to');
    expect(dispatchEdge.isDerived).toBe(true);
    expect(dispatchEdge.confidence).toBe(0.95);
    expect(dispatchEdge.evidences[0].derivation?.derivedFromEdgeIds).toEqual([callsEdgeId, bindsToEdgeId]);
  });
});
