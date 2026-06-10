"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './funnel/funnel.module.css';
import PageSkeleton from '@/components/PageSkeleton';
import type { Analytics } from '@/lib/mixpanel/analytics';
import type { Recommendation } from '@/lib/mixpanel/recommendations';
import { PLAYBOOK_RULES, STATUS_META } from '@/lib/mixpanel/playbook';
import { rollup, health, WINRATE_TARGET, HEALTH_META, type Health } from '@/lib/mixpanel/benchmarks';

type Resp = Analytics & { recommendations: Recommendation[] };

const fmt = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('es-AR'));
const pct = (n: number | null | undefined, d = 0) => (n == null ? '—' : `${(n * 100).toFixed(d)}%`);

export default function Resumen() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [expsEnCurso, setExpsEnCurso] = useState(0);

  useEffect(() => {
    const load = () => fetch('/api/mixpanel/analytics').then((r) => r.json()).then(setData).finally(() => setLoading(false));
    load();
    const id = setInterval(load, 60000);
    try {
      const raw = localStorage.getItem('gb_experiments');
      if (raw) setExpsEnCurso(JSON.parse(raw).filter((e: { estado: string }) => e.estado === 'en_curso').length);
    } catch { /* noop */ }
    return () => clearInterval(id);
  }, []);

  if (loading) return <PageSkeleton />;
  if (!data) return <div className={styles.container}>Error cargando datos.</div>;

  const s = data.summary;

  // Yendo bien — señales que mejoran (WoW > +10%)
  const wins: { label: string; delta: number }[] = [];
  data.funnels.forEach((f) => (f.wow || []).forEach((w) => {
    if (w.deltaPct > 0.1) wins.push({ label: `${f.name} · ${w.label}`, delta: w.deltaPct });
  }));
  wins.sort((a, b) => b.delta - a.delta);
  const topWins = wins.slice(0, 5);

  // Yendo mal — fugas, canal basura, baja conversión. oppId = la oportunidad a la que drillear.
  const probs: { label: string; sub: string; sev: number; oppId?: string }[] = [];
  const cot = data.funnels.find((f) => f.id === 'cotizador');
  const junk = cot?.channels?.find((c) => c.flag === 'junk');
  if (junk) probs.push({ label: `Canal "${junk.source}" convierte ~0%`, sub: `${pct(junk.sharePct)} del tráfico, desperdiciado`, sev: 0.95, oppId: 'channel-junk' });
  data.funnels.forEach((f) => {
    if (f.leakDropPct != null && f.leakDropPct >= 0.5) probs.push({ label: `${f.name}: fuga ${pct(f.leakDropPct)}`, sub: f.leakTransition ?? '', sev: f.leakDropPct, oppId: f.id === 'cotizador' ? 'imp-cot-design' : undefined });
  });
  data.funnels.forEach((f) => {
    if (f.overallConversion != null && f.overallConversion < 0.12) probs.push({ label: `${f.name} convierte ${pct(f.overallConversion, f.overallConversion < 0.1 ? 1 : 0)}`, sub: 'conversión total baja', sev: 0.82 });
  });
  const seen = new Set<string>();
  const topProbs = probs.sort((a, b) => b.sev - a.sev).filter((p) => (seen.has(p.label) ? false : (seen.add(p.label), true))).slice(0, 5);

  const topOpps = data.recommendations.slice(0, 4);
  const topLearnings = PLAYBOOK_RULES.slice(0, 3);

  const byId = (id: string) => data.funnels.find((f) => f.id === id);
  const areas: { name: string; sub: string; h: Health; metric: string; link: string }[] = [
    { name: 'Adquisición', sub: 'Cotizador', h: byId('cotizador')?.health ?? 'atencion', metric: `Conv. ${pct(byId('cotizador')?.overallConversion, 1)} · meta ${pct(byId('cotizador')?.target, 0)}`, link: '/funnel/cotizador' },
    { name: 'Alta online', sub: 'WhatsApp + Portal', h: rollup(['wa-individual', 'wa-familiar', 'portal-express'].map((id) => byId(id)?.health ?? 'atencion')), metric: '3 funnels', link: '/funnel/wa-individual' },
    { name: 'Leads', sub: 'Contacto + Empresa', h: rollup(['contacto', 'empresa'].map((id) => byId(id)?.health ?? 'atencion')), metric: '2 funnels', link: '/funnel/contacto' },
    { name: 'Comercial', sub: 'HubSpot', h: data.hubspot ? health(data.hubspot.winRate, WINRATE_TARGET) : 'atencion', metric: `Win ${pct(data.hubspot?.winRate, 0)} · meta ${pct(WINRATE_TARGET, 0)}`, link: '/crm' },
  ];

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Resumen</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Cómo viene Medicus — qué está bien, qué está mal, y qué hacer al respecto.
          </p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${data.source === 'live' ? styles.badgeLive : styles.badgeSnap}`}>
            {data.source === 'live' ? '● En vivo' : `Snapshot · ${data.meta.asOf}`}
          </span>
          <span className={styles.badgeMeta}>Últimos {data.meta.rangeDays}d</span>
        </div>
      </header>

      {/* NORTE */}
      <section className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Entradas a embudos</span>
          <span className={styles.kpiValue}>{fmt(s.totalEntradas)}</span>
          <span className={styles.kpiSub}>{data.funnels.length} funnels</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Altas completadas</span>
          <span className={styles.kpiValue}>{fmt(s.asociados)}</span>
          <span className={styles.kpiSub}>WhatsApp (ind + fam)</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Win rate comercial</span>
          <span className={styles.kpiValue}>{pct(data.hubspot?.winRate, 0)}</span>
          <span className={styles.kpiSub}>HubSpot · {fmt(data.hubspot?.won)} ganados</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Conversión cotizador</span>
          <span className={styles.kpiValue}>{pct(s.cotizadorConversion, 1)}</span>
          <span className={styles.kpiSub}>visita → fin</span>
        </div>
      </section>

      {/* SALUD POR ÁREA */}
      <h3 className={styles.sectionTitle}>Salud por área</h3>
      <section className={styles.healthGrid}>
        {areas.map((a) => (
          <Link key={a.name} href={a.link} className={`${styles.healthCard} ${a.h === 'mal' ? styles.bordMal : a.h === 'atencion' ? styles.bordAtencion : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className={styles.healthTop}>
              <span className={`${styles.healthDot} ${styles['h_' + a.h]}`} />
              <span className={styles.healthArea}>{a.name}</span>
            </div>
            <span className={styles.healthSub}>{a.sub}</span>
            <span className={styles.healthMetric}>{HEALTH_META[a.h].label} · {a.metric}</span>
          </Link>
        ))}
      </section>

      {/* BIEN / MAL */}
      <div className={styles.grid}>
        <section className={`glass-panel ${styles.card}`}>
          <div className={styles.cardHead}><h2 className={styles.cardTitle}>🟢 Yendo bien</h2></div>
          {topWins.length === 0 && <div className={styles.signalSub}>Sin señales de mejora destacadas este período.</div>}
          {topWins.map((w) => (
            <div key={w.label} className={styles.signalRow}>
              <span className={styles.signalLabel}>{w.label}</span>
              <span className={styles.signalUp}>↑ {pct(w.delta, 0)}</span>
            </div>
          ))}
        </section>
        <section className={`glass-panel ${styles.card}`}>
          <div className={styles.cardHead}><h2 className={styles.cardTitle}>🔴 Yendo mal</h2></div>
          {topProbs.map((p) => (
            <Link key={p.label} href={p.oppId ? `/oportunidades/${p.oppId}` : '/oportunidades'} className={styles.signalRow} style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
              <div>
                <div className={styles.signalLabel}>{p.label}</div>
                {p.sub && <div className={styles.signalSub}>{p.sub}</div>}
              </div>
              <span className={styles.signalDown} title={p.oppId ? 'Ir a la oportunidad' : 'Ver oportunidades'}>{p.oppId ? '→' : '●'}</span>
            </Link>
          ))}
        </section>
      </div>

      {/* OPORTUNIDADES */}
      <h3 className={styles.sectionTitle}>Qué hay que mejorar</h3>
      <div className={styles.recsGrid}>
        {topOpps.map((r, i) => (
          <Link key={r.id} href={`/oportunidades/${encodeURIComponent(r.id)}`} className={`glass-panel ${styles.rec}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className={styles.recTop}>
              <span className={styles.oppRank}>#{i + 1}</span>
              {r.funnel && <span className={styles.recFunnel}>· {r.funnel}</span>}
              {r.tri?.marginAtStakeArs != null && <span className={styles.recFunnel} style={{ color: '#1689C4', fontWeight: 700 }}>· {r.tri.marginAtStakeArs >= 1e6 ? `$${(r.tri.marginAtStakeArs / 1e6).toFixed(0)}M` : `$${Math.round(r.tri.marginAtStakeArs / 1e3)}k`}{r.tri.cadence === 'acumulado' ? ' acum' : '/mes'}</span>}
              <span className={`${styles.recPrio} ${styles['prio_' + r.priority]}`}>{r.priority}</span>
            </div>
            <div className={styles.recTitle}>{r.title}</div>
            <div className={styles.recDetail}>{r.detail}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#1689C4', fontWeight: 600 }}>Ver la lógica →</div>
          </Link>
        ))}
      </div>
      <div className={styles.linkRow}>
        <Link href="/oportunidades" className={styles.moreLink}>Ver las {data.recommendations.length} oportunidades →</Link>
      </div>

      {/* EXPERIMENTOS + APRENDIZAJES */}
      <div className={styles.grid} style={{ marginTop: 28 }}>
        <section className={`glass-panel ${styles.card}`}>
          <div className={styles.cardHead}><h2 className={styles.cardTitle}>Experimentos en curso</h2><span className={styles.count}>{expsEnCurso}</span></div>
          {expsEnCurso === 0 ? (
            <div className={styles.signalSub}>
              No hay experimentos corriendo. Tomá una oportunidad y convertila en hipótesis.
            </div>
          ) : (
            <div className={styles.signalSub}>{expsEnCurso} experimento(s) en vuelo.</div>
          )}
          <div className={styles.linkRow}><Link href="/experimentos" className={styles.moreLink}>Ir a Experimentos →</Link></div>
        </section>
        <section className={`glass-panel ${styles.card}`}>
          <div className={styles.cardHead}><h2 className={styles.cardTitle}>Últimos aprendizajes</h2></div>
          {topLearnings.map((r) => (
            <div key={r.id} className={styles.signalRow}>
              <span className={styles.signalLabel}>{STATUS_META[r.status].emoji} {r.statement}</span>
            </div>
          ))}
          <div className={styles.linkRow}><Link href="/playbook" className={styles.moreLink}>Ver el Playbook →</Link></div>
        </section>
      </div>
    </div>
  );
}
