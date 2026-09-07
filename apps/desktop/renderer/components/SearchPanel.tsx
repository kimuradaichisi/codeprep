import type { SearchPanelProps } from '../types';
import { InlineNotice } from './InlineNotice';
import { TaskContextInputArea } from './TaskContextInputArea';
import { SearchFormSection } from './SearchFormSection';

export const SearchPanel = (props: SearchPanelProps) => (
  <div className="search-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
      <div><p className="eyebrow" style={{ margin: 0 }}>DISCOVERY</p><h2 style={{ fontSize: '18px', margin: 0 }}>Search files</h2></div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          className={props.discoveryMode === 'search' ? 'primary-button' : ''}
          style={{ fontSize: '11px', padding: '2px 8px' }}
          onClick={() => props.setDiscoveryMode('search')}
        >
          Search
        </button>
        <button
          className={props.discoveryMode === 'task' ? 'primary-button' : ''}
          style={{ fontSize: '11px', padding: '2px 8px' }}
          onClick={() => props.setDiscoveryMode('task')}
        >
          Task Context
        </button>
      </div>
    </div>
    {props.discoveryMode === 'task' ? (
      <TaskContextInputArea {...props} />
    ) : (
      <SearchFormSection {...props} />
    )}
    <InlineNotice message={props.searchNotice} />
  </div>
);

