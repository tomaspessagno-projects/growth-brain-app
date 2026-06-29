"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../funnel/funnel.module.css';
import PageSkeleton from '@/components/PageSkeleton';
import type { Recommendation } from '@/lib/mixpanel/recommendations';
import type { TriScore } from '@/lib/triangulation/score';
import { mapOppToFunnel, buildExperimentFromOpp } from '@/lib/experiments/fromOpportunity';
import { upsertExperiment } from '@/lib/store/experiments';
import { loadStatuses, setOppStatus } from '@/lib/store/oppStatus';
import { useAnalytics } from '@/components/AnalyticsProvider';

function fmtArsShort(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)} mil M`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${Math.round(n)}`;
}

const lblStyle: React.CSSProperties = { fontSize: 11, color: '#8696a7', fontWeight: 600, display: 'block', marginBottom: 3 };
const inStyle: React.CSSProperties = { width: '100%', padding: '7px 9px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13 };

function SrcChip({ color, label, text }: { color: string; label: string; text: string }) {
  return (
    <span style={{ fontSize: 11, color: '#3a4a5c', background: '#fff', border: '1px solid #e3e9f0', borderRadius: 6, padding: '2px 7px', lineHeight: 1.5 }}>
      <b style={{ color }}>{label}</b> · {text}
    </span>
  );
}

// Bloque de triangulación: $ en juego + base (qué dato de cada fuente lo sostiene) + honestidad.
function TriBlock({ tri }: { tri: TriScore }) {
  const proceso = tri.changeKind === 'proceso';
  return (
    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(0,45,95,0.035)', border: '1px solid rgba(0,45,95,0.08)' }}>
      <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, marginBottom: 8, color: proceso ? '#1689C4' : '#15803d', background: proceso ? 'rgba(22,137,196,0.10)' : 'rgba(21,128,61,0.10)' }}>
        {proceso ? '⚙️ Proceso / performance' : '💰 Económico'}
      </span>
      {tri.marginAtStakeArs != null ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 21, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, var(--font-satoshi), sans-serif' }}>
            {fmtArsShort(tri.marginAtStakeArs)}
          </span>
          <span style={{ fontSize: 12, color: '#5b6b7f' }}>
            en juego {tri.cadence === 'acumulado' ? '· acumulado' : '/ mes'}
            {tri.reach != null && ` · alcance ${tri.reach.toLocaleString('es-AR')}`}
          </span>
        </div>
      ) : (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#5b6b7f' }}>{proceso ? 'Sin $ directo — es un cambio de proceso/performance' : 'Sin $ directo todavía (falta el dato que lo vuelve medible)'}</div>
      )}
      {proceso && tri.feedsInto && (
        <div style={{ fontSize: 11.5, color: '#3a4a5c', marginTop: 6, display: 'flex', gap: 5 }}>
          <span>↘</span><span><b>Alimenta a:</b> {tri.feedsInto}</span>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {tri.basis.mixpanel && <SrcChip color="#7b3fe4" label="Mixpanel" text={tri.basis.mixpanel} />}
        {tri.basis.hubspot && <SrcChip color="#ff7a59" label="HubSpot" text={tri.basis.hubspot} />}
        {tri.basis.pelg && <SrcChip color="#1689C4" label="PELG" text={tri.basis.pelg} />}
      </div>
      <div style={{ fontSize: 11, color: '#8696a7', marginTop: 6 }}>
        confianza {Math.round(tri.confidence * 100)}% · esfuerzo {tri.effort}/3 · urgencia ×{tri.urgency}
      </div>
      {tri.band && (
        <div style={{ fontSize: 11.5, color: '#3a4a5c', marginTop: 6 }}>
          🎲 Rango P10–P90: <b>{fmtArsShort(tri.band.p10)} – {fmtArsShort(tri.band.p90)}</b>
          {tri.band.robust ? ' · robusto a los supuestos' : ` · sensible sobre todo a "${tri.band.dominantDriver}"`}
        </div>
      )}
      {tri.honesty.map((h, i) => (
        <div key={i} style={{ fontSize: 11, color: '#9a6a00', marginTop: 4, display: 'flex', gap: 5 }}>
          <span>⚠</span><span>{h}</span>
        </div>
      ))}
    </div>
  );
}
type Status = 'pendiente' | 'en_progreso' | 'hecha' | 'descartada';

const DISC_LABEL: Record<string, string> = { diseno: 'Diseño', producto: 'Producto', desarrollo: 'Desarrollo', datos: 'Datos' };
const STATUS_LABEL: Record<string, string> = { en_progreso: 'En progreso', hecha: 'Hecha', descartada: 'Descartada' };
const FILTERS = [
  { key: 'todas', label: 'Todas' },
  { key: 'diseno', label: 'Diseño' },
  { key: 'producto', label: 'Producto' },
  { key: 'desarrollo', label: 'Desarrollo' },
  { key: 'datos', label: 'Datos' },
];
const VIEWS = [
  { key: 'activas', label: 'Activas' },
  { key: 'hechas', label: 'Hechas / descartadas' },
  { key: 'todas', label: 'Todas' },
];

export default function OportunidadesPage() {
  const { data, loading } = useAnalytics();
  const [filter, setFilter] = useState('todas');
  const [view, setView] = useState('activas');
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [takingId, setTakingId] = useState<string | null>(null);
  const [takeForm, setTakeForm] = useState({ funnelId: '', targetStepKey: '', mixpanelFunnel: '', fechaInicio: '' });
  const [takenMsg, setTakenMsg] = useState<string | null>(null);

  useEffect(() => {
    loadStatuses().then(setStatuses).catch(() => {});
  }, []);

  const setStatus = (id: string, s: Status) => {
    setStatuses((prev) => {
      const next = { ...prev };
      if (s === 'pendiente') delete next[id];
      else next[id] = s;
      return next;
    });
    setOppStatus(id, s).catch(() => {});
  };

  const today = new Date().toISOString().slice(0, 10);
  const openTake = (r: Recommendation) => {
    const f = data ? mapOppToFunnel(r, data.funnels) : undefined;
    setTakeForm({ funnelId: f?.id ?? '', targetStepKey: '', mixpanelFunnel: '', fechaInicio: today });
    setTakenMsg(null);
    setTakingId(r.id);
  };
  const confirmTake = (r: Recommendation) => {
    const f = data?.funnels.find((x) => x.id === takeForm.funnelId);
    if (!f) return;
    const exp = buildExperimentFromOpp(r, f, takeForm, today);
    upsertExperiment(exp).catch(() => {});
    setStatus(r.id, 'en_progreso');
    setTakingId(null);
    setTakenMsg(r.id);
  };

  if (loading) return <PageSkeleton />;
  if (!data) return <div className={styles.container}>Error cargando datos.</div>;

  const all = data.recommendations.map((r, i) => ({ ...r, rank: i + 1, status: (statuses[r.id] ?? 'pendiente') as Status }));
  const isActive = (s: Status) => s === 'pendiente' || s === 'en_progreso';
  const doneCount = all.filter((r) => r.status === 'hecha').length;
  const progressPct = all.length ? (doneCount / all.length) * 100 : 0;

  let pool = all;
  if (view === 'activas') pool = all.filter((r) => isActive(r.status));
  else if (view === 'hechas') pool = all.filter((r) => !isActive(r.status));
  const shown = filter === 'todas' ? pool : pool.filter((r) => r.discipline === filter);
  const countFor = (k: string) => (k === 'todas' ? pool.length : pool.filter((r) => r.discipline === k).length);

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Oportunidades</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Qué hay que mejorar — priorizadas por <b>plata en juego</b> (Mixpanel × HubSpot × PELG), no por % de fuga. Marcá las que vas tomando.
          </p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeSnap}`}>Snapshot · {data.meta.asOf}</span>
        </div>
      </header>

      <div className={styles.progress}>
        <span className={styles.progressLabel}>{doneCount}/{all.length} resueltas</span>
        <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${progressPct}%` }} /></div>
      </div>

      <div className={styles.tabs}>
        {VIEWS.map((v) => (
          <button key={v.key} className={`${styles.tab} ${view === v.key ? styles.tabActive : ''}`} onClick={() => setView(v.key)}>{v.label}</button>
        ))}
      </div>

      <div className={styles.tabs}>
        {FILTERS.map((f) => (
          <button key={f.key} className={`${styles.tab} ${filter === f.key ? styles.tabActive : ''}`} onClick={() => setFilter(f.key)}>
            {f.label} ({countFor(f.key)})
          </button>
        ))}
      </div>

      <div className={styles.recsGrid}>
        {shown.length === 0 && <div className={styles.emptyState}>Nada por acá. {view === 'activas' ? '¡Todo tomado en esta vista! 🎉' : 'Cambiá de vista o filtro.'}</div>}
        {shown.map((r) => (
          <div key={r.id} className={`glass-panel ${styles.rec} ${!isActive(r.status) ? styles.recDone : ''}`}>
            <div className={styles.recTop}>
              <span className={styles.oppRank}>#{r.rank}</span>
              <span className={`${styles.disc} ${styles['disc_' + r.discipline]}`}>{DISC_LABEL[r.discipline]}</span>
              {r.funnel && <span className={styles.recFunnel}>· {r.funnel}</span>}
              {r.status !== 'pendiente' && <span className={`${styles.statusBadge} ${styles['status_' + r.status]}`}>{STATUS_LABEL[r.status]}</span>}
              <span className={`${styles.recPrio} ${styles['prio_' + r.priority]}`}>{r.priority}</span>
            </div>
            <div className={styles.recTitle}>{r.title}</div>
            <div className={styles.recDetail}>{r.detail}</div>
            {r.tri && <TriBlock tri={r.tri} />}
            <Link href={`/oportunidades/${encodeURIComponent(r.id)}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12.5, color: '#1689C4', fontWeight: 600, textDecoration: 'none' }}>Ver la lógica del algoritmo →</Link>
            {r.backedBy && <div className={styles.backed} title={r.backedBy.statement}>📖 Respaldado por el playbook</div>}
            {takenMsg === r.id && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: '#15803d', fontWeight: 600 }}>
                ✓ Experimento creado en curso · <Link href="/experimentos" style={{ color: '#1689C4' }}>Ver en Experimentos →</Link>
              </div>
            )}
            {takingId === r.id && data && (
              <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: 'rgba(22,137,196,0.05)', border: '1px solid rgba(22,137,196,0.22)' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#002D5F', marginBottom: 8 }}>Tomar como experimento — pegá el board para trackearlo</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lblStyle}>Funnel</label>
                    <select style={inStyle} value={takeForm.funnelId} onChange={(e) => setTakeForm({ ...takeForm, funnelId: e.target.value, targetStepKey: '' })}>
                      <option value="">Elegí funnel…</option>
                      {data.funnels.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lblStyle}>Paso objetivo (opcional)</label>
                    <select style={inStyle} value={takeForm.targetStepKey} onChange={(e) => setTakeForm({ ...takeForm, targetStepKey: e.target.value })} disabled={!takeForm.funnelId}>
                      <option value="">Último paso vivo</option>
                      {(data.funnels.find((f) => f.id === takeForm.funnelId)?.steps || []).filter((s) => s.status === 'live' && s.value != null).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 8 }}>
                  <div>
                    <label style={lblStyle}>Board de Mixpanel (link o ID)</label>
                    <input style={inStyle} placeholder="Pegá el funnel/board donde vas a trackear…" value={takeForm.mixpanelFunnel} onChange={(e) => setTakeForm({ ...takeForm, mixpanelFunnel: e.target.value })} />
                  </div>
                  <div>
                    <label style={lblStyle}>Fecha de inicio</label>
                    <input style={inStyle} type="date" value={takeForm.fechaInicio} onChange={(e) => setTakeForm({ ...takeForm, fechaInicio: e.target.value })} />
                  </div>
                </div>
                {!takeForm.funnelId && <div style={{ fontSize: 11, color: '#9a6a00', marginTop: 6 }}>⚠ Esta oportunidad no mapea a un funnel directo — elegí en cuál vas a medirla.</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} disabled={!takeForm.funnelId} onClick={() => confirmTake(r)}>Crear experimento y tomar</button>
                  <button className={styles.recBtn} onClick={() => setTakingId(null)}>Cancelar</button>
                </div>
              </div>
            )}
            <div className={styles.recActions}>
              {r.status === 'pendiente' && (
                <>
                  <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} onClick={() => setStatus(r.id, 'hecha')}>✓ Resuelta</button>
                  <button className={styles.recBtn} onClick={() => openTake(r)}>Tomar → experimento</button>
                  <button className={styles.recBtn} onClick={() => setStatus(r.id, 'descartada')}>Descartar</button>
                </>
              )}
              {r.status === 'en_progreso' && (
                <>
                  <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} onClick={() => setStatus(r.id, 'hecha')}>✓ Marcar resuelta</button>
                  <button className={styles.recBtn} onClick={() => setStatus(r.id, 'descartada')}>Descartar</button>
                  <button className={styles.recBtn} onClick={() => setStatus(r.id, 'pendiente')}>Volver a pendiente</button>
                </>
              )}
              {(r.status === 'hecha' || r.status === 'descartada') && (
                <button className={styles.recBtn} onClick={() => setStatus(r.id, 'pendiente')}>Reabrir</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
