// apps/desktop/renderer/components/TaskContextInputArea.tsx
import React from 'react';
import type { SearchPanelProps } from '../types';
import { WorkspaceStatusHeader } from './WorkspaceStatusHeader';
import { TaskInputArea } from './TaskInputArea';
import { ConfidenceSummary } from './ConfidenceSummary';
import { CandidateCardList } from './CandidateCardList';
import { ContextPackViewer } from './ContextPackViewer';
import { parseEntryPoints } from '../hooks/workspaceTaskContext';

export const TaskContextInputArea: React.FC<SearchPanelProps> = (props) => {
  const isBusy = Boolean(props.isAnalyzing || props.isDiscoveringEntryPoints);
  const selectedPaths = parseEntryPoints(props.entryPointInput);
  const canBuild = !isBusy && props.taskInput.trim().length > 0 && selectedPaths.length > 0;

  return (
    <div className="task-context-workflow" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <WorkspaceStatusHeader
        indexStatus={props.indexStatus}
        knowledgeStatus={props.knowledgeStatus}
        semanticStatus={props.semanticStatus}
      />

      <TaskInputArea
        taskInput={props.taskInput}
        isBusy={isBusy}
        onTaskChange={props.setTaskInput}
        onFindContext={() => void props.discoverEntryPoints?.()}
      />

      <ConfidenceSummary
        confidence={props.confidence}
        suggestedStrategy={props.suggestedPackStrategy}
        selectedStrategy={props.adaptiveStrategy}
        onStrategyChange={props.setAdaptiveStrategy}
      />

      {props.entryPointCandidates && props.entryPointCandidates.length > 0 ? (
        <CandidateCardList
          candidates={props.entryPointCandidates}
          enrichedCandidates={props.enrichedCandidates}
          selectedPaths={selectedPaths}
          manualInput={props.entryPointInput}
          isBusy={isBusy}
          onToggle={(path) => props.toggleEntryPointCandidate?.(path)}
          onManualInputChange={props.setEntryPointInput}
        />
      ) : (
        <div>
          <label style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground, #888)', display: 'block', marginBottom: '2px' }}>
            Selected / Manual Entry Points (comma separated)
          </label>
          <input
            aria-label="Selected entry points"
            disabled={isBusy}
            value={props.entryPointInput}
            placeholder="e.g. src/order/OrderService.ts"
            onChange={(e) => props.setEntryPointInput(e.target.value)}
            style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="primary-button"
          disabled={!canBuild}
          onClick={() => void props.analyzeTask()}
          style={{ padding: '4px 14px' }}
        >
          {props.isAnalyzing ? 'Building Pack...' : 'Build Context Pack'}
        </button>
      </div>

      {props.packManifest && (
        <ContextPackViewer
          manifest={props.packManifest}
          manifestMarkdown={props.preview}
          packContent={props.packContent}
          resolvedStrategy={props.resolvedStrategy}
          activeTab={props.activePreviewTab ?? 'manifest'}
          isBusy={isBusy}
          onTabChange={(t) => props.setActivePreviewTab?.(t)}
          onCopy={() => void props.copyPackContent?.()}
          onReset={() => props.resetTaskContext?.()}
        />
      )}
    </div>
  );
};
