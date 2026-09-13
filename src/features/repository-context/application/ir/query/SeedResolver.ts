import type { RepositoryNode } from '../../../domain/ir';
import type { RepositoryKnowledgeStore } from '../persistence/RepositoryKnowledgeStore';
import type { RepositoryTaskQuery, SubgraphSeed } from './TaskQueryDto';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that',
  'from', 'as', 'into', 'and', 'not', 'it', 'its', 'their', 'we', 'you',
  'の', 'に', 'を', 'は', 'が', 'で', 'と', 'て', 'た', 'な', 'も', 'へ',
]);

export function tokenizeTask(taskText: string): readonly string[] {
  const words = taskText.split(/[\s,.;:!?/\\()[\]{}'"・、。、「」『』（）〜~_\-+=*&^%$#@!|<>]+/);
  const tokens = new Set<string>();

  const identifiers = taskText.match(/[a-zA-Z][a-zA-Z0-9_-]{2,}/g) ?? [];
  for (const id of identifiers) {
    if (!STOP_WORDS.has(id.toLowerCase())) tokens.add(id);
  }

  for (const w of words) {
    const trimmed = w.trim();
    if (trimmed.length < 2 || STOP_WORDS.has(trimmed.toLowerCase())) continue;
    tokens.add(trimmed);

    const camelParts = trimmed.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
    if (camelParts.length > 1) {
      for (const p of camelParts) {
        if (p.length >= 3 && !STOP_WORDS.has(p.toLowerCase())) tokens.add(p);
      }
    }
  }
  return Object.freeze(Array.from(tokens));
}

async function resolveExplicitSeeds(
  explicitPaths: readonly string[],
  snapshotId: string,
  store: RepositoryKnowledgeStore
): Promise<SubgraphSeed[]> {
  const seeds: SubgraphSeed[] = [];
  for (const p of explicitPaths) {
    const nodes = await store.findNodes({ snapshotId, path: p });
    for (const node of nodes) {
      seeds.push({
        nodeId: node.id,
        path: node.path,
        score: 1.0,
        matchType: 'explicit-path',
        matchedText: p,
      });
    }
  }
  return seeds;
}

function calculateMatchScore(token: string, node: RepositoryNode): { score: number; matchType: SubgraphSeed['matchType'] } {
  const normName = node.name.toLowerCase();
  const normToken = token.toLowerCase();
  const normPath = node.path.toLowerCase();

  if (node.kind === 'symbol' && normName === normToken) {
    return { score: 0.98, matchType: 'symbol-name' };
  }
  if (node.kind === 'file' && (normName === normToken || normName === `${normToken}.ts` || normName === `${normToken}.tsx`)) {
    return { score: 0.95, matchType: 'filename' };
  }
  if (node.kind === 'file' && (normPath.endsWith(`/${normToken}.ts`) || normPath.endsWith(`/${normToken}.tsx`))) {
    return { score: 0.92, matchType: 'filename' };
  }
  if (node.kind === 'doc-section' && normToken.length >= 4) {
    if (normName === normToken) return { score: 0.85, matchType: 'heading' };
    if (normName.includes(normToken)) return { score: 0.70, matchType: 'heading' };
  }
  if (normPath.includes(normToken) && normToken.length >= 3) {
    return { score: 0.60, matchType: 'path-token' };
  }
  return { score: 0.30, matchType: 'path-token' };
}

async function searchTokenCandidates(
  token: string,
  snapshotId: string,
  store: RepositoryKnowledgeStore
): Promise<Array<{ node: RepositoryNode; token: string }>> {
  const found = await store.findNodes({ snapshotId, query: token, limit: 15 });
  return found.map(node => ({ node, token }));
}

export class SeedResolver {
  constructor(private readonly store: RepositoryKnowledgeStore) {}

  public async resolve(query: RepositoryTaskQuery): Promise<readonly SubgraphSeed[]> {
    const maxSeeds = query.maxSeeds ?? 10;
    const explicitSeeds = query.optionalExplicitPaths && query.optionalExplicitPaths.length > 0
      ? await resolveExplicitSeeds(query.optionalExplicitPaths, query.snapshotId, this.store)
      : [];

    if (explicitSeeds.length >= maxSeeds) {
      return Object.freeze(explicitSeeds.slice(0, maxSeeds));
    }

    const tokens = tokenizeTask(query.task);
    const tokenCandidates = await Promise.all(tokens.map(t => searchTokenCandidates(t, query.snapshotId, this.store)));
    const bestByNodeId = new Map<string, SubgraphSeed>();

    for (const seed of explicitSeeds) bestByNodeId.set(seed.nodeId, seed);

    for (const group of tokenCandidates) {
      for (const { node, token } of group) {
        const { score, matchType } = calculateMatchScore(token, node);
        const existing = bestByNodeId.get(node.id);
        if (!existing || score > existing.score) {
          bestByNodeId.set(node.id, { nodeId: node.id, path: node.path, score, matchType, matchedText: token });
        }
      }
    }

    const sorted = Array.from(bestByNodeId.values()).sort((a, b) => b.score - a.score);
    return Object.freeze(sorted.slice(0, maxSeeds));
  }
}
