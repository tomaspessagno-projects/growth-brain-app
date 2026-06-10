"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../funnel/funnel.module.css';
import { loadHistory, addMonth, deltaVsPrev, monthLabel, type PelgMonth } from '@/lib/economics/history';

const fmtArs = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
const fmtArsShort = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(1)} mil M` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}k` : `$${Math.round(n)}`);
const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');
const lblStyle: React.CSSProperties = { fontSize: 11, color: '#8696a7', fontWeight: 600, display: 'block', marginBottom: 3 };
const inStyle: React.CSSProperties = { width: '100%', padding: '7px 9px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13 };

// Δ chip: para el CAC, bajar es BUENO (verde); para spend/leads es contextual.
function Delta({ pct, goodIsDown }: { pct: number | null; goodIsDown?: boolean }) {
  if (pct == null) return <span style={{ color: '#8696a7', fontSize: 12 }}>—</span>;
  const up = pct > 0.005, down = pct < -0.005;
  const good = goodIsDown ? down : up;
  const color = !up && !down ? '#8696a7' : good ? '#15803d' : '#b91c1c';
  return <span style={{ color, fontSize: 12, fontWeight: 600 }}>{pct >= 0 ? '+' : ''}{(pct * 100).toFixed(1)}%</span>;
}

function CacSparkline({ months }: { months: PelgMonth[] }) {
  if (months.length < 2) return null;
  const vals = months.map((m) => m.blendedCacArs);
  const min = Math.min(...vals), max = Math.max(...vals);
  const W = 280, H = 60, pad = 6;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (months.length - 1);
  const y = (v: number) => max === min ? H / 2 : H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="#1689C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {vals.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#002D5F" />)}
    </svg>
  );
}

const CHANNEL_TEMPLATE = ['Meta Ads', 'Google Search', 'Programática', 'Orgánico / propio'];

export default function EconomiaPage() {
  const [history, setHistory] = useState<PelgMonth[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ month: '', totalSpendArs: '', totalLeads: '', channels: ['', '', '', ''], pdfName: '' });

  useEffect(() => { setHistory(loadHistory()); }, []);

  const latestIdx = history.length - 1;
  const latest = history[latestIdx];
  const latestDelta = history.length ? deltaVsPrev(history, latestIdx) : null;

  const onPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setForm((p) => ({ ...p, pdfName: f.name }));
  };

  const save = () => {
    const spend = parseFloat(form.totalSpendArs);
    const leads = parseFloat(form.totalLeads);
    if (!form.month || isNaN(spend) || isNaN(leads) || leads <= 0) return;
    const channels = CHANNEL_TEMPLATE.map((label, i) => ({ label, spendArs: parseFloat(form.channels[i]) || 0 }));
    const m: PelgMonth = {
      month: form.month,
      label: monthLabel(form.month),
      totalSpendArs: spend,
      totalLeads: leads,
      blendedCacArs: spend / leads,
      channels,
      pdfName: form.pdfName || undefined,
      source: 'manual',
    };
    setHistory(addMonth(m));
    setForm({ month: '', totalSpendArs: '', totalLeads: '', channels: ['', '', '', ''], pdfName: '' });
    setShowForm(false);
  };

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <Link href="/explorador" className={styles.recFunnel} style={{ display: 'inline-block', marginBottom: 12 }}>← Explorador</Link>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Economía · Unit economics</h1>
          <p className="page-subtitle" style={{ marginBottom: 0, maxWidth: 640 }}>
            El PELG mes a mes (CAC, inversión, mix de canales). Cargá el de cada mes y vé si la economía mejoró — y si un experimento la movió.
          </p>
        </div>
        <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : '+ Cargar mes'}</button>
      </header>

      {/* Form de carga */}
      {showForm && (
        <section className={`glass-panel ${styles.card}`} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, color: '#5b6b7f', marginBottom: 12 }}>
            Subí el PDF de referencia y confirmá los números del mes. <b>El parseo del PDF (imágenes) es frágil, así que los números los confirmás vos</b> — lo que importa es la serie.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div><label style={lblStyle}>Mes</label><input style={inStyle} type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
            <div><label style={lblStyle}>Inversión lead-gen (ARS)</label><input style={inStyle} type="number" placeholder="135000000" value={form.totalSpendArs} onChange={(e) => setForm({ ...form, totalSpendArs: e.target.value })} /></div>
            <div><label style={lblStyle}>Leads</label><input style={inStyle} type="number" placeholder="13144" value={form.totalLeads} onChange={(e) => setForm({ ...form, totalLeads: e.target.value })} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
            {CHANNEL_TEMPLATE.map((c, i) => (
              <div key={c}><label style={lblStyle}>{c} (ARS)</label><input style={inStyle} type="number" placeholder="0" value={form.channels[i]} onChange={(e) => { const ch = [...form.channels]; ch[i] = e.target.value; setForm({ ...form, channels: ch }); }} /></div>
            ))}
          </div>
          {form.totalSpendArs && form.totalLeads && parseFloat(form.totalLeads) > 0 && (
            <div style={{ fontSize: 12.5, color: '#002D5F', marginTop: 10, fontWeight: 600 }}>CAC blended calculado: {fmtArs(parseFloat(form.totalSpendArs) / parseFloat(form.totalLeads))}</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <label style={{ ...lblStyle, marginBottom: 0 }}>PDF de referencia</label>
            <input type="file" accept="application/pdf" onChange={onPdf} style={{ fontSize: 12 }} />
            {form.pdfName && <span style={{ fontSize: 12, color: '#15803d' }}>✓ {form.pdfName}</span>}
          </div>
          <div style={{ marginTop: 14 }}>
            <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} onClick={save}>Guardar mes</button>
          </div>
        </section>
      )}

      {/* KPIs del último mes */}
      {latest && (
        <>
          <h3 className={styles.sectionTitle}>{latest.label} {latest.source === 'seed' && <span style={{ fontSize: 11, color: '#8696a7', fontWeight: 400 }}>· base</span>}</h3>
          <div className={styles.kpiRow} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
            <div className="glass-panel" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#8696a7', marginBottom: 4 }}>CAC blended</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>{fmtArs(latest.blendedCacArs)}</div>
              <div style={{ marginTop: 4 }}><Delta pct={latestDelta?.cacPct ?? null} goodIsDown /> <span style={{ fontSize: 11, color: '#8696a7' }}>vs mes previo</span></div>
            </div>
            <div className="glass-panel" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#8696a7', marginBottom: 4 }}>Inversión lead-gen</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>{fmtArsShort(latest.totalSpendArs)}</div>
              <div style={{ marginTop: 4 }}><Delta pct={latestDelta?.spendPct ?? null} /> <span style={{ fontSize: 11, color: '#8696a7' }}>vs mes previo</span></div>
            </div>
            <div className="glass-panel" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#8696a7', marginBottom: 4 }}>Leads</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>{fmt(latest.totalLeads)}</div>
              <div style={{ marginTop: 4 }}><Delta pct={latestDelta?.leadsPct ?? null} /> <span style={{ fontSize: 11, color: '#8696a7' }}>vs mes previo</span></div>
            </div>
          </div>
        </>
      )}

      {/* Tendencia */}
      <h3 className={styles.sectionTitle}>Tendencia del CAC</h3>
      {history.length < 2 ? (
        <div className="glass-panel" style={{ padding: 18 }}>
          <div className={styles.emptyState} style={{ padding: 8 }}>Cargá al menos un mes más para ver la tendencia. Hoy solo está la base ({latest?.label}).</div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 18, marginBottom: 18 }}>
          <CacSparkline months={history} />
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 8, fontSize: 11, color: '#8696a7', fontWeight: 700, padding: '4px 0', borderBottom: '1px solid var(--surface-border)' }}>
              <span>Mes</span><span>CAC</span><span>Δ CAC</span><span>Inversión</span><span>Leads</span>
            </div>
            {history.map((m, i) => {
              const d = deltaVsPrev(history, i);
              return (
                <div key={m.month} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 8, fontSize: 12.5, padding: '7px 0', borderBottom: '1px solid rgba(0,45,95,0.05)', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: '#3a4a5c', fontWeight: 600 }}>{m.label}</span>
                  <span style={{ color: '#002D5F' }}>{fmtArs(m.blendedCacArs)}</span>
                  <span><Delta pct={d?.cacPct ?? null} goodIsDown /></span>
                  <span style={{ color: '#3a4a5c' }}>{fmtArsShort(m.totalSpendArs)}</span>
                  <span style={{ color: '#3a4a5c' }}>{fmt(m.totalLeads)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mix de canales del último mes */}
      {latest && latest.channels.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Mix de canales · {latest.label}</h3>
          <div className="glass-panel" style={{ padding: 18 }}>
            {(() => {
              const total = latest.channels.reduce((a, c) => a + c.spendArs, 0) || 1;
              return latest.channels.map((c) => (
                <div key={c.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                    <span style={{ color: '#3a4a5c', fontWeight: 600 }}>{c.label}</span>
                    <span style={{ color: '#5b6b7f' }}>{fmtArsShort(c.spendArs)} · {((c.spendArs / total) * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 7, background: 'rgba(0,45,95,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(c.spendArs / total) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#002D5F,#3FB6E6)' }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </>
      )}

      <div style={{ marginTop: 16, fontSize: 11.5, color: '#8696a7', lineHeight: 1.6 }}>
        ℹ️ El CAC blended ($spend/leads) es real del PELG. El LTV con el que se cruza en Oportunidades sigue siendo estimado (permanencia + margen supuestos). Cuando haya 2+ meses, el guardrail económico de un experimento se puede leer acá: si su mes movió el CAC.
      </div>
    </div>
  );
}
