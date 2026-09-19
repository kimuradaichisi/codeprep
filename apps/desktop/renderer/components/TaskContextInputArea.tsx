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
  const isKnowledge = props.adaptiveStrategy === 'knowledge';
  const selectedPaths = parseEntryPoints(props.entryPointInput);
  const canBuild = !isBusy && props.taskInput.trim().length > 0 && (isKnowledge || selectedPaths.length > 0);

  const [isTaskCollapsed, setIsTaskCollapsed] = React.useState(false);

  return (
    <div className="task-context-workflow" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <WorkspaceStatusHeader
        indexStatus={props.indexStatus}
        knowledgeStatus={props.knowledgeStatus}
        semanticStatus={props.semanticStatus}
        knowledgeDbStatus={props.knowledgeDbStatus}
        knowledgeDbMessage={props.knowledgeDbMessage}
        onRefreshIndex={props.refreshIndex ? () => void props.refreshIndex?.() : undefined}
        onOpenSettings={props.openSettings}
      />


      {isTaskCollapsed ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Expand task input"
          onClick={() => setIsTaskCollapsed(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsTaskCollapsed(false); }}
          style={{ padding: '6px 8px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', color: '#38bdf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📝 <strong>Task:</strong> {props.taskInput || '(No task entered)'}
          </span>
          <span style={{ fontSize: '10px', color: '#9eafc8', flexShrink: 0, marginLeft: '8px' }}>[展開 ▼]</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {props.taskInput.trim() && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsTaskCollapsed(true)}
                style={{ fontSize: '10px', padding: '1px 6px', background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
              >
                折りたたむ ▲
              </button>
            </div>
          )}
          <TaskInputArea
            taskInput={props.taskInput}
            isBusy={isBusy}
            onTaskChange={props.setTaskInput}
            onFindContext={() => void props.discoverEntryPoints?.()}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#b7c6da', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                aria-label="Respect gitignore"
                checked={props.useGitignore}
                onChange={(e) => props.setUseGitignore(e.target.checked)}
                style={{ width: 'auto', margin: 0 }}
              />
              <span>Respect <code>.gitignore</code> (exclude build & sensitive files)</span>
            </label>
            <span style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground, #888)' }}>
              💡 Task Context creates prompt packs for LLM
            </span>
          </div>
        </div>
      )}

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
          {props.isAnalyzing ? 'Building Pack...' : (isKnowledge ? 'Prepare Context (v2)' : 'Build Context Pack')}
        </button>
      </div>

      {(props.packManifest || props.contextPackV2) && (
        <ContextPackViewer
          manifest={props.packManifest}
          contextPackV2={props.contextPackV2}
          manifestMarkdown={props.preview}
          packContent={props.packContent}
          resolvedStrategy={props.resolvedStrategy}
          activeTab={props.activePreviewTab ?? 'manifest'}
          isBusy={isBusy}
          onTabChange={(t) => props.setActivePreviewTab?.(t)}
          onCopy={(format) => void props.copyPackContent?.(format)}
          onReset={() => props.resetTaskContext?.()}
        />
      )}
    </div>
  );
};

