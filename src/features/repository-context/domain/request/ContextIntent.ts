// src/features/repository-context/domain/request/ContextIntent.ts

export type ContextIntent =
  | 'change'
  | 'review'
  | 'understand'
  | 'impact'
  | 'investigate'
  | 'document'
  | 'test';

export const ALL_CONTEXT_INTENTS: readonly ContextIntent[] = [
  'change',
  'review',
  'understand',
  'impact',
  'investigate',
  'document',
  'test',
] as const;

export function isValidContextIntent(intent: string): intent is ContextIntent {
  return ALL_CONTEXT_INTENTS.includes(intent as ContextIntent);
}

export const SUPPORTED_CONTEXT_INTENTS: readonly ContextIntent[] = ['change'] as const;

export function isSupportedContextIntent(intent: string): intent is 'change' {
  return intent === 'change';
}
