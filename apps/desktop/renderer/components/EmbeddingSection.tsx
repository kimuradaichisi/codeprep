// apps/desktop/renderer/components/EmbeddingSection.tsx
import React from 'react';
import type { LlmSettings } from '../model/llmSettings';
import { fieldsetStyle, labelStyle, legendStyle } from './settingsStyles';

export type EmbeddingSectionProps = Readonly<{
  settings: LlmSettings;
  onChange: React.Dispatch<React.SetStateAction<LlmSettings>>;
  onTest(): void;
  isTesting: boolean;
  testResult: string | null;
}>;

export const EmbeddingSection: React.FC<EmbeddingSectionProps> = ({
  settings, onChange, onTest, isTesting, testResult,
}) => (
  <fieldset style={fieldsetStyle}>
    <legend style={legendStyle}>Embedding Service (Semantic Discovery)</legend>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <label style={labelStyle}>Service Endpoint</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            value={settings.embeddingEndpoint}
            placeholder="http://localhost:11434"
            onChange={(e) => onChange((prev) => ({ ...prev, embeddingEndpoint: e.target.value }))}
            style={{ flex: 1 }}
          />
          <button type="button" disabled={isTesting} onClick={onTest} style={{ whiteSpace: 'nowrap' }}>
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
        {testResult && (
          <span style={{ fontSize: '10px', color: testResult.includes('Connected') ? '#4ade80' : '#f87171', display: 'block', marginTop: '2px' }}>
            {testResult}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Model Name</label>
          <input
            value={settings.embeddingModel}
            placeholder="nomic-embed-text"
            onChange={(e) => onChange((prev) => ({ ...prev, embeddingModel: e.target.value }))}
          />
        </div>
        <div style={{ width: '100px' }}>
          <label style={labelStyle}>Dimensions</label>
          <input
            type="number"
            value={settings.embeddingDimensions}
            onChange={(e) => onChange((prev) => ({ ...prev, embeddingDimensions: Number(e.target.value) }))}
          />
        </div>
      </div>
    </div>
  </fieldset>
);
