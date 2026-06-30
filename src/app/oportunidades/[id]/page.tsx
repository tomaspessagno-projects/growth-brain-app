"use client";
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from '../../funnel/funnel.module.css';
import PageSkeleton from '@/components/PageSkeleton';
import type { SrcTag } from '@/lib/triangulation/score';
import { ECON_ASSUMPTIONS } from '@/lib/economics/model';
import { useAnalytics } from '@/components/AnalyticsProvider';
import ScenarioPanel from '@/components/ScenarioPanel';
import { MVP_MODE } from '@/lib/mvp';

const DISC_LABEL: Record<string, string> = { diseno: 'Diseño', producto: 'Producto', desarrollo: 'Desarrollo', datos: 'Datos' };

const SRC_COLOR: Record<SrcTag, string> = {
  Mixpanel: '#7b3fe4', HubSpot: '#ff7a59', PELG: '#1689C4', Supuesto: '#9a6a00', Playbook: '#15803d',
};
function fmtArsShort(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)} mil M`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${Math.round(n)}`;
}
function SrcTagChip({ src }: { src: SrcTag }) {
  return <span style={{ fontSize: 10, fontWeight: 700, color: SRC_COLOR[src], background: '#fff', border: `1px solid ${SRC_COLOR[src]}33`, borderRadius: 5, padding: '1px 6px' }}>{src}</span>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#8696a7', marginBottom: 8 }}>{title}</div>
      {children}
    </section>
  );
}

export default function OportunidadDetallePage() {
  const params = useParams();
  const id = decodeURIComponent(String(params.id));
  const { data, loading } = useAnalytics();

  if (loading) return <PageSkeleton />;
  const rec = data?.recommendations.find((r) => r.id === id);
  if (!rec) {
    return (
      <div className={styles.container}>
        <Link href="/oportunidades" className={styles.recFunnel}>← Oportunidades</Link>
        <div className={styles.emptyState} style={{ marginTop: 20 }}>No encontré esa oportunidad. Puede que el ranking haya cambiado con los datos nuevos.</div>
      </div>
    );
  }
  const tri = rec.tri;
  const moneyRec = tri?.marginAtStakeArs != null;

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <Link href="/oportunidades" className={styles.recFunnel} style={{ display: 'inline-block', marginBottom: 14 }}>← Volver a Oportunidades</Link>

      <header className={styles.header} style={{ alignItems: 'flex-start' }}>
        <div>
          <div className={styles.recTop} style={{ marginBottom: 8 }}>
            <span className={`${styles.disc} ${styles['disc_' + rec.discipline]}`}>{DISC_LABEL[rec.discipline]}</span>
            {rec.funnel && <span className={styles.recFunnel}>· {rec.funnel}</span>}
            <span className={`${styles.recPrio} ${styles['prio_' + rec.priority]}`}>{rec.priority}</span>
          </div>
          <h1 className="page-title" style={{ marginBottom: 6 }}>{rec.title}</h1>
          <p className="page-subtitle" style={{ marginBottom: 0, maxWidth: 680 }}>{rec.detail}</p>
        </div>
      </header>

      {/* Headline: por qué importa ($ directo o proceso/performance) */}
      {tri && (
        <div className="glass-panel" style={{ marginTop: 14, padding: '16px 18px' }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, marginBottom: 10, color: tri.changeKind === 'proceso' ? '#1689C4' : '#15803d', background: tri.changeKind === 'proceso' ? 'rgba(22,137,196,0.10)' : 'rgba(21,128,61,0.10)' }}>
            {tri.changeKind === 'proceso' ? '⚙️ Cambio de proceso / performance' : '💰 Cambio económico'}
          </span>
          {moneyRec ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 34, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, var(--font-satoshi), sans-serif' }}>{fmtArsShort(tri.marginAtStakeArs!)}</span>
              <span style={{ fontSize: 14, color: '#5b6b7f' }}>de ingreso nuevo / mes {tri.cadence === 'acumulado' ? '· se destraba del stock' : '· recurrente'}{tri.reach != null && ` · alcance ${tri.reach.toLocaleString('es-AR')}`}</span>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#5b6b7f', marginBottom: tri.feedsInto ? 8 : 0 }}>Sin $ directo — el impacto económico es indirecto (aguas abajo).</div>
              {tri.feedsInto && (
                <div style={{ fontSize: 14, color: '#102A45', display: 'flex', gap: 6 }}><span>↘</span><span><b>Alimenta a:</b> {tri.feedsInto}</span></div>
              )}
            </div>
          )}
        </div>
      )}

      {tri && (
        <>
          {/* Tu escenario — para recos con $: explica de dónde sale el número y deja editarlo */}
          {tri.marginInputs && tri.assumptions && tri.marginAtStakeArs != null && (
            <ScenarioPanel
              recId={rec.id}
              inputs={tri.marginInputs}
              baseAssumptions={tri.assumptions}
              baseMargin={tri.marginAtStakeArs}
              cadence={tri.cadence}
            />
          )}

          {/* Cómo se calcula — tabla del motor. Solo si NO hay panel de escenario (que ya lo explica mejor). */}
          {!tri.marginInputs && (
            <Section title="Cómo se calcula">
              <div style={{ fontSize: 13, color: '#3a4a5c', fontStyle: 'italic', marginBottom: 10 }}>{tri.formula}</div>
              <div className="glass-panel" style={{ padding: '4px 0', overflow: 'hidden' }}>
                {tri.breakdown.map((row, i) => {
                  const isTotal = i === tri.breakdown.length - 1;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderTop: i ? '1px solid rgba(0,45,95,0.06)' : 'none', background: isTotal ? 'rgba(22,137,196,0.06)' : 'transparent' }}>
                      <span style={{ flex: 1, fontSize: 12.5, color: '#3a4a5c', fontWeight: isTotal ? 700 : 400 }}>{row.label}</span>
                      <span style={{ fontSize: 12.5, color: isTotal ? '#002D5F' : '#3a4a5c', fontWeight: isTotal ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                      {row.src && <SrcTagChip src={row.src} />}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* De dónde sale cada número */}
          <Section title="De dónde sale cada número (las 3 fuentes)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tri.basis.mixpanel && <div style={{ fontSize: 12.5, color: '#3a4a5c' }}><SrcTagChip src="Mixpanel" /> {tri.basis.mixpanel}</div>}
              {tri.basis.hubspot && <div style={{ fontSize: 12.5, color: '#3a4a5c' }}><SrcTagChip src="HubSpot" /> {tri.basis.hubspot}</div>}
              {tri.basis.pelg && <div style={{ fontSize: 12.5, color: '#3a4a5c' }}><SrcTagChip src="PELG" /> {tri.basis.pelg}</div>}
            </div>
          </Section>

          {/* Supuestos — solo si NO hay panel de escenario (el panel ya los muestra con sus valores reales y editables) */}
          {moneyRec && !tri.marginInputs && (
            <Section title="Supuestos detrás del número (no medidos)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {Object.values(ECON_ASSUMPTIONS).map((as) => (
                  <div key={as.key} style={{ fontSize: 12, color: '#3a4a5c', padding: '7px 10px', background: 'rgba(154,106,0,0.06)', borderRadius: 7, border: '1px solid rgba(154,106,0,0.14)' }}>
                    <b>{as.label}: {as.unit === '%' ? `${(as.value * 100).toFixed(0)}%` : `${as.value} ${as.unit}`}</b> — {as.note}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Cómo se prioriza — oculto en MVP (detalle interno del ranking) */}
          {!MVP_MODE && (
          <Section title="Cómo se prioriza (score)">
            <div style={{ fontSize: 12.5, color: '#3a4a5c', fontStyle: 'italic', marginBottom: 10 }}>score = margen × confianza × urgencia ÷ esfuerzo (lo acumulado se prorratea a mensual)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div className="glass-panel" style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>{Math.round(tri.confidence * 100)}%</div>
                <div style={{ fontSize: 11, color: '#8696a7', marginBottom: 4 }}>Confianza</div>
                <div style={{ fontSize: 11, color: '#5b6b7f', lineHeight: 1.4 }}>{tri.confidenceReason}</div>
              </div>
              <div className="glass-panel" style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>{tri.effort}/3</div>
                <div style={{ fontSize: 11, color: '#8696a7', marginBottom: 4 }}>Esfuerzo</div>
                <div style={{ fontSize: 11, color: '#5b6b7f', lineHeight: 1.4 }}>{tri.effortReason}</div>
              </div>
              <div className="glass-panel" style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>×{tri.urgency}</div>
                <div style={{ fontSize: 11, color: '#8696a7', marginBottom: 4 }}>Urgencia</div>
                <div style={{ fontSize: 11, color: '#5b6b7f', lineHeight: 1.4 }}>{tri.urgencyReason}</div>
              </div>
            </div>
          </Section>
          )}

          {/* Rango probabilístico (Monte Carlo) — oculto en MVP */}
          {!MVP_MODE && tri.band && (
            <Section title="Rango probabilístico (Monte Carlo · Capa 3)">
              <div style={{ fontSize: 12.5, color: '#3a4a5c', fontStyle: 'italic', marginBottom: 10 }}>
                Los supuestos son inciertos: se muestrean {tri.band.n.toLocaleString('es-AR')} escenarios → la cifra puntual es el medio de un rango, no una certeza.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {([['P10 · conservador', tri.band.p10], ['P50 · mediana', tri.band.p50], ['P90 · optimista', tri.band.p90]] as [string, number][]).map(([lbl, val]) => (
                  <div key={lbl} className="glass-panel" style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>{fmtArsShort(val)}</div>
                    <div style={{ fontSize: 11, color: '#8696a7' }}>{lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: tri.band.robust ? '#15803d' : '#9a6a00', marginTop: 10 }}>
                {tri.band.robust
                  ? '✓ Robusto: el rango es angosto — el ranking casi no depende de los supuestos.'
                  : `⚠ Sensible sobre todo a "${tri.band.dominantDriver}": es el supuesto que más mueve la cifra. Medirlo es lo que más reduce la incertidumbre.`}
              </div>
            </Section>
          )}

          {/* Playbook */}
          {rec.backedBy && (
            <Section title="Respaldo del Playbook (prior aprendido)">
              <div style={{ fontSize: 12.5, color: '#3a4a5c', padding: '10px 12px', background: 'rgba(21,128,61,0.06)', borderRadius: 8, border: '1px solid rgba(21,128,61,0.16)' }}>
                📖 {rec.backedBy.statement}
              </div>
            </Section>
          )}

          {/* Honestidad */}
          <Section title="Lo que el número NO cuenta">
            {tri.honesty.map((hn, i) => (
              <div key={i} style={{ fontSize: 12, color: '#9a6a00', marginTop: 5, display: 'flex', gap: 6 }}><span>⚠</span><span>{hn}</span></div>
            ))}
          </Section>
        </>
      )}
    </div>
  );
}
