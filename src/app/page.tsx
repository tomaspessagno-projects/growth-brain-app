"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './funnel/funnel.module.css';
import PageSkeleton from '@/components/PageSkeleton';
import { rollup, health, WINRATE_TARGET, HEALTH_META, type Health } from '@/lib/mixpanel/benchmarks';
import { loadExperiments } from '@/lib/store/experiments';
import { useAnalytics } from '@/components/AnalyticsProvider';
import { MVP_MODE } from '@/lib/mvp';
import CrossChain from '@/components/CrossChain';
import type { ComputedFunnel } from '@/lib/mixpanel/analytics';
import type { Recommendation } from '@/lib/mixpanel/recommendations';

const fmt = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('es-AR'));
const pct = (n: number | null | undefined, d = 0) => (n == null ? '—' : `${(n * 100).toFixed(d)}%`);

interface Kpi { label: string; value: string; sub: string }

// Chip del selector de embudo.
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 999, cursor: 'pointer',
        border: active ? '1px solid #002D5F' : '1px solid rgba(0,45,95,0.16)',
        background: active ? '#002D5F' : '#fff', color: active ? '#fff' : '#3a4a5c', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

export default function Resumen() {
  const { data, loading, busy } = useAnalytics();
  const [expsEnCurso, setExpsEnCurso] = useState(0);
  const [sel, setSel] = useState<string>('todos'); // 'todos' | funnel.id | 'comercial'
  const [signals, setSignals] = useState<{ kind: string; direction: string; headline: string; detail: string }[]>([]);
  const [signalDays, setSignalDays] = useState(0);

  useEffect(() => {
    loadExperiments().then((list) => setExpsEnCurso(list.filter((e) => e.estado === 'en_curso').length)).catch(() => {});
  }, []);

  // Señales del motor (Capa 2): quiebres + pace vs meta sobre la serie diaria (cron / serie bakeada).
  useEffect(() => {
    fetch('/api/signals')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j) { setSignals(j.signals ?? []); setSignalDays(j.days ?? 0); } })
      .catch(() => {});
  }, []);

  if (loading) return <PageSkeleton />;
  if (!data || !data.summary) return <div className={styles.container}>Error cargando datos. Reintentá en un momento.</div>;

  // ───────────────────────────────────────────────────────────────────────────
  // MVP · MÍNIMA EXPRESIÓN — una sola pantalla de diagnóstico:
  //   (1) la cadena de crecimiento cruzando Mixpanel + HubSpot + PELG,
  //   (2) el cuello de botella priorizado (dónde se cae, con evidencia).
  // Nada más. El resto (histórico, experimentos, detección, selector, $) vive detrás del flag → v1.1+.
  if (MVP_MODE) {
    const cuellos = data.recommendations.slice(0, 3);
    return (
      <div className={`animate-fade-in ${styles.container}`}>
        <header className={styles.header}>
          <div>
            <h1 className="page-title">El embudo de crecimiento</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              Tus 3 herramientas en una sola cadena. Dónde entran los prospectos, dónde se caen, y cuál es el cuello de botella.
            </p>
          </div>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${data.source === 'live' ? styles.badgeLive : styles.badgeSnap}`}>
              {data.source === 'live' ? '● En vivo' : `Snapshot · ${data.meta.asOf}`}
            </span>
            <span className={styles.badgeMeta}>{data.window ? `${data.window.from} → ${data.window.to}` : `Últimos ${data.meta.rangeDays}d`}{busy ? ' · actualizando…' : ''}</span>
          </div>
        </header>

        <CrossChain data={data} />

        <h3 className={styles.sectionTitle}>El cuello de botella · dónde se cae</h3>
        {cuellos.length === 0 ? (
          <div className={`glass-panel ${styles.card}`}><div className={styles.signalSub}>Sin cuellos de botella detectados en este rango.</div></div>
        ) : (
          <div className={styles.recsGrid}>
            {cuellos.map((r, i) => (
              <Link key={r.id} href={`/oportunidades/${encodeURIComponent(r.id)}`} className={`glass-panel ${styles.rec}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className={styles.recTop}>
                  <span className={styles.oppRank}>#{i + 1}</span>
                  {r.funnel && <span className={styles.recFunnel}>· {r.funnel}</span>}
                  <span className={`${styles.recPrio} ${styles['prio_' + r.priority]}`}>{r.priority}</span>
                </div>
                <div className={styles.recTitle}>{r.title}</div>
                <div className={styles.recDetail}>{r.detail}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#1689C4', fontWeight: 600 }}>Ver la lógica →</div>
              </Link>
            ))}
          </div>
        )}
        <p style={{ marginTop: 20, fontSize: 12.5, color: '#8696a7', lineHeight: 1.6 }}>
          SysData te dice <strong>dónde</strong> está el problema cruzando las 3 herramientas — no qué hacer. La solución la decide el equipo.
        </p>
      </div>
    );
  }

  const s = data.summary;
  const h = data.hubspot;
  const selFunnel = data.funnels.find((f) => f.id === sel);
  const byId = (id: string) => data.funnels.find((f) => f.id === id);

  // ---- DATOS SEGÚN EL EMBUDO ELEGIDO (todo se reacomoda) ----
  let kpis: Kpi[];
  const wins: { label: string; delta: number }[] = [];
  const probs: { label: string; sub: string; sev: number; oppId?: string }[] = [];

  const addLeakAndConv = (f: ComputedFunnel) => {
    if (f.leakDropPct != null && f.leakDropPct >= 0.5) probs.push({ label: `${f.name}: fuga ${pct(f.leakDropPct)}`, sub: f.leakTransition ?? '', sev: f.leakDropPct, oppId: f.id === 'cotizador' ? 'imp-cot-design' : undefined });
    if (f.overallConversion != null && f.overallConversion < 0.12) probs.push({ label: `${f.name} convierte ${pct(f.overallConversion, f.overallConversion < 0.1 ? 1 : 0)}`, sub: 'conversión total baja', sev: 0.82 });
    (f.wow || []).forEach((w) => { if (w.deltaPct > 0.1) wins.push({ label: `${f.name} · ${w.label}`, delta: w.deltaPct }); });
  };

  if (sel === 'comercial' && h) {
    kpis = [
      { label: 'Cierre de ventas', value: pct(h.winRate, 0), sub: `${fmt(h.won)} ganados / ${fmt(h.lost)} perdidos` },
      { label: 'Negocios totales', value: fmt(h.totalDeals), sub: 'HubSpot' },
      { label: 'Mayor stock abierto', value: fmt(h.biggestOpenStage?.count), sub: h.biggestOpenStage?.label ?? '—' },
      { label: 'Contactos', value: fmt(h.contacts), sub: 'base CRM' },
    ];
    if (h.winRate != null && h.winRate < WINRATE_TARGET) probs.push({ label: `Cierre ${pct(h.winRate, 0)} (meta ${pct(WINRATE_TARGET, 0)})`, sub: 'la tasa de cierre está bajo meta', sev: 0.9, oppId: 'hs-winrate' });
    if (h.biggestOpenStage) probs.push({ label: `${fmt(h.biggestOpenStage.count)} negocios atascados`, sub: h.biggestOpenStage.label, sev: 0.7, oppId: 'hs-stock' });
  } else if (selFunnel) {
    const f = selFunnel;
    kpis = [
      { label: 'Entradas al embudo', value: fmt(f.top), sub: f.category },
      { label: 'Conversión total', value: pct(f.overallConversion, 1), sub: f.target != null ? `meta ${pct(f.target, 0)}` : 'sin meta' },
      { label: 'Mayor fuga', value: f.leakDropPct != null ? `−${pct(f.leakDropPct, 0)}` : '—', sub: f.leakTransition ?? '' },
      { label: 'Fin del embudo', value: fmt(f.bottom), sub: 'completaron' },
    ];
    addLeakAndConv(f);
  } else {
    // TODOS
    kpis = [
      { label: 'Entradas a embudos', value: fmt(s.totalEntradas), sub: `${data.funnels.length} embudos` },
      { label: 'Altas completadas', value: fmt(s.asociados), sub: 'WhatsApp (ind + fam)' },
      { label: 'Cierre de ventas', value: pct(h?.winRate, 0), sub: `HubSpot · ${fmt(h?.won)} ganados` },
      { label: 'Conversión cotizador', value: pct(s.cotizadorConversion, 1), sub: 'visita → fin' },
    ];
    const junk = byId('cotizador')?.channels?.find((c) => c.flag === 'junk');
    if (junk) probs.push({ label: `Canal "${junk.source}" convierte ~0%`, sub: `${pct(junk.sharePct)} del tráfico, ensucia la medición`, sev: 0.95, oppId: 'channel-junk' });
    data.funnels.forEach(addLeakAndConv);
  }

  wins.sort((a, b) => b.delta - a.delta);
  const topWins = wins.slice(0, 5);
  const seen = new Set<string>();
  const topProbs = probs.sort((a, b) => b.sev - a.sev).filter((p) => (seen.has(p.label) ? false : (seen.add(p.label), true))).slice(0, 5);

  // Oportunidades del embudo elegido.
  const recBelongs = (r: Recommendation): boolean => {
    if (sel === 'todos') return true;
    if (sel === 'comercial') return r.funnel === 'CRM' || r.funnel === 'NPS';
    if (selFunnel) return r.funnel === selFunnel.name || (selFunnel.id === 'cotizador' && r.funnel === 'Cotizador');
    return true;
  };
  const scopedRecs = data.recommendations.filter(recBelongs);
  const topOpps = scopedRecs.slice(0, 4);

  const liveSteps = selFunnel ? selFunnel.steps.filter((st) => st.status === 'live' && st.value != null) : [];

  const areas: { name: string; sub: string; hh: Health; metric: string; link: string }[] = [
    { name: 'Adquisición', sub: 'Cotizador', hh: byId('cotizador')?.health ?? 'atencion', metric: `Conv. ${pct(byId('cotizador')?.overallConversion, 1)} · meta ${pct(byId('cotizador')?.target, 0)}`, link: '/funnel/cotizador' },
    { name: 'Alta online', sub: 'WhatsApp + Portal', hh: rollup(['wa-individual', 'wa-familiar', 'portal-express'].map((id) => byId(id)?.health ?? 'atencion')), metric: '3 embudos', link: '/funnel/wa-individual' },
    { name: 'Leads', sub: 'Contacto + Empresa', hh: rollup(['contacto', 'empresa'].map((id) => byId(id)?.health ?? 'atencion')), metric: '2 embudos', link: '/funnel/contacto' },
    { name: 'Comercial', sub: 'HubSpot', hh: h ? health(h.winRate, WINRATE_TARGET) : 'atencion', metric: `Cierre ${pct(h?.winRate, 0)} · meta ${pct(WINRATE_TARGET, 0)}`, link: '/crm' },
  ];

  const mixpanelVacio = data.source === 'live' && s.totalEntradas === 0;
  const scopeLabel = sel === 'todos' ? 'todos los embudos' : sel === 'comercial' ? 'Comercial (HubSpot)' : selFunnel?.name ?? '';

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Resumen</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Cómo viene Medicus — elegí un embudo y todo se reacomoda a ese embudo.
          </p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${data.source === 'live' ? styles.badgeLive : styles.badgeSnap}`}>
            {data.source === 'live' ? '● En vivo' : `Snapshot · ${data.meta.asOf}`}
          </span>
          <span className={styles.badgeMeta}>{data.window ? `${data.window.from} → ${data.window.to}` : `Últimos ${data.meta.rangeDays}d`}{busy ? ' · actualizando…' : ''}</span>
        </div>
      </header>

      {mixpanelVacio && (
        <div style={{ background: 'rgba(211, 138, 24, 0.08)', border: '1px solid rgba(211, 138, 24, 0.28)', borderRadius: 12, padding: '11px 14px', marginBottom: 18, color: '#8a5a10', fontSize: 13 }}>
          <strong>Mixpanel está rate-limited ahora mismo</strong> — los números en vivo se completan solos cuando la Query API se libera. HubSpot sigue OK.
        </div>
      )}

      {/* SELECTOR DE EMBUDO */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color: '#8696a7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginRight: 2 }}>Ver:</span>
        <Chip label="Todos" active={sel === 'todos'} onClick={() => setSel('todos')} />
        {data.funnels.map((f) => <Chip key={f.id} label={f.name} active={sel === f.id} onClick={() => setSel(f.id)} />)}
        {h && <Chip label="Comercial" active={sel === 'comercial'} onClick={() => setSel('comercial')} />}
      </div>

      {/* KPIs (del embudo elegido) */}
      <section className={styles.kpis}>
        {kpis.map((k) => (
          <div key={k.label} className={styles.kpi}>
            <span className={styles.kpiLabel}>{k.label}</span>
            <span className={styles.kpiValue}>{k.value}</span>
            <span className={styles.kpiSub}>{k.sub}</span>
          </div>
        ))}
      </section>

      {/* TODOS → salud por área. Un embudo → su paso a paso. */}
      {sel === 'todos' && (
        <>
          <h3 className={styles.sectionTitle}>Salud por área</h3>
          <section className={styles.healthGrid}>
            {areas.map((a) => (
              <Link key={a.name} href={a.link} className={`${styles.healthCard} ${a.hh === 'mal' ? styles.bordMal : a.hh === 'atencion' ? styles.bordAtencion : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className={styles.healthTop}>
                  <span className={`${styles.healthDot} ${styles['h_' + a.hh]}`} />
                  <span className={styles.healthArea}>{a.name}</span>
                </div>
                <span className={styles.healthSub}>{a.sub}</span>
                <span className={styles.healthMetric}>{HEALTH_META[a.hh].label} · {a.metric}</span>
              </Link>
            ))}
          </section>
          <div className={styles.linkRow}><Link href="/funnel" className={styles.moreLink}>Ver los {data.funnels.length} embudos en detalle →</Link></div>
        </>
      )}

      {selFunnel && liveSteps.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Paso a paso · {selFunnel.name}</h3>
          <section className={`glass-panel ${styles.card}`}>
            {liveSteps.map((st) => (
              <div key={st.key} className={styles.signalRow}>
                <div>
                  <div className={styles.signalLabel} style={st.isLeak ? { color: '#b4232a', fontWeight: 700 } : undefined}>{st.label}{st.isLeak ? ' · mayor fuga' : ''}</div>
                  {st.stepConversion != null && <div className={styles.signalSub}>{pct(st.stepConversion, 1)} del paso anterior{st.dropCount ? ` · −${fmt(st.dropCount)}` : ''}</div>}
                </div>
                <span className={styles.kpiValue} style={{ fontSize: 18 }}>{fmt(st.value)}</span>
              </div>
            ))}
            <div className={styles.linkRow}><Link href={`/funnel/${selFunnel.id}`} className={styles.moreLink}>Ver el embudo completo →</Link></div>
          </section>
        </>
      )}

      {/* BIEN / MAL (del embudo elegido) */}
      <div className={styles.grid}>
        <section className={`glass-panel ${styles.card}`}>
          <div className={styles.cardHead}><h2 className={styles.cardTitle}>🟢 Yendo bien</h2></div>
          {topWins.length === 0 && <div className={styles.signalSub}>Sin señales de mejora destacadas en {scopeLabel}.</div>}
          {topWins.map((w) => (
            <div key={w.label} className={styles.signalRow}>
              <span className={styles.signalLabel}>{w.label}</span>
              <span className={styles.signalUp}>↑ {pct(w.delta, 0)}</span>
            </div>
          ))}
        </section>
        <section className={`glass-panel ${styles.card}`}>
          <div className={styles.cardHead}><h2 className={styles.cardTitle}>🔴 Yendo mal</h2></div>
          {topProbs.length === 0 && <div className={styles.signalSub}>Nada crítico en {scopeLabel}. 🟢</div>}
          {topProbs.map((p) => (
            <Link key={p.label} href={p.oppId ? `/oportunidades/${p.oppId}` : '/oportunidades'} className={styles.signalRow} style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
              <div>
                <div className={styles.signalLabel}>{p.label}</div>
                {p.sub && <div className={styles.signalSub}>{p.sub}</div>}
              </div>
              <span className={styles.signalDown}>{p.oppId ? '→' : '●'}</span>
            </Link>
          ))}
        </section>
      </div>

      {/* SEÑALES DEL MOTOR (Capa 2) — qué detectó solo sobre la serie diaria (cron / serie bakeada). */}
      {sel === 'todos' && (
        <>
          <h3 className={styles.sectionTitle}>Señales del motor · detección automática</h3>
          <section className={`glass-panel ${styles.card}`}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>⚙️ Qué detectó el motor solo</h2>
              {signalDays > 0 && <span className={styles.count}>{signalDays} días de serie</span>}
            </div>
            {signalDays < 8 ? (
              <div className={styles.signalSub}>
                El motor necesita ≥8 días de serie diaria para separar un quiebre real del ruido del día a día. Lleva {signalDays} {signalDays === 1 ? 'día' : 'días'} — el barrido diario la sigue acumulando.
              </div>
            ) : signals.length === 0 ? (
              <div className={styles.signalSub}>Sin quiebres ni desvíos de meta en los últimos {signalDays} días. 🟢 La serie viene estable.</div>
            ) : (
              signals.map((sig, i) => (
                <div key={i} className={styles.signalRow} style={{ alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16, lineHeight: 1.35, flex: '0 0 auto' }}>{sig.kind === 'quiebre' ? '⚡' : '📉'}</span>
                    <div>
                      <div className={styles.signalLabel} style={{ fontWeight: 700, color: sig.direction === 'up' ? 'var(--success-color)' : 'var(--danger-color)' }}>{sig.headline}</div>
                      <div className={styles.signalSub}>{sig.detail}</div>
                    </div>
                  </div>
                  <span className={styles.recTag} style={{ flex: '0 0 auto' }}>{sig.kind === 'quiebre' ? 'QUIEBRE' : 'RITMO'}</span>
                </div>
              ))
            )}
            <div className={styles.signalSub} style={{ marginTop: 13, fontSize: 11, lineHeight: 1.55, opacity: 0.85 }}>
              Sobre la serie diaria que persiste el barrido del cron. <strong>Quiebre</strong>: el último valor sale de 3σ robustos, desestacionalizando por día de semana. <strong>Ritmo</strong>: el promedio de 7 días viene bajo la meta.
            </div>
          </section>
        </>
      )}

      {/* OPORTUNIDADES (del embudo elegido) */}
      <h3 className={styles.sectionTitle}>Qué hay que mejorar{sel !== 'todos' ? ` · ${scopeLabel}` : ''}</h3>
      {topOpps.length === 0 ? (
        <div className={`glass-panel ${styles.card}`}><div className={styles.signalSub}>Sin oportunidades con plata cuantificada en {scopeLabel}.</div></div>
      ) : (
        <div className={styles.recsGrid}>
          {topOpps.map((r, i) => (
            <Link key={r.id} href={`/oportunidades/${encodeURIComponent(r.id)}`} className={`glass-panel ${styles.rec}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div className={styles.recTop}>
                <span className={styles.oppRank}>#{i + 1}</span>
                {r.funnel && <span className={styles.recFunnel}>· {r.funnel}</span>}
                {!MVP_MODE && r.tri?.marginAtStakeArs != null && <span className={styles.recFunnel} style={{ color: '#1689C4', fontWeight: 700 }}>· {r.tri.marginAtStakeArs >= 1e6 ? `$${(r.tri.marginAtStakeArs / 1e6).toFixed(0)}M` : `$${Math.round(r.tri.marginAtStakeArs / 1e3)}k`}/mes</span>}
                <span className={`${styles.recPrio} ${styles['prio_' + r.priority]}`}>{r.priority}</span>
              </div>
              <div className={styles.recTitle}>{r.title}</div>
              <div className={styles.recDetail}>{r.detail}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#1689C4', fontWeight: 600 }}>Ver la lógica →</div>
            </Link>
          ))}
        </div>
      )}
      <div className={styles.linkRow}>
        <Link href="/oportunidades" className={styles.moreLink}>Ver las {data.recommendations.length} oportunidades →</Link>
      </div>

      {/* EXPERIMENTOS */}
      <section className={`glass-panel ${styles.card}`} style={{ marginTop: 28 }}>
        <div className={styles.cardHead}><h2 className={styles.cardTitle}>Experimentos en curso</h2><span className={styles.count}>{expsEnCurso}</span></div>
        {expsEnCurso === 0 ? (
          <div className={styles.signalSub}>No hay experimentos corriendo. Tomá una oportunidad y convertila en hipótesis para trackearla acá.</div>
        ) : (
          <div className={styles.signalSub}>{expsEnCurso} experimento(s) en vuelo.</div>
        )}
        <div className={styles.linkRow}><Link href="/experimentos" className={styles.moreLink}>Ir a Experimentos →</Link></div>
      </section>
    </div>
  );
}
