import type { EmbeddingVector } from '../domain/EmbeddingVector';
import type { SemanticIndex } from '../domain/SemanticIndex';

/**
 * 埋め込みモデル・プロバイダのポート
 * Domain/Application は HTTP や API Key などのインフラ実装詳細を知らない
 */
export interface EmbeddingPort {
  readonly providerId: string;
  readonly modelId: string;
  readonly dimensions: number;

  embed(texts: readonly string[]): Promise<readonly EmbeddingVector[]>;
}

/**
 * セマンティックインデックス永続化ポート
 */
export interface SemanticIndexStore {
  load(workspaceId: string): Promise<SemanticIndex | null>;
  save(index: SemanticIndex): Promise<void>;
  remove(workspaceId: string): Promise<void>;
}
