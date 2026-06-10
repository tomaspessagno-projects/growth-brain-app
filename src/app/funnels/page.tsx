"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../funnel/funnel.module.css';
import PageSkeleton from '@/components/PageSkeleton';
import type { Analytics, ComputedFunnel } from '@/lib/mixpanel/analytics';

const fmt = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('es-AR'));
const pct = (n: number | null | undefined, d = 0) => (n == null ? '—' : `${(n * 100).toFixed(d)}%`);

function FunnelCard({ f }: { f: ComputedFunnel }) {
  return (
    <section className={`glass-panel ${styles.fcard}`}>
      <div className={styles.fcardHead}>
        <div>
          <div className={styles.fcName}>{f.name}</div>
          <div className={styles.fcDesc}>{f.description}</div>
        </div>
        <span className={styles.fcCat}>{f.category}</span>
      </div>

      <div className={styles.mini}>
        {f.steps.map((s) => (
          <div key={s.key} className={styles.miniRow}>
            <span className={styles.miniLabel} title={s.label}>{s.label}</span>
            {s.status === 'live' ? (
              <>
                <div className={styles.miniTrack}>
                  <div className={`${styles.miniFill} ${s.isLeak ? styles.miniLeak : ''}`} style={{ width: `${s.widthPct}%` }} />
                </div>
                <div className={styles.miniNums}>
                  <span className={styles.miniVal}>{fmt(s.value)}</span>
                  {s.stepConversion != null && <span className={styles.miniConv}>{pct(s.stepConversion)}</span>}
                </div>
              </>
            ) : (
              <>
                <div className={styles.miniTrack} />
                <div className={styles.miniNums}><span className={styles.miniPending}>pendiente</span></div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className={styles.fcFooter}>
        <span className={`${styles.pill} ${styles.pillConv}`}>Conv. {pct(f.overallConversion, f.overallConversion != null && f.overallConversion < 0.1 ? 2 : 0)}</span>
        {f.leakDropPct != null && <span className={`${styles.pill} ${styles.pillLeak}`}>Fuga {pct(f.leakDropPct, 0)}</span>}
        {f.dataQuality === 'inconsistente' && <span className={`${styles.pill} ${styles.pillQuality}`}>datos inconsistentes</span>}
        <Link href={`/funnel/${f.id}`} className={styles.fcLink}>Deep dive →</Link>
      </div>
    </section>
  );
}

export default function FunnelsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => fetch('/api/mixpanel/analytics').then((r) => r.json()).then(setData).finally(() => setLoading(false));
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <PageSkeleton />;
  if (!data) return <div className={styles.container}>Error cargando datos.</div>;

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Funnels</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Todos los embudos vivos del proyecto · {data.funnels.length} funnels.</p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeSnap}`}>Snapshot · {data.meta.asOf}</span>
          <span className={styles.badgeMeta}>Últimos {data.meta.rangeDays}d · usuarios únicos</span>
        </div>
      </header>

      <div className={styles.funnelCards}>
        {data.funnels.map((f) => <FunnelCard key={f.id} f={f} />)}
      </div>
    </div>
  );
}
