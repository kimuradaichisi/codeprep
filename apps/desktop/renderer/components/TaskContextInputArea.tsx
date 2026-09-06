import type { SearchPanelProps } from '../types';
import { EntryPointCandidateList } from './EntryPointCandidateList';

type TaskContextInputAreaProps = Pick<
  SearchPanelProps,
  | 'taskInput'
  | 'entryPointInput'
  | 'setTaskInput'
  | 'setEntryPointInput'
  | 'analyzeTask'
  | 'clearSearch'
  | 'isAnalyzing'
  | 'entryPointCandidates'
  | 'enrichedCandidates'
  | 'isDiscoveringEntryPoints'
  | 'discoverEntryPoints'
  | 'toggleEntryPointCandidate'
>;

export const TaskContextInputArea = (props: TaskContextInputAreaProps) => {
  const isBusy = Boolean(props.isAnalyzing || props.isDiscoveringEntryPoints);
  const canDiscover = !isBusy && props.taskInput.trim().length > 0;
  const canAnalyze = !isBusy && props.taskInput.trim().length > 0 && props.entryPointInput.trim().length > 0;
  const selectedPaths = props.entryPointInput.split(',').map((p) => p.trim()).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <label style={{ fontSize: '11px', color: '#9eafc8', display: 'block', marginBottom: '4px' }}>Task</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            aria-label="Task description"
            disabled={isBusy}
            value={props.taskInput}
            placeholder="e.g. 返品処理を OrderService へ追加する"
            onChange={(event) => props.setTaskInput(event.target.value)}
            style={{ flex: 1 }}
          />
          {props.discoverEntryPoints && (
            <button
              disabled={!canDiscover}
              onClick={() => void props.discoverEntryPoints?.()}
              style={{ whiteSpace: 'nowrap' }}
            >
              {props.isDiscoveringEntryPoints ? 'Finding...' : 'Find Entry Points'}
            </button>
          )}
        </div>
      </div>
      {props.entryPointCandidates && props.entryPointCandidates.length > 0 && (
        <EntryPointCandidateList
          candidates={props.entryPointCandidates}
          enrichedCandidates={props.enrichedCandidates}
          selectedPaths={selectedPaths}
          onToggle={(path) => props.toggleEntryPointCandidate?.(path)}
        />
      )}
      <div>
        <label style={{ fontSize: '11px', color: '#9eafc8', display: 'block', marginBottom: '4px' }}>
          Selected Entry Points (comma separated)
        </label>
        <input
          aria-label="Entry points"
          disabled={isBusy}
          value={props.entryPointInput}
          placeholder="e.g. src/order/OrderService.ts"
          onChange={(event) => props.setEntryPointInput(event.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <div className="button-row" style={{ marginTop: '4px' }}>
        <button
          className="primary-button"
          disabled={!canAnalyze}
          onClick={() => void props.analyzeTask()}
        >
          {props.isAnalyzing && <span className="inline-spinner" />}
          {props.isAnalyzing ? 'Analyzing...' : 'Build Context'}
        </button>
        <button disabled={isBusy} onClick={() => void props.clearSearch()} style={{ marginLeft: '8px' }}>
          Clear
        </button>
      </div>
    </div>
  );
};
