import type { RepositoryIR } from '../../../domain/ir';

const COMPILER_CONFIG_FILES = new Set(['tsconfig.json', 'package.json', 'package-lock.json']);
const DEPENDENT_RELATION_TYPES = new Set(['references', 'implements', 'extends', 'depends-on']);

export function isCompilerConfigChange(paths: readonly string[]): boolean {
  return paths.some(p => {
    const base = p.split('/').pop()?.toLowerCase();
    return base && COMPILER_CONFIG_FILES.has(base);
  });
}

function buildNodeIdToPathMap(ir: RepositoryIR): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of ir.nodes.values()) {
    map.set(node.id, node.path);
  }
  return map;
}

function collectIncomingPaths(
  changedSet: Set<string>,
  ir: RepositoryIR,
  idToPath: Map<string, string>,
): Set<string> {
  const dependentPaths = new Set<string>();
  for (const edge of ir.edges) {
    if (!DEPENDENT_RELATION_TYPES.has(edge.relationType)) continue;
    const targetPath = idToPath.get(edge.targetNodeId);
    if (targetPath && changedSet.has(targetPath)) {
      const sourcePath = idToPath.get(edge.sourceNodeId);
      if (sourcePath && !changedSet.has(sourcePath)) {
        dependentPaths.add(sourcePath);
      }
    }
  }
  return dependentPaths;
}

export function resolveDependentClosure(
  changedPaths: readonly string[],
  ir: RepositoryIR,
): { paths: readonly string[]; isFullFallback: boolean } {
  if (isCompilerConfigChange(changedPaths)) {
    return { paths: [], isFullFallback: true };
  }

  const changedSet = new Set(changedPaths.map(p => p.replace(/\\/g, '/')));
  const idToPath = buildNodeIdToPathMap(ir);
  const incoming = collectIncomingPaths(changedSet, ir, idToPath);
  const combined = new Set([...changedSet, ...incoming]);

  return {
    paths: Object.freeze(Array.from(combined)),
    isFullFallback: false,
  };
}
