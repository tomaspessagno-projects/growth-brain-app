"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../funnel/funnel.module.css';
import PageSkeleton from '@/components/PageSkeleton';
import type { LoopDiag } from '@/lib/loop/attribution';

const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');

export default function LoopPage() {
  const [data, setData] = useState<LoopDiag | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/loop').then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;
  if (!data || data.source === 'error') {
    return (
      <div className={styles.container}>
        <Link href="/explorador" className={styles.recFunnel}>← Explorador</Link>
        <div className={styles.emptyState} style={{ marginTop: 20 }}>No pude leer el cruce ahora{data?.error ? ` (${data.error})` : ''}. Es solo lectura — reintentá en un rato (rate limit de Mixpanel).</div>
      </div>
    );
  }

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <Link href="/explorador" className={styles.recFunnel} style={{ display: 'inline-block', marginBottom: 12 }}>← Explorador</Link>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">El cruce visita→cápita · estado</h1>
          <p className="page-subtitle" style={{ marginBottom: 0, maxWidth: 680 }}>
            Investigamos si se puede cerrar el loop (atribuir qué lead se vuelve socio). Te lo contamos honesto: <b>qué encontramos y qué falta</b>.
          </p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeSnap}`}>Solo lectura · {data.asOf}</span>
        </div>
      </header>

      {/* Veredicto */}
      <div className="glass-panel" style={{ marginTop: 14, padding: '16px 18px', borderLeft: `4px solid ${data.measurable ? '#15803d' : '#C25B45'}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: data.measurable ? '#15803d' : '#b91c1c', marginBottom: 6 }}>
          {data.measurable ? '✅ El loop es medible' : '⛔ El loop NO es medible todavía — y sabemos exactamente por qué'}
        </div>
        <div style={{ fontSize: 13, color: '#3a4a5c', lineHeight: 1.55 }}>{data.blocker}</div>
      </div>

      {/* Números del cruce */}
      <h3 className={styles.sectionTitle}>Lo que dice la data (Mixpanel, en vivo)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { n: data.identified, l: 'Leads identificados', s: 'con hubspot_id' },
          { n: data.socios, l: 'Socios', s: 'con vigencia (cápita)' },
          { n: data.overlap, l: 'Comparten identidad', s: 'lead Y socio', hero: true },
          { n: data.prospectoId, l: 'Con prospecto_id', s: 'la llave más amplia' },
        ].map((k) => (
          <div key={k.l} className="glass-panel" style={{ padding: '14px 16px', ...(k.hero ? { border: '1px solid rgba(194,91,69,0.4)', background: 'rgba(194,91,69,0.05)' } : {}) }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.hero ? '#C25B45' : '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>{fmt(k.n)}</div>
            <div style={{ fontSize: 12, color: '#3a4a5c', fontWeight: 600, marginTop: 2 }}>{k.l}</div>
            <div style={{ fontSize: 11, color: '#8696a7' }}>{k.s}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#9a6a00', marginTop: 8 }}>
        ⚠ <b>{fmt(data.overlap)}</b> perfiles son lead Y socio a la vez: los silos no se tocan. Por eso una tasa lead→cápita dentro de Mixpanel mediría personas distintas — sería mentira.
      </div>

      {/* Lo que sí vemos */}
      <h3 className={styles.sectionTitle}>Lo que SÍ funciona</h3>
      <div className="glass-panel" style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d', marginBottom: 8 }}>La llave de cruce resuelve: ~{data.joinMatchRatePct}% de los leads identificados matchean un contacto real de HubSpot.</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#3a4a5c', lineHeight: 1.7 }}>
          {data.whatWeSee.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </div>

      {/* Qué falta arreglar */}
      <h3 className={styles.sectionTitle}>Qué falta para cerrarlo</h3>
      <div className="glass-panel" style={{ padding: 16 }}>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#3a4a5c', lineHeight: 1.7 }}>
          {data.whatToFix.map((w, i) => <li key={i} style={{ marginBottom: 4 }}>{w}</li>)}
        </ol>
      </div>

      {/* Honestidad sobre el supuesto */}
      <div style={{ marginTop: 18, fontSize: 12, color: '#8696a7', lineHeight: 1.6, padding: '12px 14px', background: 'rgba(154,106,0,0.06)', borderRadius: 8 }}>
        ℹ️ Consecuencia honesta: como el loop no se puede medir, el <b>dato→cápita {Math.round(data.assumedRate * 100)}%</b> que usa el score de Oportunidades sigue siendo un <b>SUPUESTO</b>, no un dato validado. No lo damos por confirmado. Apenas se cablee el cruce, ese número se vuelve real y el ripple-a-cápita de los experimentos pasa de modelado a medido.
      </div>
    </div>
  );
}
