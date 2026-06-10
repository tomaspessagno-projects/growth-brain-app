"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../funnel/funnel.module.css';
import PageSkeleton from '@/components/PageSkeleton';
import type { Analytics } from '@/lib/mixpanel/analytics';

const fmt = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('es-AR'));
const pct = (n: number | null | undefined, d = 0) => (n == null ? '—' : `${(n * 100).toFixed(d)}%`);
const fmtArsM = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : `$${Math.round(n).toLocaleString('es-AR')}`);

export default function ExploradorPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mixpanel/analytics').then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;
  if (!data) return <div className={styles.container}>Error cargando datos.</div>;

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Explorador</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Los datos crudos para drillear: funnels (Mixpanel) y pipeline comercial (HubSpot). El soporte, no el foco.
          </p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeSnap}`}>Snapshot · {data.meta.asOf}</span>
        </div>
      </header>

      <h3 className={styles.sectionTitle}>Audiencia</h3>
      <div className={styles.funnelCards}>
        <Link href="/segmentos" className={`glass-panel ${styles.fcard}`}>
          <div className={styles.fcardHead}>
            <div>
              <div className={styles.fcName}>Segmentos · a quién apuntamos</div>
              <div className={styles.fcDesc}>Edad, composición, canal y NPS sobre datos reales (HubSpot + Mixpanel).</div>
            </div>
            <span className={styles.fcCat}>Audiencia</span>
          </div>
          <div className={styles.fcFooter} style={{ borderTop: 'none', paddingTop: 0 }}>
            <span className={`${styles.pill} ${styles.pillConv}`}>250k con edad</span>
            <span className={`${styles.pill} ${styles.pillConv}`}>NPS ~48</span>
            <span className={styles.fcLink}>Abrir →</span>
          </div>
        </Link>
        <Link href="/loop" className={`glass-panel ${styles.fcard}`}>
          <div className={styles.fcardHead}>
            <div>
              <div className={styles.fcName}>El cruce visita→cápita</div>
              <div className={styles.fcDesc}>¿Se puede atribuir qué lead se vuelve socio? Estado real del loop.</div>
            </div>
            <span className={styles.fcCat}>Loop</span>
          </div>
          <div className={styles.fcFooter} style={{ borderTop: 'none', paddingTop: 0 }}>
            <span className={`${styles.pill} ${styles.pillLeak}`}>Bloqueado: identidad fragmentada</span>
            <span className={styles.fcLink}>Abrir →</span>
          </div>
        </Link>
      </div>

      <h3 className={styles.sectionTitle}>Funnels (Mixpanel)</h3>
      <div className={styles.funnelCards}>
        {data.funnels.map((f) => (
          <Link key={f.id} href={`/funnel/${f.id}`} className={`glass-panel ${styles.fcard}`}>
            <div className={styles.fcardHead}>
              <div>
                <div className={styles.fcName}>{f.name}</div>
                <div className={styles.fcDesc}>{f.description}</div>
              </div>
              <span className={styles.fcCat}>{f.category}</span>
            </div>
            <div className={styles.fcFooter} style={{ borderTop: 'none', paddingTop: 0 }}>
              <span className={`${styles.pill} ${styles.pillConv}`}>Conv. {pct(f.overallConversion, f.overallConversion != null && f.overallConversion < 0.1 ? 1 : 0)}</span>
              {f.leakDropPct != null && <span className={`${styles.pill} ${styles.pillLeak}`}>Fuga {pct(f.leakDropPct, 0)}</span>}
              <span className={styles.fcLink}>Abrir →</span>
            </div>
          </Link>
        ))}
      </div>

      <h3 className={styles.sectionTitle}>Unit economics (PELG)</h3>
      <div className={styles.funnelCards}>
        <Link href="/economia" className={`glass-panel ${styles.fcard}`}>
          <div className={styles.fcardHead}>
            <div>
              <div className={styles.fcName}>Economía mes a mes</div>
              <div className={styles.fcDesc}>CAC, inversión y mix de canales. Cargá el PELG de cada mes y ve la tendencia.</div>
            </div>
            <span className={styles.fcCat}>PELG</span>
          </div>
          <div className={styles.fcFooter} style={{ borderTop: 'none', paddingTop: 0 }}>
            <span className={`${styles.pill} ${styles.pillConv}`}>CAC {fmt(data.marketing.blendedCacArs)}</span>
            <span className={`${styles.pill} ${styles.pillConv}`}>{fmtArsM(data.marketing.totalSpendArs)}/mes</span>
            <span className={styles.fcLink}>Abrir →</span>
          </div>
        </Link>
      </div>

      <h3 className={styles.sectionTitle}>Comercial (HubSpot)</h3>
      <div className={styles.funnelCards}>
        <Link href="/crm" className={`glass-panel ${styles.fcard}`}>
          <div className={styles.fcardHead}>
            <div>
              <div className={styles.fcName}>Pipeline de ventas</div>
              <div className={styles.fcDesc}>Deals del pipeline Retail en vivo.</div>
            </div>
            <span className={styles.fcCat}>CRM</span>
          </div>
          <div className={styles.fcFooter} style={{ borderTop: 'none', paddingTop: 0 }}>
            {data.hubspot && (
              <>
                <span className={`${styles.pill} ${styles.pillConv}`}>{fmt(data.hubspot.totalDeals)} deals</span>
                <span className={`${styles.pill} ${styles.pillConv}`}>Win {pct(data.hubspot.winRate, 0)}</span>
              </>
            )}
            <span className={styles.fcLink}>Abrir →</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
