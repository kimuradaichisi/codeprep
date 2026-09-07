// apps/desktop/renderer/components/TaskInputArea.tsx
import React from 'react';

type Props = Readonly<{
  taskInput: string;
  isBusy: boolean;
  onTaskChange(value: string): void;
  onFindContext(): void;
}>;

const MAX_TASK_LENGTH = 2000;

export const TaskInputArea: React.FC<Props> = ({
  taskInput,
  isBusy,
  onTaskChange,
  onFindContext,
}) => {
  const trimmed = taskInput.trim();
  const canFind = !isBusy && trimmed.length > 0 && trimmed.length <= MAX_TASK_LENGTH;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canFind) onFindContext();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground, #9eafc8)' }}>
          Task Description
        </label>
        <span style={{ fontSize: '10px', color: taskInput.length > MAX_TASK_LENGTH ? '#f87171' : 'var(--vscode-descriptionForeground, #666)' }}>
          {taskInput.length} / {MAX_TASK_LENGTH}
        </span>
      </div>
      <textarea
        aria-label="Task description"
        disabled={isBusy}
        value={taskInput}
        rows={3}
        maxLength={MAX_TASK_LENGTH}
        placeholder="Enter task or instruction (e.g. 返品処理時に二重返金される不具合を修正する)"
        onChange={(e) => onTaskChange(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          resize: 'vertical',
          padding: '6px 8px',
          fontFamily: 'inherit',
          fontSize: '12px',
          boxSizing: 'border-box',
          backgroundColor: 'var(--vscode-input-background, #252526)',
          color: 'var(--vscode-input-foreground, #ccc)',
          border: '1px solid var(--vscode-input-border, #3c3c3c)',
          borderRadius: '3px',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground, #666)' }}>
          Ctrl+Enter to find
        </span>
        <button
          className="primary-button"
          disabled={!canFind}
          onClick={onFindContext}
          style={{ whiteSpace: 'nowrap', padding: '3px 12px' }}
        >
          {isBusy ? 'Finding...' : 'Find Context'}
        </button>
      </div>
    </div>
  );
};
