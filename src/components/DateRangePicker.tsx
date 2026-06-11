"use client";
import React, { useState } from 'react';

export interface DateRange { from: string; to: string; label: string }

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Presets relativos terminan AYER (días completos, estables). "Hoy" es la opción explícita de ver el parcial.
export function computePreset(key: string): DateRange {
  const today = new Date();
  const ayer = addDays(today, -1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  switch (key) {
    case 'hoy': return { from: fmt(today), to: fmt(today), label: 'Hoy' };
    case 'ayer': return { from: fmt(ayer), to: fmt(ayer), label: 'Ayer' };
    case '7d': return { from: fmt(addDays(ayer, -6)), to: fmt(ayer), label: 'Últimos 7 días' };
    case '14d': return { from: fmt(addDays(ayer, -13)), to: fmt(ayer), label: 'Últimos 14 días' };
    case '30d': return { from: fmt(addDays(ayer, -29)), to: fmt(ayer), label: 'Últimos 30 días' };
    case 'mes': { const to = ayer >= monthStart ? ayer : today; return { from: fmt(monthStart), to: fmt(to), label: 'Este mes' }; }
    case 'mesPasado': { const lastEnd = addDays(monthStart, -1); const lastStart = new Date(lastEnd.getFullYear(), lastEnd.getMonth(), 1); return { from: fmt(lastStart), to: fmt(lastEnd), label: 'Mes pasado' }; }
    default: return { from: fmt(addDays(ayer, -29)), to: fmt(ayer), label: 'Últimos 30 días' };
  }
}

const PRESETS: { key: string; label: string }[] = [
  { key: 'hoy', label: 'Hoy' }, { key: 'ayer', label: 'Ayer' },
  { key: '7d', label: '7 días' }, { key: '14d', label: '14 días' }, { key: '30d', label: '30 días' },
  { key: 'mes', label: 'Este mes' }, { key: 'mesPasado', label: 'Mes pasado' },
];

const chip = (active: boolean): React.CSSProperties => ({
  fontSize: 12.5, padding: '5px 11px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
  border: `1px solid ${active ? '#002D5F' : '#dfe7f1'}`,
  background: active ? '#002D5F' : '#fff', color: active ? '#fff' : '#3a4a5c', fontWeight: active ? 700 : 500,
});
const dateInput: React.CSSProperties = { padding: '6px 9px', borderRadius: 8, border: '1px solid #dfe7f1', fontSize: 12.5, fontFamily: 'inherit', color: '#3a4a5c' };

export default function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [activeKey, setActiveKey] = useState('30d');
  const [custom, setCustom] = useState(false);
  const [cf, setCf] = useState(value.from);
  const [ct, setCt] = useState(value.to);

  const pick = (key: string) => { setCustom(false); setActiveKey(key); onChange(computePreset(key)); };
  const applyCustom = () => { if (cf && ct && cf <= ct) { setActiveKey('custom'); onChange({ from: cf, to: ct, label: `${cf} → ${ct}` }); } };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => pick(p.key)} style={chip(!custom && activeKey === p.key)}>{p.label}</button>
        ))}
        <button onClick={() => setCustom((c) => !c)} style={chip(custom)}>Personalizado ⌄</button>
      </div>
      {custom && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#8696a7' }}>Desde</span>
          <input type="date" value={cf} onChange={(e) => setCf(e.target.value)} style={dateInput} />
          <span style={{ fontSize: 12, color: '#8696a7' }}>hasta</span>
          <input type="date" value={ct} onChange={(e) => setCt(e.target.value)} style={dateInput} />
          <button onClick={applyCustom} disabled={!cf || !ct || cf > ct} style={{ ...chip(false), background: '#1689C4', color: '#fff', borderColor: '#1689C4', opacity: !cf || !ct || cf > ct ? 0.5 : 1 }}>Aplicar</button>
        </div>
      )}
    </div>
  );
}
