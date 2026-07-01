"use client";
import React from 'react';
import type { Analytics } from '@/lib/mixpanel/analytics';
import { WINRATE_TARGET } from '@/lib/mixpanel/benchmarks';

// LA CADENA DE CRECIMIENTO CRUZADA (núcleo del MVP).
// Pone las 3 herramientas en la secuencia del crecimiento — PELG (marketing) → Mixpanel
// (comportamiento en el cotizador) → HubSpot (comercial) — para ver, en un solo lugar, dónde
// entran los prospectos y dónde se caen. HONESTIDAD: los saltos ENTRE herramientas NO están
// trackeados 1:1 (falta identidad CUIL/prospecto_id → v2), así que cada tramo muestra su propia
// conversión medida (real, misma herramienta) y los puentes van marcados como "no medido 1:1".
// Nada de $: el MVP muestra personas y conversión, no plata.

const fmt = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('es-AR'));
const pct = (n: number | null | undefined, d = 0) => (n == null ? '—' : `${(n * 100).toFixed(d)}%`);

interface Step { label: string; value: number | null; conv?: number | null; convNote?: string; width: number; leak?: boolean }

function Segment({ icon, tool, tint, period, steps, note }: {
  icon: string; tool: string; tint: string; period: string; steps: Step[]; note?: { text: string; bad?: boolean };
}) {
  return (
    <div style={{ background: 'var(--surface-color)', border: '1px solid var(--surface-border)', borderRadius: 14, padding: '16px 18px', borderLeft: `3px solid ${tint}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.1 }}>{tool}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 999 }}>{period}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12.5, color: s.leak ? 'var(--danger-color)' : 'var(--text-secondary)', fontWeight: s.leak ? 700 : 500, marginBottom: 4 }}>
                {s.label}{s.conv != null ? <span style={{ color: s.leak ? 'var(--danger-color)' : 'var(--text-muted)', fontWeight: 600 }}> · {pct(s.conv, 1)} {s.convNote ?? 'del paso anterior'}</span> : null}
              </div>
              <div style={{ height: 7, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(s.width, 2)}%`, height: '100%', background: s.leak ? 'var(--danger-color)' : tint, borderRadius: 5 }} />
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right' }}>{fmt(s.value)}</span>
          </div>
        ))}
      </div>
      {note && (
        <div style={{ marginTop: 11, fontSize: 12, fontWeight: 600, color: note.bad ? 'var(--danger-color)' : 'var(--text-muted)' }}>
          {note.bad ? '⚠ ' : ''}{note.text}
        </div>
      )}
    </div>
  );
}

// Puente entre herramientas: deja EXPLÍCITO que no hay conversión trackeada 1:1 (no inventamos un número).
function Bridge() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0' }}>
      <span style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1 }}>⋮</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: '#b08a2a', background: 'rgba(211,138,24,0.10)', padding: '2px 9px', borderRadius: 999 }}>
        puente no medido 1:1 · falta identidad (v2)
      </span>
    </div>
  );
}

export default function CrossChain({ data }: { data: Analytics }) {
  const cot = data.funnels.find((f) => f.id === 'cotizador');
  const h = data.hubspot;
  const mk = data.marketing;

  // Tramo Mixpanel: los pasos medidos del cotizador (mismo tool → conversión real).
  const cotSteps: Step[] = (cot?.steps ?? [])
    .filter((s) => s.status === 'live' && s.value != null)
    .map((s) => ({ label: s.label, value: s.value, conv: s.stepConversion, width: s.widthPct, leak: s.isLeak }));

  // Tramo HubSpot: negocios → ganados/perdidos (mismo tool → real). Barras proporcionales al total.
  const deals = h?.totalDeals ?? 0;
  const w = (n: number) => (deals > 0 ? Math.max((n / deals) * 100, 2) : 0);
  // Ganados y Perdidos son RESULTADOS hermanos de los cerrados (no pasos secuenciales), así que las
  // barras van proporcionales al total (magnitud honesta) y el cierre se explica en la nota con su
  // denominador real (ganados/cerrados) — NO como "% del paso anterior", que sería un número engañoso.
  const hsSteps: Step[] = h
    ? [
        { label: 'Negocios en el CRM', value: h.totalDeals, width: 100 },
        { label: 'Ganados (nuevos socios)', value: h.won, width: w(h.won) },
        { label: 'Perdidos', value: h.lost, width: w(h.lost) },
      ]
    : [];

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 16 }}>
        Las 3 herramientas puestas en la secuencia del crecimiento. Dentro de cada una la conversión es <strong>real</strong> (misma fuente); entre herramientas todavía <strong>no hay cruce 1:1</strong> por persona — eso llega con identidad (CUIL) en v2.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Segment
          icon="💰" tool="Marketing · PELG" tint="#7c3aed" period={mk.period}
          steps={[{ label: 'Leads generados por campañas', value: mk.totalLeads, width: 100 }]}
          note={{ text: `${mk.channels.filter((c) => c.kind === 'paid' && !c.excluded).length} canales pagos activos · de acá salen los prospectos que entran al cotizador` }}
        />
        <Bridge />
        <Segment
          icon="📊" tool="Comportamiento · Mixpanel" tint="#1689C4"
          period={data.window ? `${data.window.from} → ${data.window.to}` : `últimos ${data.meta.rangeDays}d`}
          steps={cotSteps.length ? cotSteps : [{ label: 'Sin datos del cotizador en este rango', value: null, width: 0 }]}
          note={cot?.leakTransition ? { text: `mayor fuga: ${cot.leakTransition} −${pct(cot.leakDropPct)} · conversión total ${pct(cot.overallConversion, 1)}${cot.target != null ? ` (meta ${pct(cot.target)})` : ''}`, bad: true } : undefined}
        />
        <Bridge />
        <Segment
          icon="🤝" tool="Comercial · HubSpot" tint="#1e9e6a" period="estado actual"
          steps={hsSteps.length ? hsSteps : [{ label: 'HubSpot no disponible', value: null, width: 0 }]}
          note={
            h?.biggestOpenStage
              ? { text: `${fmt(h.biggestOpenStage.count)} negocios atascados en "${h.biggestOpenStage.label}"${h.winRate != null ? ` · cierre ${pct(h.winRate)} (ganados sobre cerrados)${h.winRate < WINRATE_TARGET ? `, bajo meta ${pct(WINRATE_TARGET)}` : ''}` : ''}`, bad: true }
              : undefined
          }
        />
      </div>
    </div>
  );
}
