// apps/desktop/renderer/components/SettingsModal.tsx
import React, { useState } from 'react';
import {
  DEFAULT_LLM_SETTINGS,
  loadLlmSettings,
  saveLlmSettings,
  testEmbeddingConnection,
  type LlmSettings,
} from '../model/llmSettings';
import type { ContextOutputFormat } from '../../../../src/features/repository-context/application/ports';
import {
  backdropStyle,
  closeButtonStyle,
  containerStyle,
  fieldsetStyle,
  footerStyle,
  headerStyle,
  labelStyle,
  legendStyle,
  secondaryBtnStyle,
} from './settingsStyles';
import { EmbeddingSection } from './EmbeddingSection';

export type SettingsModalProps = Readonly<{
  onClose(): void;
  onSaved?(settings: LlmSettings): void;
}>;

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSaved }) => {
  const [settings, setSettings] = useState<LlmSettings>(loadLlmSettings);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const ok = await testEmbeddingConnection(settings.embeddingEndpoint);
    setIsTesting(false);
    setTestResult(ok ? 'Connected successfully to Ollama!' : 'Connection failed. Ensure Ollama is running.');
  };

  const handleSave = () => {
    saveLlmSettings(settings);
    onSaved?.(settings);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={backdropStyle}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <span style={{ fontSize: '11px', color: '#76a9ff', textTransform: 'uppercase', letterSpacing: '1px' }}>Preferences</span>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#e2e8f0' }}>LLM & Context Generation Settings</h3>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        </div>

        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <EmbeddingSection settings={settings} onChange={setSettings} onTest={handleTest} isTesting={isTesting} testResult={testResult} />
          <ContextDefaultsSection settings={settings} onChange={setSettings} />
        </div>

        <div style={footerStyle}>
          <button onClick={() => setSettings(DEFAULT_LLM_SETTINGS)} style={secondaryBtnStyle}>Reset Defaults</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
            <button className="primary-button" onClick={handleSave} style={{ padding: '5px 14px' }}>Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContextDefaultsSection: React.FC<{
  settings: LlmSettings;
  onChange: React.Dispatch<React.SetStateAction<LlmSettings>>;
}> = ({ settings, onChange }) => (
  <fieldset style={fieldsetStyle}>
    <legend style={legendStyle}>Context Defaults</legend>
    <div style={{ display: 'flex', gap: '10px' }}>
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>Default Token Limit</label>
        <input
          type="number"
          min="1000"
          step="1000"
          value={settings.defaultTokenLimit}
          onChange={(e) => onChange((prev) => ({ ...prev, defaultTokenLimit: Number(e.target.value) }))}
        />
      </div>
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>Default Format</label>
        <select
          value={settings.defaultFormat}
          onChange={(e) => onChange((prev) => ({ ...prev, defaultFormat: e.target.value as ContextOutputFormat }))}
        >
          <option value="markdown">Markdown</option>
          <option value="xml">XML</option>
          <option value="json">JSON</option>
        </select>
      </div>
    </div>
  </fieldset>
);
