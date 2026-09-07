import type { ContextOutputFormat } from '../../../../src/features/repository-context/application/ports';
import type { PackMode } from '../../../../src/features/repository-context/domain/PackMode';

export type LlmSettings = Readonly<{
  embeddingEndpoint: string;
  embeddingModel: string;
  embeddingDimensions: number;
  defaultTokenLimit: number;
  defaultPackMode: PackMode;
  defaultFormat: ContextOutputFormat;
}>;

export const DEFAULT_LLM_SETTINGS: LlmSettings = Object.freeze({
  embeddingEndpoint: 'http://localhost:11434',
  embeddingModel: 'nomic-embed-text',
  embeddingDimensions: 768,
  defaultTokenLimit: 40000,
  defaultPackMode: 'full' as PackMode,
  defaultFormat: 'markdown' as ContextOutputFormat,
});

const STORAGE_KEY = 'codeprep_llm_settings';

export function loadLlmSettings(): LlmSettings {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_LLM_SETTINGS;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LLM_SETTINGS;
    return mergeLlmSettings(JSON.parse(raw) as Partial<LlmSettings>);
  } catch {
    return DEFAULT_LLM_SETTINGS;
  }
}

function mergeLlmSettings(p: Partial<LlmSettings>): LlmSettings {
  return {
    embeddingEndpoint: p.embeddingEndpoint ?? DEFAULT_LLM_SETTINGS.embeddingEndpoint,
    embeddingModel: p.embeddingModel ?? DEFAULT_LLM_SETTINGS.embeddingModel,
    embeddingDimensions: p.embeddingDimensions ?? DEFAULT_LLM_SETTINGS.embeddingDimensions,
    defaultTokenLimit: p.defaultTokenLimit ?? DEFAULT_LLM_SETTINGS.defaultTokenLimit,
    defaultPackMode: p.defaultPackMode ?? DEFAULT_LLM_SETTINGS.defaultPackMode,
    defaultFormat: p.defaultFormat ?? DEFAULT_LLM_SETTINGS.defaultFormat,
  };
}

export function saveLlmSettings(settings: LlmSettings): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {
    // Ignore storage errors
  }
}

export async function testEmbeddingConnection(endpoint: string): Promise<boolean> {
  try {
    const url = endpoint.replace(/\/+$/, '');
    const res = await fetch(`${url}/api/version`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
