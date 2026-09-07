// apps/desktop/renderer/components/ConfidenceBadge.tsx
import type { ContextConfidence, ContextConfidenceReason, AdaptivePackMode, AdaptiveStrategyOverride } from '../../../../src/features/repository-context/domain/ContextConfidence';

type ConfidenceBadgeProps = Readonly<{
  confidence?: ContextConfidence;
  suggestedStrategy?: AdaptivePackMode;
  selectedStrategy?: AdaptiveStrategyOverride;
  onStrategyChange?(value: AdaptiveStrategyOverride): void;
}>;

const REASON_LABELS: Record<ContextConfidenceReason, string> = {
  strongExactMatch: 'Strong exact filename match',
  strongSymbolMatch: 'Strong symbol match',
  largeScoreGap: 'Large candidate score gap',
  strongStructuralSupport: 'Structural evidence available',
  semanticOnly: 'Semantic match only',
  closeCandidateScores: 'Close candidate scores',
  distributedCandidates: 'Distributed candidates across modules',
  weakStructuralSupport: 'Weak structural evidence',
};

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: '#133924', text: '#4ade80', border: '#166534' },
  medium: { bg: '#1c2d42', text: '#60a5fa', border: '#1e40af' },
  low: { bg: '#3e2417', text: '#fb923c', border: '#9a3412' },
};

export const ConfidenceBadge = ({ confidence, suggestedStrategy, selectedStrategy = 'auto', onStrategyChange }: ConfidenceBadgeProps) => {
  if (!confidence) return null;
  const colors = LEVEL_COLORS[confidence.level] ?? LEVEL_COLORS.medium;
  const isLow = confidence.level === 'low';
  const isHigh = confidence.level === 'high';

  return (
    <div style={{ padding: '8px 10px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '4px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 'bold', color: colors.text, textTransform: 'uppercase' }}>
            Confidence: {confidence.level} ({confidence.score} pts)
          </span>
          {suggestedStrategy && <span style={{ color: '#9eafc8' }}>Suggested: {suggestedStrategy.toUpperCase()}</span>}
        </div>
        {onStrategyChange && (
          <select aria-label="Pack strategy" value={selectedStrategy} onChange={(e) => onStrategyChange(e.target.value as AdaptiveStrategyOverride)} style={{ fontSize: '10px', padding: '1px 4px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}>
            <option value="auto">Auto ({suggestedStrategy ?? 'standard'})</option>
            <option value="fast">Fast</option>
            <option value="standard">Standard</option>
            <option value="expanded">Expanded</option>
          </select>
        )}
      </div>
      {confidence.reasons.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '14px', color: '#cbd5e1', fontSize: '10px' }}>
          {confidence.reasons.map((r) => <li key={r}>{REASON_LABELS[r] ?? r}</li>)}
        </ul>
      )}
      {isLow && <div style={{ color: '#fdba74', fontWeight: 'bold' }}>Warning: Candidates are distributed. Review entry points before building context.</div>}
      {isHigh && <div style={{ color: '#86efac' }}>Clear entry point detected. Fast pack minimizes prompt overhead.</div>}
    </div>
  );
};
