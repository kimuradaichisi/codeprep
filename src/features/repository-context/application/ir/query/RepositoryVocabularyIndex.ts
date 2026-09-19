// src/features/repository-context/application/ir/query/RepositoryVocabularyIndex.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { RepositoryKnowledgeStore } from '../persistence/RepositoryKnowledgeStore';
import type { RepositoryNode } from '../../../domain/ir';
import { IdentifierNormalizer } from '../../../domain/ir/query/IdentifierNormalizer';
import { QueryMorphology } from '../../../domain/ir/query/QueryMorphology';

export interface RepositoryVocabularyTerm {
  readonly raw: string;
  readonly normalized: string;
  readonly tokens: readonly string[];
  readonly stemTokens: readonly string[];
  readonly nodeIds: readonly string[];
  readonly nodeKinds: readonly string[];
  readonly frequency: number;
}

export class RepositoryVocabularyIndex {
  private static readonly cache = new Map<string, RepositoryVocabularyIndex>();

  private readonly termsByExact = new Map<string, RepositoryVocabularyTerm>();
  private readonly termsByToken = new Map<string, Set<string>>();
  private readonly termsByStem = new Map<string, Set<string>>();

  private constructor(
    public readonly snapshotId: string,
    public readonly allTerms: readonly RepositoryVocabularyTerm[]
  ) {
    for (const t of allTerms) {
      this.termsByExact.set(t.raw.toLowerCase(), t);
      for (const token of t.tokens) {
        if (!this.termsByToken.has(token)) this.termsByToken.set(token, new Set());
        this.termsByToken.get(token)!.add(t.raw.toLowerCase());
      }
      for (const stem of t.stemTokens) {
        if (!this.termsByStem.has(stem)) this.termsByStem.set(stem, new Set());
        this.termsByStem.get(stem)!.add(t.raw.toLowerCase());
      }
    }
  }

  public static async getOrBuild(
    snapshotId: string,
    store: RepositoryKnowledgeStore
  ): Promise<RepositoryVocabularyIndex> {
    const cached = this.cache.get(snapshotId);
    if (cached) return cached;

    const nodes = await store.findNodes({ snapshotId, limit: 10000 });
    const termMap = this.buildTermMap(nodes);
    const terms = this.buildTermsFromMap(termMap);

    const index = new RepositoryVocabularyIndex(snapshotId, Object.freeze(terms));
    this.cache.set(snapshotId, index);
    return index;
  }

  private static buildTermMap(nodes: readonly RepositoryNode[]): Map<string, TermBuilderItem> {
    const termMap = new Map<string, TermBuilderItem>();
    for (const node of nodes) {
      this.indexNode(node, termMap);
    }
    return termMap;
  }

  private static buildTermsFromMap(termMap: Map<string, TermBuilderItem>): RepositoryVocabularyTerm[] {
    const terms: RepositoryVocabularyTerm[] = [];
    for (const item of termMap.values()) {
      terms.push({
        raw: item.raw,
        normalized: item.normalized,
        tokens: item.tokens,
        stemTokens: item.stemTokens,
        nodeIds: Object.freeze(item.nodeIds),
        nodeKinds: Object.freeze(Array.from(item.nodeKinds)),
        frequency: item.nodeIds.length,
      });
    }
    return terms;
  }

  public static clearCache(): void {
    this.cache.clear();
  }

  public findExact(term: string): RepositoryVocabularyTerm | undefined {
    return this.termsByExact.get(term.toLowerCase());
  }

  public findByToken(token: string): readonly RepositoryVocabularyTerm[] {
    const rawKeys = this.termsByToken.get(token.toLowerCase());
    if (!rawKeys) return [];
    return Array.from(rawKeys).map(k => this.termsByExact.get(k)!).filter(Boolean);
  }

  public findByStem(stem: string): readonly RepositoryVocabularyTerm[] {
    const rawKeys = this.termsByStem.get(stem.toLowerCase());
    if (!rawKeys) return [];
    return Array.from(rawKeys).map(k => this.termsByExact.get(k)!).filter(Boolean);
  }

  public getTermFrequency(token: string): number {
    const rawKeys = this.termsByToken.get(token.toLowerCase());
    return rawKeys?.size ?? 0;
  }

  private static indexNode(node: RepositoryNode, termMap: Map<string, TermBuilderItem>): void {
    const rawNames = this.extractRawNames(node);
    for (const raw of rawNames) {
      if (raw && raw.length >= 2) {
        this.indexSingleTerm(raw, node, termMap);
      }
    }
  }

  private static extractRawNames(node: RepositoryNode): string[] {
    const rawNames: string[] = [];
    if (node.kind === 'file') {
      const fileName = node.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
      if (fileName && fileName !== node.name) rawNames.push(fileName);
    }
    rawNames.push(node.name);
    return rawNames;
  }

  private static indexSingleTerm(raw: string, node: RepositoryNode, termMap: Map<string, TermBuilderItem>): void {
    const key = raw.toLowerCase();
    const existing = termMap.get(key);
    if (existing) {
      existing.nodeIds.push(node.id);
      existing.nodeKinds.add(node.kind);
      return;
    }

    const norm = IdentifierNormalizer.normalize(raw);
    const compTokens = IdentifierNormalizer.extractComponentTokens(raw);
    const tokens = compTokens.length > 0 ? compTokens : [raw.toLowerCase()];
    const stemTokens = tokens.map(t => QueryMorphology.stem(t));
    termMap.set(key, {
      raw,
      normalized: norm.normalized,
      tokens: Object.freeze(tokens),
      stemTokens: Object.freeze(stemTokens),
      nodeIds: [node.id],
      nodeKinds: new Set([node.kind]),
    });
  }
}

interface TermBuilderItem {
  raw: string;
  normalized: string;
  tokens: readonly string[];
  stemTokens: readonly string[];
  nodeIds: string[];
  nodeKinds: Set<string>;
}
