// apps/mcp/statusChecker.ts
import type { Project } from '../../src/features/repository-context/domain/Project';
import type { ProjectFilePort } from '../../src/features/repository-context/application/ports';
import type { StructuredKnowledgeIndexStore } from '../../src/features/repository-context/application/structuredKnowledgePorts';
import type { SemanticIndexStore, EmbeddingPort } from '../../src/features/repository-context/application/semanticIndexPorts';
import type { McpIndexState, McpWorkspaceStatusResult } from './types';

export type StatusCheckerPorts = Readonly<{
  project: Project;
  files: ProjectFilePort;
  knowledgeStore: StructuredKnowledgeIndexStore;
  semanticStore: SemanticIndexStore;
  embeddingPort?: EmbeddingPort;
}>;

export async function checkMcpStatus(ports: StatusCheckerPorts): Promise<McpWorkspaceStatusResult> {
  const diagnostics: string[] = [];
  const repoState = await checkRepo(ports, diagnostics);
  const knowledgeState = await checkKnowledge(ports, diagnostics);
  const semanticState = await checkSemantic(ports, diagnostics);
  return {
    workspaceRoot: ports.project.rootPath,
    workspaceBound: true,
    repositoryIndex: repoState,
    knowledgeIndex: knowledgeState,
    semanticIndex: semanticState,
    diagnostics,
  };
}

async function checkRepo(ports: StatusCheckerPorts, diagnostics: string[]): Promise<McpIndexState> {
  try {
    const files = await ports.files.list(ports.project);
    return files.length > 0 ? 'ready' : 'missing';
  } catch (e) {
    diagnostics.push('Repository file scan failed: ' + String(e));
    return 'error';
  }
}

async function checkKnowledge(ports: StatusCheckerPorts, diagnostics: string[]): Promise<McpIndexState> {
  try {
    const k = await ports.knowledgeStore.load(ports.project.id);
    return k ? 'ready' : 'missing';
  } catch (e) {
    diagnostics.push('Knowledge index load failed: ' + String(e));
    return 'error';
  }
}

async function checkSemantic(ports: StatusCheckerPorts, diagnostics: string[]): Promise<McpIndexState> {
  try {
    const s = await ports.semanticStore.load(ports.project.id);
    if (!s) return 'missing';
    if (!ports.embeddingPort) return 'ready';
    await ports.embeddingPort.embed(['ping']);
    return 'ready';
  } catch (e) {
    diagnostics.push('Semantic embedding provider unavailable (degraded): ' + String(e));
    return 'degraded';
  }
}
