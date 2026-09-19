// apps/desktop/renderer/components/ConfidenceSummary.tsx
import React from 'react';
import type { ContextConfidence, ContextConfidenceReason, AdaptivePackMode, AdaptiveStrategyOverride } from '../../../../src/features/repository-context/domain/ContextConfidence';

import type { DesktopStrategy } from '../types';

type Props = Readonly<{
  confidence?: ContextConfidence;
  suggestedStrategy?: AdaptivePackMode;
  selectedStrategy?: DesktopStrategy;
  onStrategyChange?(value: DesktopStrategy): void;
}>;

const REASON_LABELS_JA: Record<ContextConfidenceReason, string> = {
  strongExactMatch: 'ファイル名またはシンボルの完全一致',
  strongSymbolMatch: 'シンボル（関数・クラス）の明確な一致',
  largeScoreGap: '最有力候補と他の候補に明確なスコア差あり',
  strongStructuralSupport: 'テストや参照等の構造的裏付けあり',
  semanticOnly: '意味的（ベクトル類似度）一致のみ',
  closeCandidateScores: '候補同士のスコアが僅差（判断に迷いあり）',
  distributedCandidates: '候補が複数のディレクトリに分散',
  weakStructuralSupport: '構造的な結びつき（import/test等）が弱い',
};

const STRATEGY_DESCRIPTIONS_JA: Record<AdaptivePackMode | 'knowledge', string> = {
  fast: '⚡ 最小構成: 本命ファイルと主要な型定義のみパック（トークン消費最小）',
  standard: '⚖️ 標準構成: 選択ファイルと直近の依存関係をバランスよくパック',
  expanded: '🔍 広め構成: 周辺コードや参照先も含めて広めにパック（見落とし防止）',
  knowledge: '🧠 知識グラフ: リポジトリ知識グラフからタスク直結サブグラフを抽出（Context Pack v2）',
};

const LEVEL_CONFIG = {
  high: {
    bg: '#133924', text: '#4ade80', border: '#166534', icon: '✅',
    title: '対象ファイルを特定しました（確信度: 高）',
    action: '👉 本命ファイルが明確です。このまま「Build Context Pack」を実行できます。',
  },
  medium: {
    bg: '#1c2d42', text: '#60a5fa', border: '#1e40af', icon: 'ℹ️',
    title: '候補ファイルを検出しました（確信度: 中）',
    action: '👉 候補を確認し、不要なファイルがあれば除外してからビルドしてください。',
  },
  low: {
    bg: '#3e2417', text: '#fb923c', border: '#9a3412', icon: '⚠️',
    title: '関連候補が分散しています（確信度: 低）',
    action: '👉 単語一致のみで構造的根拠が弱いため、下の候補一覧から関係するファイルを直接チェックしてください。',
  },
} as const;

export const ConfidenceSummary: React.FC<Props> = ({
  confidence,
  suggestedStrategy = 'standard',
  selectedStrategy = 'auto',
  onStrategyChange,
}) => {
  if (!confidence) return null;
  const cfg = LEVEL_CONFIG[confidence.level] ?? LEVEL_CONFIG.medium;
  const activeMode = selectedStrategy === 'auto' ? suggestedStrategy : selectedStrategy;

  return (
    <div
      className="confidence-summary"
      style={{
        padding: '8px 10px',
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '4px',
        fontSize: '11px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'bold', color: cfg.text }}>
            {cfg.icon} {cfg.title}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground, #9eafc8)' }}>
            Context Confidence: {confidence.level} ({confidence.score} pts)
          </span>
          <span style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground, #9eafc8)' }}>
            Suggested: {suggestedStrategy.toUpperCase()}
          </span>
        </div>
        {onStrategyChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground, #aaa)' }}>Pack Strategy:</label>
            <select
              aria-label="Pack strategy"
              value={selectedStrategy}
              onChange={(e) => onStrategyChange(e.target.value as DesktopStrategy)}
              style={{ fontSize: '11px', padding: '1px 6px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}
            >
              <option value="auto">Auto ({suggestedStrategy})</option>
              <option value="knowledge">Knowledge Graph (v2)</option>
              <option value="fast">Fast (最小限)</option>
              <option value="standard">Standard (標準)</option>
              <option value="expanded">Expanded (広め)</option>
            </select>
          </div>
        )}
      </div>


      <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
        {STRATEGY_DESCRIPTIONS_JA[activeMode]}
      </div>

      <div style={{ color: cfg.text, fontSize: '10px', fontWeight: 500 }}>
        {cfg.action}
      </div>

      {confidence.reasons.length > 0 && (
        <details style={{ marginTop: '2px', fontSize: '10px', color: '#9eafc8' }}>
          <summary style={{ cursor: 'pointer' }}>
            🔍 判定理由の内訳を確認 ({confidence.reasons.length} 件)
          </summary>
          <ul style={{ margin: '4px 0 0 14px', padding: 0, color: '#cbd5e1' }}>
            {confidence.reasons.map((r) => (
              <li key={r}>{REASON_LABELS_JA[r] ?? r}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};
