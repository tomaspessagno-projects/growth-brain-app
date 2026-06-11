"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../funnel/funnel.module.css';
import { SEGMENTS_AUDIT as A, type Bucket } from '@/lib/segments/data';
import type { Voice } from '@/lib/voice/verbatims';
import { useAnalytics } from '@/components/AnalyticsProvider';

const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');
const pctOf = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h3 className={styles.sectionTitle} style={{ marginBottom: sub ? 2 : 10 }}>{title}</h3>
      {sub && <div style={{ fontSize: 12.5, color: '#8696a7', marginBottom: 10 }}>{sub}</div>}
      {children}
    </section>
  );
}

function Bars({ rows, highlight }: { rows: Bucket[]; highlight?: string }) {
  const total = rows.reduce((a, r) => a + r.count, 0) || 1;
  const max = Math.max(...rows.map((r) => r.count)) || 1;
  return (
    <div className="glass-panel" style={{ padding: 16 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ marginBottom: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
            <span style={{ color: '#3a4a5c', fontWeight: r.label === highlight ? 700 : 600 }}>{r.label}{r.label === highlight && ' ⭐'}</span>
            <span style={{ color: '#5b6b7f' }}>{fmt(r.count)} · {pctOf(r.count, total)}%</span>
          </div>
          <div style={{ height: 8, background: 'rgba(0,45,95,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(r.count / max) * 100}%`, height: '100%', background: r.label === highlight ? 'linear-gradient(90deg,#002D5F,#3FB6E6)' : '#9fb6cf' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SegmentosPage() {
  const { data: analytics } = useAnalytics();
  const [voice, setVoice] = useState<Voice | null>(null);
  useEffect(() => {
    fetch('/api/voice').then((r) => (r.ok ? r.json() : null)).then(setVoice).catch(() => {});
  }, []);
  const npsTotalConteo = A.nps.promoters + A.nps.passives + A.nps.detractors;

  // Convergencia de señales (discovery): donde lo cualitativo y lo cuantitativo apuntan a lo mismo.
  type Conv = { title: string; tag: string; tone: 'problem' | 'guardrail'; sources: { k: string; t: string }[]; action: string; link: string; cta: string };
  const convergence: Conv[] = [];
  const seg = voice?.themes.find((t) => t.key === 'seguimiento');
  if (voice?.source === 'live' && seg) {
    const stuck = analytics?.hubspot?.biggestOpenStage;
    const cotConv = analytics?.summary?.cotizadorConversion;
    convergence.push({
      title: 'El cuello es el SEGUIMIENTO, no el producto',
      tag: 'triple convergencia', tone: 'problem',
      sources: [
        { k: 'Cualitativo · NPS', t: `${Math.round(seg.detractorShare * 100)}% de los detractores dicen que no les responden (${seg.n} menciones, score ${seg.avgScore?.toFixed(1) ?? '—'})` },
        ...(stuck ? [{ k: 'Comercial · HubSpot', t: `${stuck.count.toLocaleString('es-AR')} deals atascados en "${stuck.label}" sin follow-up` }] : []),
        ...(cotConv != null ? [{ k: 'Conducta · Mixpanel', t: `la conversión del cotizador queda en ${(cotConv * 100).toFixed(1)}%` }] : []),
      ],
      action: 'Experimento: SLA de respuesta del asesor (auto-recordatorio / bot de holding) y medí el impacto en NPS y en deals que avanzan.',
      link: '/experimentos', cta: 'Armar experimento →',
    });
    convergence.push({
      title: 'El asesor humano es el eje — protegelo',
      tag: 'guardrail', tone: 'guardrail',
      sources: [
        { k: 'Cualitativo · NPS', t: `los ${voice.promoters} promotores valoran claridad (${voice.drivers[0]?.n ?? 0}) y profesionalismo (${voice.drivers[1]?.n ?? 0}) por encima de todo` },
      ],
      action: 'No automatices el contacto humano: mejorá su velocidad y consistencia. Sacarlo sería perder lo que más valoran los que te quieren.',
      link: '/playbook', cta: 'Ver en el Playbook →',
    });
  }

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <Link href="/explorador" className={styles.recFunnel} style={{ display: 'inline-block', marginBottom: 12 }}>← Explorador</Link>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Segmentos · entender al usuario</h1>
          <p className="page-subtitle" style={{ marginBottom: 0, maxWidth: 680 }}>
            Discovery sobre <b>datos reales</b>: cruzamos lo <b>cualitativo</b> (la voz del socio) con lo <b>cuantitativo</b> (su conducta y su plata). Donde convergen, hay oportunidad o experimento.
          </p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeSnap}`}>Auditoría · {A.asOf}</span>
        </div>
      </header>

      {/* Convergencia de señales · discovery */}
      {convergence.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Convergencia de señales · discovery</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {convergence.map((c) => (
              <div key={c.title} className="glass-panel" style={{ padding: 16, borderLeft: `4px solid ${c.tone === 'problem' ? '#C25B45' : '#1689C4'}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#002D5F' }}>{c.title}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: c.tone === 'problem' ? '#b91c1c' : '#1689C4' }}>{c.tag}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                  {c.sources.map((sc, i) => (
                    <div key={i} style={{ fontSize: 12.5, color: '#3a4a5c', display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#5b6b7f', minWidth: 130 }}>{sc.k}</span>
                      <span style={{ flex: 1 }}>{sc.t}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12.5, color: '#15803d', fontWeight: 600 }}>→ {c.action} <Link href={c.link} style={{ color: '#1689C4', whiteSpace: 'nowrap' }}>{c.cta}</Link></div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cobertura */}
      <Section title="Cobertura de datos" sub={`De ${fmt(A.contactsTotal)} contactos — qué campo está poblado y en cuántos. Esto define qué segmentos son sólidos y cuáles ralos.`}>
        <div className="glass-panel" style={{ padding: '4px 0' }}>
          {A.coverage.map((c, i) => (
            <div key={c.field} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 0.8fr', gap: 8, alignItems: 'center', padding: '8px 16px', borderTop: i ? '1px solid rgba(0,45,95,0.05)' : 'none', fontSize: 12.5 }}>
              <span style={{ color: '#3a4a5c', fontWeight: 600 }}>{c.field}</span>
              <span style={{ color: '#002D5F', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.count)}</span>
              <div style={{ height: 6, background: 'rgba(0,45,95,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pctOf(c.count, A.contactsTotal)}%`, height: '100%', background: pctOf(c.count, A.contactsTotal) >= 20 ? '#17A673' : '#D38A18' }} />
              </div>
              <span style={{ color: '#8696a7', fontSize: 11 }}>{pctOf(c.count, A.contactsTotal)}% · {c.source}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Composición de la demanda */}
      <Section title="Composición de la demanda" sub="Mixpanel · ingreso al flujo de WhatsApp · últimos 30 días. Individual es el segmento más grande; el 30% sin taggear es un agujero de instrumentación.">
        <Bars rows={A.demanda.rows} highlight="Individual" />
        <div style={{ fontSize: 12, color: '#5b6b7f', marginTop: 8 }}>
          Completados/mes: <b style={{ color: '#002D5F' }}>{fmt(A.demanda.completadosMes.individual)}</b> individual · <b style={{ color: '#002D5F' }}>{fmt(A.demanda.completadosMes.familiar)}</b> familiar.
        </div>
      </Section>

      {/* Edad */}
      <Section title="Edad" sub={`HubSpot · ${fmt(250571)} con dato. El núcleo del negocio es 31–45.`}>
        <Bars rows={A.edad} highlight="31–45" />
      </Section>

      {/* Canales */}
      <Section title="Canales de origen" sub="HubSpot · 478.498 con canal. Estos son los reales — cruzar con la conversión por canal del cotizador (display ~0%, meta ~45%).">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {A.canales.map((c) => (
            <span key={c} style={{ fontSize: 12.5, color: '#3a4a5c', background: '#fff', border: '1px solid #e3e9f0', borderRadius: 7, padding: '5px 10px' }}>{c}</span>
          ))}
        </div>
      </Section>

      {/* NPS */}
      <Section title="Satisfacción · NPS" sub={`HubSpot (campo custom). Muestra de ${A.nps.sample} sobre ${fmt(A.nps.total)} con score — DIRECCIONAL, no por micro-segmento.`}>
        <div className="glass-panel" style={{ padding: 16, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 34, fontWeight: 700, color: A.nps.score >= 30 ? '#15803d' : '#a16207', fontFamily: 'Satoshi, sans-serif' }}>{A.nps.score}</div>
            <div style={{ fontSize: 11, color: '#8696a7' }}>NPS · promedio {A.nps.avg}</div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: `${pctOf(A.nps.promoters, npsTotalConteo)}%`, background: '#17A673' }} />
              <div style={{ width: `${pctOf(A.nps.passives, npsTotalConteo)}%`, background: '#D7B66A' }} />
              <div style={{ width: `${pctOf(A.nps.detractors, npsTotalConteo)}%`, background: '#C25B45' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#5b6b7f', marginTop: 6 }}>
              <span>🟢 {pctOf(A.nps.promoters, npsTotalConteo)}% promotores</span>
              <span>🟡 {pctOf(A.nps.passives, npsTotalConteo)}% pasivos</span>
              <span>🔴 {pctOf(A.nps.detractors, npsTotalConteo)}% detractores</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#5b6b7f', maxWidth: 200 }}>+ <b>{A.nps.verbatimCount}</b> comentarios abiertos (el "por qué") sin explotar.</div>
        </div>
        <div style={{ fontSize: 11, color: '#9a6a00', marginTop: 6 }}>⚠ El NPS nativo de HubSpot está vacío; este sale del campo custom y es ralo (1.377). Sirve de termómetro, no para cortar por segmento fino.</div>
      </Section>

      {/* Voz del cliente — verbatims */}
      <Section title="Voz del cliente · qué dicen los socios" sub={voice?.source === 'live' ? `${voice.total} comentarios abiertos del NPS, agrupados por tema (reglas transparentes). El problema más doloroso, arriba.` : 'Los comentarios en crudo del NPS, agrupados por tema.'}>
        {voice?.source === 'live' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {voice.themes.filter((t) => t.key !== 'otro').map((t) => (
                <div key={t.key} className="glass-panel" style={{ padding: '12px 14px', borderLeft: `3px solid ${t.isProblem ? (t.detractorPct >= 0.5 ? '#C25B45' : '#D38A18') : '#17A673'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#002D5F' }}>
                      {t.label}
                      {t.isProblem && t.systemic && <span style={{ fontSize: 10.5, fontWeight: 600, color: '#9a6a00', marginLeft: 8 }}>● sistémico (todos los canales)</span>}
                    </span>
                    <span style={{ fontSize: 12, color: '#5b6b7f', fontVariantNumeric: 'tabular-nums' }}>
                      {t.n} menciones · NPS {t.avgScore != null ? t.avgScore.toFixed(1) : '—'} · {Math.round(t.detractorPct * 100)}% detractores
                    </span>
                  </div>
                  {t.isProblem && t.detractorShare > 0.02 && (
                    <div style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600, marginTop: 4 }}>Explica el {Math.round(t.detractorShare * 100)}% de TODOS los detractores</div>
                  )}
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {t.samples.map((sm, i) => (<div key={i} style={{ fontSize: 12, color: '#3a4a5c', fontStyle: 'italic' }}>«{sm}»</div>))}
                  </div>
                  {t.isProblem && t.topChannels.length > 0 && (
                    <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {t.topChannels.map((c) => (<span key={c.canal} style={{ fontSize: 10.5, color: '#5b6b7f', background: '#f1f6fc', border: '1px solid #e3e9f0', borderRadius: 5, padding: '1px 6px' }}>{c.canal}: {c.n}</span>))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Qué valoran los promotores */}
            {voice.drivers.some((d) => d.n > 0) && (
              <div className="glass-panel" style={{ marginTop: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#15803d', marginBottom: 8 }}>Qué valoran los {voice.promoters} promotores</div>
                {voice.drivers.filter((d) => d.n > 0).map((d) => {
                  const max = Math.max(...voice.drivers.map((x) => x.n)) || 1;
                  return (
                    <div key={d.label} style={{ marginBottom: 7 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#3a4a5c', marginBottom: 2 }}><span>{d.label}</span><span>{d.n}</span></div>
                      <div style={{ height: 6, background: 'rgba(0,45,95,0.06)', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${(d.n / max) * 100}%`, height: '100%', background: '#17A673' }} /></div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Síntesis */}
            <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(22,137,196,0.06)', border: '1px solid rgba(22,137,196,0.2)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#002D5F', marginBottom: 4 }}>🧭 El asesor humano es el eje del NPS</div>
              <div style={{ fontSize: 12.5, color: '#3a4a5c', lineHeight: 1.5 }}>
                Cuando el asesor responde y explica claro → promotor (lo que más valoran: claridad y profesionalismo). Cuando no responde → detractor: el seguimiento explica el {Math.round((voice.themes.find((t) => t.key === 'seguimiento')?.detractorShare ?? 0) * 100)}% de TODA la detracción, y es <b>sistémico</b> (aparece en todos los canales por igual). El problema #1 no es el producto, es <b>el seguimiento humano</b>. Guardrail: no automatizar el contacto — ponerle un SLA.
              </div>
            </div>
          </>
        ) : voice ? (
          <div className={styles.emptyState}>No pude leer los verbatims ahora (rate limit de HubSpot). Es solo lectura — reintentá en un rato.</div>
        ) : (
          <div className={styles.signalSub}>Cargando comentarios…</div>
        )}
      </Section>

      {/* Voz por canal */}
      {voice?.source === 'live' && voice.byChannel.length > 0 && (
        <Section title="Voz por canal" sub="Qué canal de adquisición trae a los socios más (in)satisfechos, y su queja dominante. Conecta el funnel con la satisfacción.">
          <div className="glass-panel" style={{ padding: '4px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.7fr 0.6fr 1.4fr', gap: 8, fontSize: 11, color: '#8696a7', fontWeight: 700, padding: '6px 16px', borderBottom: '1px solid var(--surface-border)' }}>
              <span>Canal</span><span>NPS prom.</span><span>Detr.</span><span>Queja #1</span>
            </div>
            {voice.byChannel.map((c) => (
              <div key={c.canal} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.7fr 0.6fr 1.4fr', gap: 8, fontSize: 12.5, padding: '8px 16px', borderTop: '1px solid rgba(0,45,95,0.05)', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: '#3a4a5c', fontWeight: 600 }}>{c.canal}</span>
                <span style={{ color: (c.avgScore ?? 0) >= 7 ? '#15803d' : (c.avgScore ?? 0) >= 5 ? '#a16207' : '#b91c1c', fontWeight: 700 }}>{c.avgScore != null ? c.avgScore.toFixed(1) : '—'}</span>
                <span style={{ color: '#5b6b7f' }}>{Math.round(c.detractorPct * 100)}%</span>
                <span style={{ color: '#5b6b7f' }}>{c.topProblem ?? '—'}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Lo que necesitan */}
      <Section title="Lo que necesitan (no teórico)" sub="Señales reales de qué valoran y por qué — para no inventar la voz del cliente.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {A.needSignals.map((s) => (
            <div key={s.label} className="glass-panel" style={{ padding: '11px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#002D5F' }}>{s.label} <span style={{ fontSize: 10.5, color: '#8696a7', fontWeight: 400 }}>· {s.source}</span></div>
              <div style={{ fontSize: 12, color: '#5b6b7f', marginTop: 2 }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* El cruce */}
      <Section title="El cruce que convierte esto en personas reales">
        <div className="glass-panel" style={{ padding: 16, border: '1px solid rgba(21,128,61,0.2)', background: 'rgba(21,128,61,0.04)' }}>
          <div style={{ fontSize: 13.5, color: '#15803d', fontWeight: 700, marginBottom: 6 }}>🔑 Hallazgo: Mixpanel ya tiene <code>prospecto_id</code> y <code>hubspot_id</code> como propiedades de usuario.</div>
          <div style={{ fontSize: 12.5, color: '#3a4a5c', lineHeight: 1.55 }}>
            Eso significa que el cruce visita↔cápita —que figuraba como "pendiente"— <b>es posible hoy</b>. Cableándolo, cada segmento de acá pasa de un corte aislado a una <b>persona objetivo real</b>: edad × canal × composición × <b>conversión a cápita</b> × <b>LTV</b> × NPS, todo junto. Es la prioridad estructural para que esto deje de ser cortes sueltos.
          </div>
        </div>
      </Section>

      {/* Persona borrador */}
      <Section title="Persona objetivo · borrador" sub="Compuesto de los cortes individuales (no es un cross-tab medido — eso llega con el cruce de arriba).">
        <div className="glass-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: 14, color: '#002D5F', fontWeight: 600, marginBottom: 8 }}>“Titular 31–45, arma plan individual o familiar, llega por META o REFERIDOS”</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#3a4a5c', lineHeight: 1.7 }}>
            <li><b>Quién:</b> 31–45 (el 40% de la base con edad), mayormente individual (40% de la demanda) o familiar (30%).</li>
            <li><b>Por dónde entra:</b> META y REFERIDOS son los canales sanos; display casi no convierte.</li>
            <li><b>Qué valora:</b> cartilla amplia (lo dice en el form) — palanca de mensaje y producto.</li>
            <li><b>Satisfacción:</b> NPS ~48 (bueno) pero con 733 verbatims sin leer donde está el detalle.</li>
          </ul>
        </div>
      </Section>

      <div style={{ marginTop: 18, fontSize: 11.5, color: '#8696a7', lineHeight: 1.6 }}>
        ℹ️ Todo acá es real (auditoría read-only {A.asOf}). Lo ralo (NPS, plan, hijos) se marca como tal. El siguiente paso para hiper-definir a quién apuntamos es el cruce <code>prospecto_id</code> — ahí los cortes se vuelven personas con cápita y plata atrás.
      </div>
    </div>
  );
}
