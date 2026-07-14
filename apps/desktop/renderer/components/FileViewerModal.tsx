import { useEffect, useState } from 'react';
import type { DesktopApi } from '../../DesktopApi';

export type FileViewerModalProps = Readonly<{
  projectId: string;
  relativePath: string;
  api: DesktopApi;
  onClose(): void;
}>;

export const FileViewerModal = ({ projectId, relativePath, api, onClose }: FileViewerModalProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.readFileContent(projectId, relativePath)
      .then(text => { if (active) setContent(text); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : String(err)); });
    return () => { active = false; };
  }, [projectId, relativePath, api]);

  const lines = content !== null ? content.split(/\r?\n/) : [];
  const byteSize = content !== null ? new TextEncoder().encode(content).byteLength : 0;
  const estimatedTokens = Math.ceil(byteSize / 4);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)'
    }}>
      <div className="modal-container" onClick={e => e.stopPropagation()} style={{
        background: '#1b222d', border: '1px solid #354255', borderRadius: '8px',
        width: '80%', height: '80%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', overflow: 'hidden'
      }}>
        <div className="modal-header" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', borderBottom: '1px solid #354255', background: '#151c27'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#76a9ff', textTransform: 'uppercase', letterSpacing: '1px' }}>File Preview</span>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#e2e8f0', fontFamily: 'monospace' }}>{relativePath}</h3>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px',
            cursor: 'pointer', padding: '0 4px', lineHeight: 1
          }}>&times;</button>
        </div>

        <div className="modal-body" style={{
          flex: 1, overflow: 'auto', padding: '16px', background: '#0d1117',
          fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px', lineHeight: '1.5'
        }}>
          {error ? <div style={{ color: '#ff7676' }}>Error loading file: {error}</div> :
           content === null ? <div style={{ color: '#94a3b8' }}>Loading...</div> :
           <table style={{ borderCollapse: 'collapse', width: '100%' }}>
             <tbody>
               {lines.map((line, idx) => (
                 <tr key={idx}>
                   <td style={{
                     width: '40px', paddingRight: '12px', textAlign: 'right',
                     color: '#4f5e75', userSelect: 'none', borderRight: '1px solid #212836',
                     verticalAlign: 'top'
                   }}>{idx + 1}</td>
                   <td style={{ paddingLeft: '12px', whiteSpace: 'pre-wrap', color: '#e2e8f0', verticalAlign: 'top' }}>{line}</td>
                 </tr>
               ))}
             </tbody>
           </table>
          }
        </div>

        <div className="modal-footer" style={{
          padding: '10px 16px', borderTop: '1px solid #354255', background: '#151c27',
          display: 'flex', justifyContent: 'flex-start', gap: '16px', fontSize: '12px', color: '#94a3b8'
        }}>
          <div>Size: <strong style={{ color: '#e2e8f0' }}>{byteSize.toLocaleString()} bytes</strong></div>
          <div style={{ color: '#354255' }}>|</div>
          <div>Estimated Tokens: <strong style={{ color: '#76a9ff' }}>{estimatedTokens.toLocaleString()} tokens</strong></div>
        </div>
      </div>
    </div>
  );
};
