"use client";
import React, { useEffect, useState } from 'react';
import styles from '../funnel/funnel.module.css';
import PageSkeleton from '@/components/PageSkeleton';
import type { Analytics } from '@/lib/mixpanel/analytics';
import type { ExperimentMeasurement } from '@/lib/triangulation/measure';

type Estado = 'planeado' | 'en_curso' | 'cerrado';
type Veredicto = 'validado' | 'refutado' | 'inconcluso';
type Clase = 'intencional' | 'ripple' | 'guardrail' | 'contexto';

interface BaseStep { key: string; label: string; value: number }
interface Experimento {
  id: string;
  hipotesis: string;
  funnelId: string;
  funnelName: string;
  targetStepKey: string;
  targetStepLabel: string;
  estado: Estado;
  baseline: BaseStep[];
  resultado?: Record<string, number>;
  veredicto?: Veredicto;
  aprendizaje?: string;
  mixpanelFunnel?: string;
  fechaInicio?: string;
  targetStepEvent?: string;
  autoMeasured?: boolean;
  beforeRange?: string;
  afterRange?: string;
  measurement?: ExperimentMeasurement; // veredicto triangulado del motor
  fromOpportunity?: string; // rec.id de la oportunidad de origen (#3)
  fromOpportunityTitle?: string;
  createdAt: string;
}

const STORE_KEY = 'gb_experiments';
const ESTADO_LABEL: Record<Estado, string> = { planeado: 'Planeado', en_curso: 'En curso', cerrado: 'Cerrado' };
const VEREDICTO_LABEL: Record<Veredicto, string> = { validado: '✅ Validado', refutado: '❌ Refutado', inconcluso: '🤔 Inconcluso' };
const CLASE_LABEL: Record<Clase, string> = { intencional: '🎯 intencional', ripple: '🌊 ripple', guardrail: '🛡️ guardrail', contexto: 'contexto' };
const fmt = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('es-AR'));
const pctd = (n: number | null) => (n == null ? '—' : `${n >= 0 ? '+' : ''}${(n * 100).toFixed(0)}%`);
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-border)',
  background: 'var(--surface-color)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.85rem', marginTop: 4,
};

function crossImpact(e: Experimento) {
  let ti = e.baseline.findIndex((b) => b.key === e.targetStepKey);
  if (ti < 0) ti = e.baseline.length - 1;
  return e.baseline.map((b, i) => {
    const after = e.resultado?.[b.key];
    const deltaPct = after != null && b.value ? (after - b.value) / b.value : null;
    let cls: Clase = 'contexto';
    if (i === ti) cls = 'intencional';
    else if (i > ti) cls = deltaPct != null && deltaPct < -0.01 ? 'guardrail' : 'ripple';
    return { ...b, after, deltaPct, cls };
  });
}
function suggestVeredicto(e: Experimento): Veredicto {
  const t = e.baseline.find((b) => b.key === e.targetStepKey);
  const after = e.resultado?.[e.targetStepKey];
  if (!t || after == null || !t.value) return 'inconcluso';
  const d = (after - t.value) / t.value;
  return d > 0.05 ? 'validado' : d < -0.05 ? 'refutado' : 'inconcluso';
}

const VERDICT_META: Record<ExperimentMeasurement['verdict'], { label: string; color: string; bg: string }> = {
  validado: { label: '✅ Validado', color: '#15803d', bg: 'rgba(22,128,61,0.08)' },
  validado_con_guardrail: { label: '✅⚠ Validado con guardrail', color: '#a16207', bg: 'rgba(161,98,7,0.10)' },
  refutado: { label: '❌ Refutado', color: '#b91c1c', bg: 'rgba(185,28,28,0.08)' },
  inconcluso: { label: '🤔 Inconcluso', color: '#5b6b7f', bg: 'rgba(91,107,127,0.08)' },
};

// Veredicto triangulado del motor: significancia + 3 guardrails + confounds + honestidad.
function MeasurementPanel({ m }: { m: ExperimentMeasurement }) {
  const v = VERDICT_META[m.verdict];
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--surface-border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#8696a7', marginBottom: 8 }}>
        Veredicto del motor · triangulado
      </div>
      <div style={{ display: 'inline-block', padding: '4px 11px', borderRadius: 8, fontWeight: 700, fontSize: 13, color: v.color, background: v.bg, marginBottom: 8 }}>{v.label}</div>
      <div style={{ fontSize: 12.5, color: '#3a4a5c', marginBottom: 10, lineHeight: 1.55 }}>{m.verdictReason}</div>

      {m.target && (
        <div style={{ fontSize: 12, color: '#3a4a5c', marginBottom: 8, padding: '8px 10px', background: 'rgba(0,45,95,0.035)', borderRadius: 8, lineHeight: 1.55 }}>
          <b>Objetivo · {m.target.label}:</b> {(m.target.beforeConv * 100).toFixed(1)}% → {(m.target.afterConv * 100).toFixed(1)}% conv
          {' '}({m.target.absLift >= 0 ? '+' : ''}{(m.target.absLift * 100).toFixed(1)}pp)<br />
          <span style={{ color: m.target.significant ? '#15803d' : '#a16207', fontWeight: 600 }}>
            {m.target.significant ? '✓ significativo' : '✕ no significativo'} (p={m.target.pValue.toFixed(3)})
          </span>
          {' · '}muestra {m.power.targetN.toLocaleString('es-AR')}{m.power.underpowered ? ' (insuficiente p/ +10%)' : ''}
        </div>
      )}

      <div style={{ fontSize: 11.5, marginBottom: 6 }}>
        <b style={{ color: '#3a4a5c' }}>🛡️ Guardrails</b>
        {m.guardrails.behavioral.length ? (
          <div style={{ color: '#b91c1c', marginTop: 3 }}>Comportamiento: rompió {m.guardrails.behavioral.map((b) => `${b.label} (${(b.deltaPP * 100).toFixed(1)}pp)`).join(', ')}</div>
        ) : (
          <div style={{ color: '#15803d', marginTop: 3 }}>Comportamiento: sin rupturas aguas abajo ✓</div>
        )}
        <div style={{ color: '#8696a7', marginTop: 2 }}>Comercial: {m.guardrails.commercial}</div>
        <div style={{ color: '#8696a7', marginTop: 2 }}>Económico: {m.guardrails.economic}</div>
      </div>

      <div style={{ fontSize: 11.5, color: '#3a4a5c', marginBottom: 6 }}>
        <b>🌊 Ripple:</b> {m.ripple.downstreamImproved.length ? `mejoraron ${m.ripple.downstreamImproved.join(', ')}` : 'sin propagación aguas abajo'}
      </div>

      {m.confounds.map((c, i) => (
        <div key={i} style={{ fontSize: 11, color: '#9a6a00', marginTop: 3, display: 'flex', gap: 5 }}><span>⚠</span><span>{c}</span></div>
      ))}
      <div style={{ marginTop: 8, fontSize: 10.5, color: '#8696a7', borderTop: '1px dotted #e3e9f0', paddingTop: 6, lineHeight: 1.5 }}>
        {m.honesty.map((h, i) => (<div key={i} style={{ marginTop: 3 }}>ℹ️ {h}</div>))}
      </div>
    </div>
  );
}

export default function ExperimentosPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exps, setExps] = useState<Experimento[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ hipotesis: '', funnelId: '', targetStepKey: '', mixpanelFunnel: '', fechaInicio: '' });
  const [measuringId, setMeasuringId] = useState<string | null>(null);
  const [measureVals, setMeasureVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [autoErr, setAutoErr] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/mixpanel/analytics').then((r) => r.json()).then(setData).finally(() => setLoading(false));
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) setExps(JSON.parse(raw)); } catch { /* noop */ }
  }, []);

  const persist = (next: Experimento[]) => { setExps(next); try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* noop */ } };
  const update = (id: string, patch: Partial<Experimento>) => persist(exps.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id: string) => persist(exps.filter((e) => e.id !== id));

  const parseFunnelId = (s: string): number | null => {
    const m = s.match(/view\/(\d+)/) || s.match(/(\d{6,})/);
    return m ? Number(m[1]) : null;
  };

  const autoMeasure = async (e: Experimento) => {
    if (!e.mixpanelFunnel || !e.fechaInicio) return;
    const fid = parseFunnelId(e.mixpanelFunnel);
    if (!fid) { setAutoErr((p) => ({ ...p, [e.id]: 'No pude leer el ID del funnel del link.' })); return; }
    setBusy(e.id);
    setAutoErr((p) => ({ ...p, [e.id]: '' }));
    try {
      const r = await fetch(`/api/mixpanel/experiment-measure?funnelId=${fid}&start=${e.fechaInicio}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      const baseline: BaseStep[] = (j.before || []).map((s: { event: string; label: string; count: number }) => ({ key: s.event, label: s.label, value: s.count }));
      const resultado: Record<string, number> = {};
      (j.after || []).forEach((s: { event: string; count: number }) => { resultado[s.event] = s.count; });
      const targetKey = e.targetStepEvent && baseline.some((b) => b.key === e.targetStepEvent) ? e.targetStepEvent : baseline[baseline.length - 1]?.key;
      const closed = { ...e, baseline, resultado, targetStepKey: targetKey };
      const m = j.measurement as ExperimentMeasurement | undefined;
      const veredicto: Veredicto = m
        ? m.verdict === 'refutado' ? 'refutado' : m.verdict === 'inconcluso' ? 'inconcluso' : 'validado'
        : suggestVeredicto(closed);
      update(e.id, {
        baseline, resultado, targetStepKey: targetKey, estado: 'cerrado',
        veredicto, measurement: m, autoMeasured: true, beforeRange: j.beforeRange, afterRange: j.afterRange,
      });
    } catch (err) {
      setAutoErr((p) => ({ ...p, [e.id]: String((err as Error)?.message || err) }));
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <PageSkeleton />;

  const funnels = data?.funnels ?? [];
  const selectedFunnel = funnels.find((f) => f.id === form.funnelId);
  const targetOptions = (selectedFunnel?.steps ?? []).filter((s) => s.status === 'live' && s.value != null);

  const create = () => {
    if (!form.hipotesis.trim() || !selectedFunnel) return;
    const liveSteps = selectedFunnel.steps.filter((s) => s.status === 'live' && s.value != null);
    const targetStep = liveSteps.find((s) => s.key === form.targetStepKey) ?? liveSteps[liveSteps.length - 1];
    const e: Experimento = {
      id: `e${Date.now()}`,
      hipotesis: form.hipotesis.trim(),
      funnelId: selectedFunnel.id,
      funnelName: selectedFunnel.name,
      targetStepKey: targetStep.key,
      targetStepLabel: targetStep.label,
      targetStepEvent: targetStep.event ?? undefined,
      estado: 'planeado',
      baseline: liveSteps.map((s) => ({ key: s.key, label: s.label, value: s.value as number })),
      mixpanelFunnel: form.mixpanelFunnel.trim() || undefined,
      fechaInicio: form.fechaInicio || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    persist([e, ...exps]);
    setForm({ hipotesis: '', funnelId: '', targetStepKey: '', mixpanelFunnel: '', fechaInicio: '' });
    setShowForm(false);
  };

  const startMeasuring = (e: Experimento) => {
    setMeasuringId(e.id);
    const init: Record<string, string> = {};
    e.baseline.forEach((b) => (init[b.key] = String(b.value)));
    setMeasureVals(init);
  };
  const saveMeasurement = (e: Experimento) => {
    const resultado: Record<string, number> = {};
    e.baseline.forEach((b) => { const v = parseFloat(measureVals[b.key]); resultado[b.key] = isNaN(v) ? b.value : v; });
    const closed = { ...e, estado: 'cerrado' as Estado, resultado };
    update(e.id, { estado: 'cerrado', resultado, veredicto: suggestVeredicto(closed) });
    setMeasuringId(null);
  };

  const groups: { key: Estado; label: string }[] = [
    { key: 'en_curso', label: 'En curso' },
    { key: 'planeado', label: 'Planeados' },
    { key: 'cerrado', label: 'Cerrados' },
  ];

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Experimentos</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            De la hipótesis al resultado, midiendo el impacto en TODO el funnel: 🎯 intencional · 🌊 ripple · 🛡️ guardrail.
          </p>
        </div>
        <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancelar' : '+ Nuevo experimento'}
        </button>
      </header>

      {showForm && (
        <section className={`glass-panel ${styles.card}`} style={{ marginBottom: 18 }}>
          <label className={styles.kpiLabel}>Hipótesis</label>
          <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} placeholder="Si [cambio], entonces [métrica] mejora X%"
            value={form.hipotesis} onChange={(e) => setForm({ ...form, hipotesis: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label className={styles.kpiLabel}>Funnel</label>
              <select style={inputStyle} value={form.funnelId} onChange={(e) => setForm({ ...form, funnelId: e.target.value, targetStepKey: '' })}>
                <option value="">Elegí un funnel…</option>
                {funnels.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={styles.kpiLabel}>Paso objetivo</label>
              <select style={inputStyle} value={form.targetStepKey} onChange={(e) => setForm({ ...form, targetStepKey: e.target.value })} disabled={!selectedFunnel}>
                <option value="">{selectedFunnel ? 'Elegí el paso…' : 'Elegí un funnel primero'}</option>
                {targetOptions.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label className={styles.kpiLabel}>Funnel de Mixpanel (link o ID)</label>
              <input style={inputStyle} placeholder="Pegá el funnel/board donde corre el experimento…" value={form.mixpanelFunnel} onChange={(e) => setForm({ ...form, mixpanelFunnel: e.target.value })} />
            </div>
            <div>
              <label className={styles.kpiLabel}>Fecha de inicio</label>
              <input style={inputStyle} type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
            </div>
          </div>
          <div className={styles.healthSub} style={{ marginTop: 8 }}>
            Con el link + la fecha, la medición antes/después es <strong>automática y triangulada</strong> (significancia + guardrails + honestidad). Mixpanel ya está en vivo.
          </div>
          <div style={{ marginTop: 14 }}>
            <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} onClick={create}>Crear (captura baseline)</button>
          </div>
        </section>
      )}

      {exps.length === 0 && (
        <div className={`glass-panel ${styles.card}`}>
          <div className={styles.emptyState} style={{ padding: 28 }}>
            Todavía no hay experimentos. Tomá una <strong>oportunidad</strong> y convertila en una hipótesis.<br />
            Al crearla se captura el <strong>baseline del funnel</strong>; al cerrarla, el motor mide el impacto cruzado.
          </div>
        </div>
      )}

      {groups.map((g) => {
        const list = exps.filter((e) => e.estado === g.key);
        if (!list.length) return null;
        return (
          <section key={g.key}>
            <h3 className={styles.sectionTitle}>{g.label} ({list.length})</h3>
            <div className={styles.recsGrid}>
              {list.map((e) => (
                <div key={e.id} className={`glass-panel ${styles.rec}`}>
                  <div className={styles.recTop}>
                    <span className={`${styles.statusBadge} ${styles['status_' + (e.estado === 'en_curso' ? 'en_progreso' : e.estado === 'cerrado' ? 'hecha' : 'descartada')]}`}>{ESTADO_LABEL[e.estado]}</span>
                    <span className={styles.recFunnel}>· {e.funnelName} · 🎯 {e.targetStepLabel}</span>
                    <span className={styles.recOwner} style={{ marginLeft: 'auto' }}>{e.createdAt}</span>
                  </div>
                  <div className={styles.recTitle}>{e.hipotesis}</div>
                  {e.fromOpportunityTitle && (
                    <div className={styles.signalSub} style={{ marginTop: 4, color: '#15803d' }}>
                      🎯 Desde oportunidad: {e.fromOpportunityTitle}
                    </div>
                  )}
                  {e.mixpanelFunnel && (
                    <div className={styles.signalSub} style={{ marginTop: 4 }}>
                      📊 Mixpanel: {e.mixpanelFunnel}{e.fechaInicio ? ` · desde ${e.fechaInicio}` : ''}
                    </div>
                  )}

                  {/* MEDICIÓN (cerrar) */}
                  {measuringId === e.id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--surface-border)' }}>
                      <div className={styles.kpiLabel} style={{ marginBottom: 6 }}>Resultado por paso (editá los valores «después»)</div>
                      {e.baseline.map((b) => (
                        <div key={b.key} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                          <span className={styles.impactLabel}>{b.label}</span>
                          <span className={styles.healthSub}>base {fmt(b.value)}</span>
                          <input style={{ ...inputStyle, marginTop: 0 }} type="number" value={measureVals[b.key] ?? ''} onChange={(ev) => setMeasureVals({ ...measureVals, [b.key]: ev.target.value })} />
                        </div>
                      ))}
                      <div className={styles.recActions}>
                        <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} onClick={() => saveMeasurement(e)}>Calcular y cerrar</button>
                        <button className={styles.recBtn} onClick={() => setMeasuringId(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}

                  {/* IMPACTO CRUZADO (cerrado) */}
                  {e.estado === 'cerrado' && e.resultado && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--surface-border)' }}>
                      <div className={styles.kpiLabel} style={{ marginBottom: 6 }}>Impacto cruzado{e.autoMeasured ? ` · automático · ${e.beforeRange} vs ${e.afterRange}` : ''}</div>
                      {crossImpact(e).map((r) => (
                        <div key={r.key} className={styles.impactRow}>
                          <span className={styles.impactLabel}>{r.label}</span>
                          <span className={`${styles.impactDelta} ${r.deltaPct != null && r.deltaPct < 0 ? styles.signalDown : r.deltaPct ? styles.signalUp : ''}`}>{pctd(r.deltaPct)}</span>
                          <span className={`${styles.impactClass} ${styles['cls_' + r.cls]}`}>{CLASE_LABEL[r.cls]}</span>
                        </div>
                      ))}
                      {e.measurement && <MeasurementPanel m={e.measurement} />}
                      <div style={{ marginTop: 10 }}>
                        <label className={styles.kpiLabel}>Veredicto {e.measurement ? '(podés sobrescribir el del motor)' : ''}</label>
                        <select style={{ ...inputStyle, marginBottom: 8 }} value={e.veredicto ?? 'inconcluso'} onChange={(ev) => update(e.id, { veredicto: ev.target.value as Veredicto })}>
                          {(Object.keys(VEREDICTO_LABEL) as Veredicto[]).map((v) => <option key={v} value={v}>{VEREDICTO_LABEL[v]}</option>)}
                        </select>
                        <label className={styles.kpiLabel}>Aprendizaje (alimentará el Playbook)</label>
                        <textarea style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} placeholder="¿Qué aprendimos?"
                          value={e.aprendizaje ?? ''} onChange={(ev) => update(e.id, { aprendizaje: ev.target.value })} />
                      </div>
                    </div>
                  )}

                  <div className={styles.recActions}>
                    {e.estado === 'planeado' && <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} onClick={() => update(e.id, { estado: 'en_curso' })}>Iniciar</button>}
                    {e.estado === 'en_curso' && e.mixpanelFunnel && e.fechaInicio && <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} disabled={busy === e.id} onClick={() => autoMeasure(e)}>{busy === e.id ? 'Midiendo…' : '📊 Medir automático'}</button>}
                    {e.estado === 'en_curso' && measuringId !== e.id && <button className={styles.recBtn} onClick={() => startMeasuring(e)}>Cerrar y medir (manual)</button>}
                    {e.estado === 'cerrado' && <button className={styles.recBtn} onClick={() => update(e.id, { estado: 'en_curso', resultado: undefined, veredicto: undefined, autoMeasured: undefined })}>Reabrir</button>}
                    <button className={styles.recBtn} onClick={() => remove(e.id)}>Eliminar</button>
                  </div>
                  {autoErr[e.id] && <div className={styles.signalSub} style={{ color: 'var(--danger-color)', marginTop: 6 }}>{autoErr[e.id]}</div>}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
