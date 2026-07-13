export type ContextBudget = Readonly<{
  bytes: number;
  estimatedTokens: number;
  limit: number;
  withinLimit: boolean;
}>;

export const evaluateBudget = (bytes: number, limit: number): ContextBudget => {
  const estimatedTokens = Math.ceil(bytes / 4);
  return { bytes, estimatedTokens, limit, withinLimit: estimatedTokens <= limit };
};
