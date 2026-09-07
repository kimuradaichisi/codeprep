// apps/desktop/renderer/components/helpStyles.ts
import type { CSSProperties } from 'react';

export const helpOverlayStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
};

export const helpModalStyle: CSSProperties = {
  backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
  border: '1px solid var(--vscode-widget-border, #454545)',
  borderRadius: '8px',
  width: '580px',
  maxWidth: '92vw',
  maxHeight: '88vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
};

export const helpHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid var(--vscode-widget-border, #333)',
};

export const helpBodyStyle: CSSProperties = {
  padding: '16px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  fontSize: '12px',
  lineHeight: 1.5,
  color: 'var(--vscode-editor-foreground, #ccc)',
};

export const helpCardStyle: CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid var(--vscode-widget-border, #333)',
  borderRadius: '6px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

export const stepBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: '#2563eb',
  color: '#fff',
  fontSize: '11px',
  fontWeight: 'bold',
  flexShrink: 0,
};
