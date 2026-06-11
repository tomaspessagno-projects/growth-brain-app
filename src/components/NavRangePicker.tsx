"use client";
import React, { useState } from 'react';
import { useAnalytics } from '@/components/AnalyticsProvider';
import { computePreset } from '@/components/DateRangePicker';

const PRESETS = [
  { key: 'hoy', label: 'Hoy' }, { key: 'ayer', label: 'Ayer' },
  { key: '7d', label: 'Últimos 7 días' }, { key: '14d', label: 'Últimos 14 días' },
  { key: '30d', label: 'Últimos 30 días' }, { key: 'mes', label: 'Este mes' }, { key: 'mesPasado', label: 'Mes pasado' },
];

const dropdown: React.CSSProperties = { position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 50, background: '#fff', border: '1px solid #e3e9f0', borderRadius: 12, padding: 12, minWidth: 230, boxShadow: '0 12px 32px rgba(16,38,64,0.16)', animation: 'sd-pop .14s ease-out' };
const dateInput: React.CSSProperties = { padding: '5px 7px', borderRadius: 7, border: '1px solid #dfe7f1', fontSize: 11.5, fontFamily: 'inherit', width: '50%', color: '#3a4a5c' };
const item = (active: boolean): React.CSSProperties => ({ textAlign: 'left', fontSize: 12.5, padding: '7px 9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: active ? '#002D5F' : 'transparent', color: active ? '#fff' : '#3a4a5c', fontWeight: active ? 700 : 500, transition: 'background .15s, color .15s' });

export default function NavRangePicker() {
  const { range, setRange, busy } = useAnalytics();
  const [open, setOpen] = useState(false);
  const [cf, setCf] = useState(range.from);
  const [ct, setCt] = useState(range.to);

  const pick = (key: string) => { setRange(computePreset(key)); setOpen(false); };
  const applyCustom = () => { if (cf && ct && cf <= ct) { setRange({ from: cf, to: ct, label: `${cf} → ${ct}` }); setOpen(false); } };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="sd-range-trigger"
        style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#3a4a5c', background: '#fff', border: '1px solid #dfe7f1', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
        title="Cambiar el período (afecta a todo SysData)"
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: busy ? '#D38A18' : '#17A673', display: 'inline-block', transition: 'background .25s', animation: busy ? 'sd-pulse 1s infinite' : 'none' }} />
        {range.label}
        <span style={{ opacity: 0.55, fontSize: 10, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={dropdown}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#8696a7', marginBottom: 8 }}>Período · todo SysData</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {PRESETS.map((p) => (
                <button key={p.key} onClick={() => pick(p.key)} style={item(range.label === p.label)} className="sd-range-item">{p.label}</button>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #eef2f7', marginTop: 8, paddingTop: 8 }}>
              <div style={{ fontSize: 10.5, color: '#8696a7', marginBottom: 5 }}>Personalizado (de X a Y día)</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="date" value={cf} onChange={(e) => setCf(e.target.value)} style={dateInput} />
                <input type="date" value={ct} onChange={(e) => setCt(e.target.value)} style={dateInput} />
              </div>
              <button onClick={applyCustom} disabled={!cf || !ct || cf > ct} style={{ marginTop: 8, width: '100%', fontSize: 12, fontWeight: 700, padding: '7px', borderRadius: 8, border: 'none', background: '#1689C4', color: '#fff', cursor: cf && ct && cf <= ct ? 'pointer' : 'not-allowed', opacity: !cf || !ct || cf > ct ? 0.5 : 1, fontFamily: 'inherit', transition: 'opacity .15s, filter .15s' }} className="sd-apply">Aplicar</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
