"use client";
import React, { useEffect, useState } from 'react';
import styles from '../funnel/funnel.module.css';
import PageSkeleton from '@/components/PageSkeleton';
import type { PipelineFunnel } from '@/lib/hubspot/client';

const fmt = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('es-AR'));
const pct = (n: number | null | undefined, d = 0) => (n == null ? '—' : `${(n * 100).toFixed(d)}%`);

export default function CrmPage() {
  const [data, setData] = useState<PipelineFunnel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => fetch('/api/hubspot/pipeline').then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => {}).finally(() => setLoading(false));
    load();
    const t = setInterval(load, 120000); // refresca cada 2 min (con cache de 5 min server-side)
    return () => clearInterval(t);
  }, []);

  if (loading) return <PageSkeleton />;
  if (!data) return <div className={styles.container}>Error cargando datos.</div>;

  if (data.source === 'error') {
    return (
      <div className={`animate-fade-in ${styles.container}`}>
        <header className={styles.header}>
          <div>
            <h1 className="page-title">CRM · HubSpot</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>El proceso de ventas en vivo.</p>
          </div>
        </header>
        <div className={styles.callout}>
          <span className={styles.calloutMark}>⚠️</span>
          <div>
            <div className={styles.calloutTitle}>No se pudo conectar con HubSpot</div>
            <div className={styles.calloutText}>{data.error}</div>
          </div>
        </div>
      </div>
    );
  }

  const t = data.totals;
  const maxCount = Math.max(...data.stages.map((s) => s.count), 1);

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">CRM · HubSpot</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            El proceso de ventas «{data.pipelineLabel}» en vivo — la parte comercial del flujo.
          </p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeLive}`}>● En vivo · HubSpot</span>
          <span className={styles.badgeMeta}>cache 5 min</span>
        </div>
      </header>

      <section className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Negocios en el proceso</span>
          <span className={styles.kpiValue}>{fmt(t.totalDeals)}</span>
          <span className={styles.kpiSub}>{data.pipelineLabel}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Negocios ganados</span>
          <span className={styles.kpiValue}>{fmt(t.won)}</span>
          <span className={styles.kpiSub}>cápitas cerradas</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Cierre de ventas</span>
          <span className={styles.kpiValue}>{pct(t.winRate, 0)}</span>
          <span className={styles.kpiSub}>ganados / (ganados + perdidos)</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Contactos en CRM</span>
          <span className={styles.kpiValue}>{fmt(t.contacts)}</span>
          <span className={styles.kpiSub}>base total</span>
        </div>
      </section>

      <section className={`glass-panel ${styles.card}`}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Distribución por etapa</h2>
          <span className={styles.count}>negocios actuales</span>
        </div>
        <div className={styles.channels}>
          {data.stages.map((s) => {
            const flag = s.isClosed && s.probability >= 1 ? 'best' : s.isClosed && s.probability <= 0 ? 'junk' : 'normal';
            return (
              <div key={s.id} className={styles.chRow}>
                <div className={styles.chHead}>
                  <span className={styles.chName}>{s.label}</span>
                  <span className={styles.chMeta}>
                    <span className={`${styles.chConv} ${flag === 'junk' ? styles.chConvJunk : flag === 'best' ? styles.chConvBest : ''}`}>{fmt(s.count)}</span> negocios
                  </span>
                </div>
                <div className={styles.chTrack}>
                  <div
                    className={`${styles.chFill} ${flag === 'junk' ? styles.chFillJunk : flag === 'best' ? styles.chFillBest : ''}`}
                    style={{ width: `${Math.max((s.count / maxCount) * 100, 1.5)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className={styles.footnote}>
        Datos en vivo de HubSpot (solo lectura). Es la <strong>distribución actual</strong> de negocios por etapa, no una conversión secuencial.
        Próximo paso: cruzar estos negocios con el embudo del cotizador (Mixpanel) vía <code>prospecto_id</code> para cerrar el loop visita→socio.
      </p>
    </div>
  );
}
