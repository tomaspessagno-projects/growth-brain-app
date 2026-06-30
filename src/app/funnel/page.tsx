"use client";
import React from 'react';
import Link from 'next/link';
import styles from './funnel.module.css';
import PageSkeleton from '@/components/PageSkeleton';
import { HEALTH_META, type Health } from '@/lib/mixpanel/benchmarks';
import { useAnalytics } from '@/components/AnalyticsProvider';

const fmt = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('es-AR'));
const pct = (n: number | null | undefined, d = 0) => (n == null ? '—' : `${(n * 100).toFixed(d)}%`);

// Índice de Embudos: ver todos los funnels de un vistazo (salud, conversión, mayor fuga) y entrar al detalle.
export default function EmbudosIndex() {
  const { data, loading } = useAnalytics();
  if (loading) return <PageSkeleton />;
  if (!data) return <div className={styles.container}>Error cargando datos. Reintentá en un momento.</div>;

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Embudos</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Cada embudo de un vistazo — conversión, salud y dónde está la mayor fuga. Entrá a uno para el paso a paso.
          </p>
        </div>
      </header>

      <div className={styles.recsGrid}>
        {data.funnels.map((f) => {
          const h: Health = f.health ?? 'atencion';
          return (
            <Link key={f.id} href={`/funnel/${f.id}`} className={`glass-panel ${styles.rec}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div className={styles.recTop}>
                <span className={`${styles.healthDot} ${styles['h_' + h]}`} />
                <span className={styles.recTitle} style={{ margin: 0 }}>{f.name}</span>
                <span className={styles.recOwner} style={{ marginLeft: 'auto' }}>{f.category}</span>
              </div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#8696a7' }}>Conversión total</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>{pct(f.overallConversion, 1)}</div>
                  <div style={{ fontSize: 11, color: '#8696a7' }}>{f.target != null ? `meta ${pct(f.target, 0)} · ${HEALTH_META[h].label}` : HEALTH_META[h].label}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#8696a7' }}>Volumen</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>{fmt(f.top)}</div>
                  <div style={{ fontSize: 11, color: '#8696a7' }}>entradas → {fmt(f.bottom)} fin</div>
                </div>
                {f.leakDropPct != null && (
                  <div>
                    <div style={{ fontSize: 11, color: '#8696a7' }}>Mayor fuga</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#b4232a', fontFamily: 'Satoshi, sans-serif' }}>−{pct(f.leakDropPct, 0)}</div>
                    <div style={{ fontSize: 11, color: '#8696a7' }}>{f.leakTransition ?? ''}</div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#1689C4', fontWeight: 600 }}>Ver el paso a paso →</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
