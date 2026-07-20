import type { AnalyzedCandidate } from '../../../../src/features/desktop-core/application/ports';

export type BudgetSummary = Readonly<{ label: string; over: boolean; ratio: number }>;

export const candidateKey = (projectId: string, relativePath: string): string =>
    `${projectId}:${relativePath.replace(/\\/g, '/')}`;

export const estimateTokens = (bytes: number): number =>
    Number.isFinite(bytes) && bytes > 0 ? Math.ceil(bytes / 4) : 0;

export const formatTokens = (tokens: number): string => {
    const safeTokens = Number.isFinite(tokens) && tokens >= 0 ? tokens : 0;
    return safeTokens >= 1000 ? `${(safeTokens / 1000).toFixed(1)}k` : `${safeTokens}`;
};

export const selectedTokenTotal = (
    candidates: readonly AnalyzedCandidate[],
    selectedKeys: readonly string[],
): number => candidates.reduce(
    (sum, candidate) => selectedKeys.includes(candidateKey(candidate.projectId, candidate.relativePath)) && candidate.size !== undefined
        ? sum + estimateTokens(candidate.size)
        : sum,
    0,
);

export const budgetSummary = (selectedTokens: number, limit: number): BudgetSummary => {
    const safeSelectedTokens = Number.isFinite(selectedTokens) && selectedTokens > 0 ? selectedTokens : 0;
    const hasValidLimit = Number.isFinite(limit) && limit > 0;
    return {
        label: `~${formatTokens(safeSelectedTokens)} / ${formatTokens(limit)} tokens`,
        over: hasValidLimit ? safeSelectedTokens > limit : safeSelectedTokens > 0,
        ratio: hasValidLimit ? Math.min(safeSelectedTokens / limit, 1) : safeSelectedTokens > 0 ? 1 : 0,
    };
};