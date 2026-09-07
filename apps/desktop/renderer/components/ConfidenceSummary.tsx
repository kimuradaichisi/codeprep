// apps/desktop/renderer/components/ConfidenceSummary.tsx
import React from 'react';
import type { ContextConfidence, ContextConfidenceReason, AdaptivePackMode, AdaptiveStrategyOverride } from '../../../../src/features/repository-context/domain/ContextConfidence';

type Props = Readonly<{
  confidence?: ContextConfidence;
  suggestedStrategy?: AdaptivePackMode;
  selectedStrategy?: AdaptiveStrategyOverride;
  onStrategyChange?(value: AdaptiveStrategyOverride): void;
}>;

const REASON_LABELS: Record<ContextConfidenceReason, string> = {
  strongExactMatch: 'Strong filename or symbol match',
  strongSymbolMatch: 'Strong symbol match',
  largeScoreGap: 'Clear separation from other candidates',
  strongStructuralSupport: 'Strong structural evidence',
  semanticOnly: 'Semantic match only',
  closeCandidateScores: 'Candidate scores are close',
  distributedCandidates: 'Candidates are spread across multiple areas',
  weakStructuralSupport: 'Structural support is weak',
};

const STRATEGY_DESCRIPTIONS: Record<AdaptivePackMode, string> = {
  fast: 'Minimal context for a clearly identified starting point.',
  standard: 'Balanced context around selected entry points.',
  expanded: 'Broader context for uncertain or distributed candidates.',
};

const LEVEL_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: '#133924', text: '#4ade80', border: '#166534' },
  medium: { bg: '#1c2d42', text: '#60a5fa', border: '#1e40af' },
  low: { bg: '#3e2417', text: '#fb923c', border: '#9a3412' },
};

export const ConfidenceSummary: React.FC<Props> = ({
  confidence,
  suggestedStrategy = 'standard',
  selectedStrategy = 'auto',
  onStrategyChange,
}) => {
  if (!confidence) return null;
  const theme = LEVEL_THEMES[confidence.level] ?? LEVEL_THEMES.medium;
  const activeMode = selectedStrategy === 'auto' ? suggestedStrategy : selectedStrategy;

  return (
    <div
      className="confidence-summary"
      style={{
        padding: '8px 10px',
        backgroundColor: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: '4px',
        fontSize: '11px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold', color: theme.text, textTransform: 'uppercase' }}>
            Context Confidence: {confidence.level} ({confidence.score} pts)
          </span>
          <span style={{ color: 'var(--vscode-descriptionForeground, #9eafc8)' }}>
            Suggested: {suggestedStrategy.toUpperCase()}
          </span>
        </div>
        {onStrategyChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground, #aaa)' }}>Pack Strategy:</label>
            <select
              aria-label="Pack strategy"
              value={selectedStrategy}
              onChange={(e) => onStrategyChange(e.target.value as AdaptiveStrategyOverride)}
              style={{ fontSize: '11px', padding: '1px 6px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}
            >
              <option value="auto">Auto ({suggestedStrategy})</option>
              <option value="fast">Fast</option>
              <option value="standard">Standard</option>
              <option value="expanded">Expanded</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ fontSize: '10px', color: '#cbd5e1', fontStyle: 'italic' }}>
        {STRATEGY_DESCRIPTIONS[activeMode]}
      </div>

      {confidence.reasons.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '14px', color: '#cbd5e1', fontSize: '10px' }}>
          {confidence.reasons.map((r) => (
            <li key={r}>{REASON_LABELS[r] ?? r}</li>
          ))}
        </ul>
      )}

      {confidence.level === 'low' && (
        <div style={{ color: '#fdba74', fontWeight: 600, fontSize: '10px' }}>
          Review the candidate evidence before building context. Suggested: EXPANDED
        </div>
      )}
      {confidence.level === 'high' && (
        <div style={{ color: '#86efac', fontSize: '10px' }}>
          Clear starting point detected. Fast pack minimizes prompt overhead.
        </div>
      )}
    </div>
  );
};
