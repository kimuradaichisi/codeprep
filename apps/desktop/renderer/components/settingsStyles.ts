// apps/desktop/renderer/components/settingsStyles.ts
import type { CSSProperties } from 'react';

export const backdropStyle: CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0, 0, 0, 0.65)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)',
};

export const containerStyle: CSSProperties = {
  background: '#1b222d', border: '1px solid #354255', borderRadius: '8px',
  width: '540px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', overflow: 'hidden',
};

export const headerStyle: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 16px', borderBottom: '1px solid #354255', background: '#151c27',
};

export const footerStyle: CSSProperties = {
  padding: '10px 16px', borderTop: '1px solid #354255', background: '#151c27',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};

export const fieldsetStyle: CSSProperties = {
  border: '1px solid #2c3747', padding: '10px 12px', margin: 0, borderRadius: '4px',
};

export const legendStyle: CSSProperties = {
  color: '#9eafc8', fontSize: '11px', padding: '0 4px', fontWeight: 600,
};

export const labelStyle: CSSProperties = {
  fontSize: '11px', color: '#9eafc8', display: 'block', marginBottom: '3px',
};

export const closeButtonStyle: CSSProperties = {
  background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer',
};

export const secondaryBtnStyle: CSSProperties = {
  background: '#202938', border: '1px solid #354255', padding: '4px 10px', fontSize: '11px',
};
