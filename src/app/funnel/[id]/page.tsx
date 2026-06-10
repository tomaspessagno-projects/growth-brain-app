"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from '../funnel.module.css';
import PageSkeleton from '@/components/PageSkeleton';
import type { Analytics } from '@/lib/mixpanel/analytics';

const fmt = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('es-AR'));
const pct = (n: number | null | undefined, d = 0) => (n == null ? '—' : `${(n * 100).toFixed(d)}%`);

export default function FunnelDetail() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => fetch('/api/mixpanel/analytics').then((r) => r.json()).then(setData).finally(() => setLoading(false));
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <PageSkeleton />;
  if (!data) return <div className={styles.container}>Error cargando datos.</div>;

  const f = data.funnels.find((x) => x.id === id);
  if (!f) return <div className={styles.container}>Funnel “{id}” no encontrado. <Link href="/explorador" className={styles.moreLink}>Volver al Explorador</Link></div>;

  const maxCh = f.channels && f.channels.length ? Math.max(...f.channels.map((c) => c.visits)) : 0;
  const convDecimals = f.overallConversion != null && f.overallConversion < 0.1 ? 2 : 0;

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <Link href="/explorador" className={styles.moreLink} style={{ display: 'inline-block', marginBottom: 8 }}>← Explorador</Link>
          <h1 className="page-title">{f.name}</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>{f.description}</p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeSnap}`}>Snapshot · {data.meta.asOf}</span>
          <span className={styles.badgeMeta}>Últimos {data.meta.rangeDays}d · usuarios únicos</span>
        </div>
      </header>

      <section className={`${styles.kpis} ${styles.kpis3}`}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Tope del embudo</span>
          <span className={styles.kpiValue}>{fmt(f.top)}</span>
          <span className={styles.kpiSub}>{f.steps[0]?.label}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Conversión total</span>
          <span className={styles.kpiValue}>{pct(f.overallConversion, convDecimals)}</span>
          <span className={styles.kpiSub}>inicio → fin</span>
        </div>
        <div className={`${styles.kpi} ${styles.kpiLeak}`}>
          <span className={styles.kpiLabel}>Mayor fuga</span>
          <span className={styles.kpiValue}>{pct(f.leakDropPct, 0)}</span>
          <span className={styles.kpiSub}>{f.leakTransition} · −{fmt(f.leakDropCount)}</span>
        </div>
      </section>

      {f.opportunity && (
        <div className={styles.callout}>
          <span className={styles.calloutMark}>🔴</span>
          <div>
            <div className={styles.calloutTitle}>Oportunidad: el canal “{f.opportunity.channel}” está tirando la conversión</div>
            <div className={styles.calloutText}>
              Trae {fmt(f.opportunity.visits)} visitas ({pct(f.opportunity.sharePct)} del tráfico) y convierte ~0% a datos.
              Si rindiera al {pct(f.opportunity.avgConv)} promedio → <strong>≈ +{fmt(f.opportunity.extraDatos)} datos/mes</strong>.
            </div>
          </div>
        </div>
      )}

      <div className={f.channels ? styles.grid : ''}>
        <section className={`glass-panel ${styles.card}`}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Embudo paso a paso</h2>
            {f.dataQuality === 'inconsistente' && <span className={`${styles.pill} ${styles.pillQuality}`}>datos inconsistentes</span>}
          </div>
          <div className={styles.funnel}>
            {f.steps.map((s, i) => (
              <div key={s.key} className={`${styles.step} ${s.isLeak ? styles.stepLeak : ''} ${s.status === 'pending' ? styles.stepPending : ''} ${s.status === 'handoff' ? styles.stepHandoff : ''}`}>
                <div className={styles.stepInfo}>
                  <span className={styles.stepIndex}>{i + 1}</span>
                  <span className={styles.stepLabel}>{s.label}</span>
                  <span className={styles.stepEvent}>{s.event ?? 'sin evento'}</span>
                </div>
                {s.status === 'live' ? (
                  <div className={styles.stepBarWrap}>
                    <div className={styles.stepBarTrack}><div className={styles.stepBarFill} style={{ width: `${s.widthPct}%` }} /></div>
                    <div className={styles.stepNums}>
                      <span className={styles.stepValue}>{fmt(s.value)}</span>
                      {s.stepConversion != null && (
                        <span className={styles.stepConv}>{pct(s.stepConversion, 1)}{s.isLeak ? ` · −${fmt(s.dropCount)}` : ''}</span>
                      )}
                    </div>
                  </div>
                ) : s.status === 'handoff' ? (
                  <div className={styles.handoffBox}>
                    <span className={styles.handoffTag}>↪ Handoff · se mide en otro funnel</span>
                    {s.note && <span className={styles.handoffNote}>{s.note}</span>}
                  </div>
                ) : (
                  <div className={styles.pendingBox}>
                    <span className={styles.pendingTag}>⏳ A instrumentar</span>
                    {s.note && <span className={styles.pendingNote}>{s.note}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {f.channels && (
          <section className={`glass-panel ${styles.card}`}>
            <div className={styles.cardHead}><h2 className={styles.cardTitle}>Fuga por canal</h2><span className={styles.count}>visita → datos</span></div>
            <div className={styles.healthSub} style={{ marginTop: -8, marginBottom: 12 }}>
              Inversión ${(data.marketing.totalSpendArs / 1e6).toFixed(0)}M/mes · CAC blended ${fmt(data.marketing.blendedCacArs)} · {data.marketing.period}
            </div>
            <div className={styles.channels}>
              {f.channels.map((c) => (
                <div key={c.source} className={styles.chRow}>
                  <div className={styles.chHead}>
                    <span className={styles.chName}>{c.source}</span>
                    <span className={styles.chMeta}>
                      {fmt(c.visits)} vis · <span className={`${styles.chConv} ${c.flag === 'junk' ? styles.chConvJunk : c.flag === 'best' ? styles.chConvBest : ''}`}>{pct(c.conv)}</span>{c.spendArs ? ` · $${(c.spendArs / 1e6).toFixed(0)}M${c.excluded ? ' ⚠️' : ''}` : ''}
                    </span>
                  </div>
                  <div className={styles.chTrack}>
                    <div className={`${styles.chFill} ${c.flag === 'junk' ? styles.chFillJunk : c.flag === 'best' ? styles.chFillBest : ''}`} style={{ width: `${Math.max((c.visits / maxCh) * 100, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {f.wow.length > 0 && (
      <>
      <h3 className={styles.sectionTitle}>Tendencia vs. período previo ({data.meta.prevRange})</h3>
      <section className={`glass-panel ${styles.card}`}>
        <div className={styles.wowGrid} style={{ gridTemplateColumns: `repeat(${Math.min(f.wow.length, 5)}, 1fr)` }}>
          {f.wow.map((w) => {
            const dir = w.deltaPct > 0.01 ? styles.up : w.deltaPct < -0.01 ? styles.down : styles.flat;
            const arrow = w.deltaPct > 0.01 ? '↑' : w.deltaPct < -0.01 ? '↓' : '→';
            return (
              <div key={w.key} className={styles.wowItem}>
                <span className={styles.wowLabel}>{w.label}</span>
                <span className={styles.wowValue}>{fmt(w.current)}</span>
                <span className={`${styles.wowDelta} ${dir}`}>{arrow} {pct(Math.abs(w.deltaPct), 0)}</span>
              </div>
            );
          })}
        </div>
      </section>
      </>
      )}

      {f.valueEstimateArs != null && (
        <>
          <h3 className={styles.sectionTitle}>Valor</h3>
          <div className={styles.valueRow}>
            <section className={`glass-panel ${styles.card}`}>
              <span className={styles.kpiLabel}>Asociaciones / mes (estimado)</span>
              <div className={styles.valueNum}>${fmt(f.valueEstimateArs)}</div>
              <div className={styles.valueNote}>{fmt(data.summary.asociados)} asociados × ARPU estimado. Ajustá el ARPU con el dato real (plan_precio) en config.</div>
            </section>
          </div>
        </>
      )}

      <div className={styles.linkRow}>
        <Link href="/oportunidades" className={styles.moreLink}>Ver oportunidades →</Link>
      </div>
    </div>
  );
}
