// apps/desktop/renderer/components/TaskContextInputArea.tsx
import type { SearchPanelProps } from '../types';

type TaskContextInputAreaProps = Pick<
  SearchPanelProps,
  'taskInput' | 'entryPointInput' | 'setTaskInput' | 'setEntryPointInput' | 'analyzeTask' | 'clearSearch' | 'isAnalyzing'
>;

export const TaskContextInputArea = (props: TaskContextInputAreaProps) => {
  const isBusy = Boolean(props.isAnalyzing);
  const canAnalyze = !isBusy && props.taskInput.trim().length > 0 && props.entryPointInput.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <label style={{ fontSize: '11px', color: '#9eafc8', display: 'block', marginBottom: '4px' }}>Task</label>
        <input
          aria-label="Task description"
          disabled={isBusy}
          value={props.taskInput}
          placeholder="e.g. 返品処理を OrderService へ追加する"
          onChange={event => props.setTaskInput(event.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label style={{ fontSize: '11px', color: '#9eafc8', display: 'block', marginBottom: '4px' }}>Entry Point</label>
        <input
          aria-label="Entry points"
          disabled={isBusy}
          value={props.entryPointInput}
          placeholder="e.g. src/order/OrderService.ts"
          onChange={event => props.setEntryPointInput(event.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <div className="button-row" style={{ marginTop: '4px' }}>
        <button
          className="primary-button"
          disabled={!canAnalyze}
          onClick={() => void props.analyzeTask()}
        >
          {isBusy && <span className="inline-spinner" />}
          {isBusy ? 'Analyzing...' : 'Analyze Task'}
        </button>
        <button disabled={isBusy} onClick={() => void props.clearSearch()} style={{ marginLeft: '8px' }}>
          Clear
        </button>
      </div>
    </div>
  );
};
