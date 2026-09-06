import {
  CURRENT_SEMANTIC_SCHEMA_VERSION,
  type SemanticIndex,
  type SemanticIndexMetadata,
} from '../../domain/SemanticIndex';
import type { SemanticIndexEntry } from '../../domain/SemanticIndexEntry';

interface SerializedEntry {
  readonly knowledgeEntryId: string;
  readonly projectId: string;
  readonly relativePath: string;
  readonly knowledgeKind: 'markdown-section' | 'code-symbol';
  readonly vector: number[];
  readonly embeddingTextHash?: string;
}

export function serializeSemanticIndex(index: SemanticIndex): string {
  const entries: SerializedEntry[] = index.entries.map((e) => ({
    knowledgeEntryId: e.knowledgeEntryId,
    projectId: e.projectId,
    relativePath: e.relativePath,
    knowledgeKind: e.knowledgeKind,
    vector: Array.from(e.vector),
    embeddingTextHash: e.embeddingTextHash,
  }));
  return JSON.stringify({ metadata: index.metadata, entries }, null, 2);
}

function parseVector(raw: unknown, dim: number): Float32Array | null {
  if (!Array.isArray(raw) || raw.length !== dim) return null;
  const arr = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    const val = raw[i];
    if (typeof val !== 'number' || !Number.isFinite(val)) return null;
    arr[i] = val;
  }
  return arr;
}

function isValidEntryProps(obj: Record<string, unknown>): boolean {
  if (typeof obj.knowledgeEntryId !== 'string' || typeof obj.projectId !== 'string') return false;
  if (typeof obj.relativePath !== 'string') return false;
  return obj.knowledgeKind === 'markdown-section' || obj.knowledgeKind === 'code-symbol';
}

function parseEntry(raw: unknown, dim: number): SemanticIndexEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const vec = parseVector(obj.vector, dim);
  if (!vec || !isValidEntryProps(obj)) return null;
  return {
    knowledgeEntryId: obj.knowledgeEntryId as string,
    projectId: obj.projectId as string,
    relativePath: obj.relativePath as string,
    knowledgeKind: obj.knowledgeKind as 'markdown-section' | 'code-symbol',
    vector: vec,
    embeddingTextHash: typeof obj.embeddingTextHash === 'string' ? obj.embeddingTextHash : undefined,
  };
}

function parseEntries(rawList: unknown[], dim: number): SemanticIndexEntry[] | null {
  const result: SemanticIndexEntry[] = [];
  for (const item of rawList) {
    const entry = parseEntry(item, dim);
    if (!entry) return null;
    result.push(entry);
  }
  return result;
}

export function deserializeSemanticIndex(text: string): SemanticIndex | null {
  try {
    const parsed = JSON.parse(text) as { metadata?: SemanticIndexMetadata; entries?: unknown[] };
    if (parsed?.metadata?.schemaVersion !== CURRENT_SEMANTIC_SCHEMA_VERSION) return null;
    const dim = parsed?.metadata?.embeddingDimensions;
    if (typeof dim !== 'number' || dim <= 0 || !Number.isInteger(dim)) return null;
    if (!Array.isArray(parsed.entries)) return null;
    const entries = parseEntries(parsed.entries, dim);
    return entries ? { metadata: parsed.metadata, entries } : null;
  } catch {
    return null;
  }
}
