"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
  marginFromScenario,
  ltvFromScenario,
  presetAssumptions,
  EDITABLE_BY_KIND,
  ASSUMPTION_META,
  type MarginInputs,
  type ScenarioAssumptions,
  type PresetName,
} from '@/lib/economics/scenario';
import { ARPU_MENSUAL_ARS } from '@/lib/mixpanel/snapshot';
import { loadAssumptions, saveAssumptions, clearAssumptions } from '@/lib/store/assumptionsStore';

const fmtArs = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
const fmtArsShort = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(1)} mil M` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}k` : `$${Math.round(n)}`;
const fmtN = (n: number) => Math.round(n).toLocaleString('es-AR');
const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;
const eq = (a: ScenarioAssumptions, b: ScenarioAssumptions) =>
  a.recovery === b.recovery && a.datoCapita === b.datoCapita && a.retentionMonths === b.retentionMonths && a.marginPct === b.marginPct;

interface Row { label: string; value: string; tone: 'medido' | 'supuesto' | 'sub' | 'total' }

function buildRows(inp: MarginInputs, a: ScenarioAssumptions): Row[] {
  const ltv = ltvFromScenario(a.retentionMonths, a.marginPct);
  const margin = marginFromScenario(inp, a);
  const ltvRow: Row = { label: `LTV de contribución  ·  ARPU ${fmtArs(ARPU_MENSUAL_ARS)} × ${a.retentionMonths}m × ${pct(a.marginPct)}`, value: `× ${fmtArs(ltv)}`, tone: 'supuesto' };
  if (inp.kind === 'leak') {
    const recovered = (inp.leak ?? 0) * a.recovery * (inp.recMult ?? 1);
    const rows: Row[] = [
      { label: 'Fuga del paso (medido)', value: `${fmtN(inp.leak ?? 0)} / mes`, tone: 'medido' },
      { label: 'Recuperable de la fuga (supuesto)', value: `× ${pct(a.recovery)}`, tone: 'supuesto' },
    ];
    if ((inp.recMult ?? 1) !== 1) rows.push({ label: 'Factor del tipo (ataca la misma fuga con menos recuperación)', value: `× ${inp.recMult}`, tone: 'medido' });
    rows.push(
      { label: '= Datos recuperados', value: fmtN(recovered), tone: 'sub' },
      { label: 'Dato → cápita (supuesto)', value: `× ${pct(a.datoCapita)} = ${fmtN(recovered * a.datoCapita)} cápitas`, tone: 'supuesto' },
      ltvRow,
      { label: '= Margen en juego', value: `${fmtArsShort(margin)} / mes`, tone: 'total' },
    );
    return rows;
  }
  if (inp.kind === 'winrate') {
    return [
      { label: 'Negocios decididos (medido)', value: fmtN(inp.decided ?? 0), tone: 'medido' },
      { label: 'Brecha a la meta de cierre (medido vs benchmark)', value: `× ${pct(inp.gap ?? 0)}`, tone: 'medido' },
      ltvRow,
      { label: '= Margen (acumulado)', value: fmtArsShort(margin), tone: 'total' },
    ];
  }
  return [
    { label: 'Negocios atascados (medido)', value: fmtN(inp.stock ?? 0), tone: 'medido' },
    { label: 'Cierre esperado (medido)', value: `× ${pct(inp.winRate ?? 0)}`, tone: 'medido' },
    ltvRow,
    { label: '= Margen (acumulado)', value: fmtArsShort(margin), tone: 'total' },
  ];
}

// Campo de número LIBRE: el usuario escribe el valor a su antojo (sin tope de slider). Para
// fracciones se escribe el porcentaje (ej. 12,5 → 12,5%); se respeta lo tipeado mientras edita y
// solo se re-sincroniza si el valor cambia desde afuera (un preset). Tope sano: una fracción ≤ 100%.
function NumField({ value, unit, onChange }: { value: number; unit: 'pct' | 'months'; onChange: (n: number) => void }) {
  const toText = (v: number) => (unit === 'pct' ? String(+(v * 100).toFixed(2)) : String(Math.round(v)));
  const [text, setText] = useState(toText(value));
  useEffect(() => {
    const parsed = parseFloat(text.replace(',', '.'));
    const cur = !Number.isFinite(parsed) ? NaN : unit === 'pct' ? Math.max(0, Math.min(100, parsed)) / 100 : Math.max(1, Math.round(parsed));
    if (!Number.isFinite(cur) || Math.abs(cur - value) > 1e-9) setText(toText(value));
    // solo re-sincroniza ante cambios EXTERNOS del valor (presets / carga); no pisa lo que tipeás.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const commit = (s: string) => {
    setText(s);
    const n = parseFloat(s.replace(',', '.'));
    if (!Number.isFinite(n)) return; // dejá tipear "0.", "," etc. sin romper
    onChange(unit === 'pct' ? Math.max(0, Math.min(100, n)) / 100 : Math.max(1, Math.round(n)));
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <input
        value={text}
        onChange={(e) => commit(e.target.value)}
        inputMode="decimal"
        style={{ width: 88, textAlign: 'right', fontSize: 16, fontWeight: 800, color: '#002D5F', fontFamily: 'Satoshi, sans-serif', padding: '6px 9px', border: '1px solid rgba(0,45,95,0.2)', borderRadius: 8, background: '#fff' }}
      />
      <span style={{ fontSize: 13, color: '#5b6b7f', fontWeight: 600, minWidth: 46 }}>{unit === 'pct' ? '%' : 'meses'}</span>
    </span>
  );
}

export default function ScenarioPanel({
  recId, inputs, baseAssumptions, baseMargin, cadence,
}: {
  recId: string;
  inputs: MarginInputs;
  baseAssumptions: ScenarioAssumptions;
  baseMargin: number;
  cadence: 'mensual' | 'acumulado' | null;
}) {
  const [a, setA] = useState<ScenarioAssumptions>(baseAssumptions);
  const [saved, setSaved] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);

  // Cargar el escenario guardado del usuario (si existe) para esta oportunidad.
  useEffect(() => {
    let alive = true;
    loadAssumptions().then((m) => {
      if (alive && m[recId]) { setA({ ...baseAssumptions, ...m[recId] }); setHasOverride(true); }
    });
    return () => { alive = false; };
  }, [recId, baseAssumptions]);

  const margin = useMemo(() => marginFromScenario(inputs, a), [inputs, a]);
  const rows = useMemo(() => buildRows(inputs, a), [inputs, a]);
  const isBase = eq(a, baseAssumptions);
  const delta = baseMargin > 0 ? margin / baseMargin - 1 : 0;
  const editable = EDITABLE_BY_KIND[inputs.kind];
  const per = cadence === 'acumulado' ? ' (acumulado)' : ' / mes';

  const set = (k: keyof ScenarioAssumptions, v: number) => { setA((p) => ({ ...p, [k]: v })); setSaved(false); };
  const applyPreset = (name: PresetName) => { setA(presetAssumptions(name, baseAssumptions)); setSaved(false); };
  const save = async () => { await saveAssumptions(recId, a); setSaved(true); setHasOverride(true); };
  const reset = async () => { await clearAssumptions(recId); setA(baseAssumptions); setSaved(false); setHasOverride(false); };

  const toneColor: Record<Row['tone'], string> = { medido: '#1689C4', supuesto: '#9a6a00', sub: '#5b6b7f', total: '#002D5F' };

  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#8696a7', marginBottom: 8 }}>
        Tu escenario · ajustá los supuestos y mirá cómo cambia la plata
      </div>

      {/* Comparativo motor vs tu escenario */}
      <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#8696a7' }}>Motor (supuestos base)</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#5b6b7f', fontFamily: 'Satoshi, sans-serif' }}>{fmtArsShort(baseMargin)}{per}</div>
        </div>
        <div style={{ fontSize: 22, color: '#c3ccd6' }}>→</div>
        <div>
          <div style={{ fontSize: 11, color: '#8696a7' }}>Tu escenario{hasOverride && !isBase ? ' (guardado)' : ''}</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: isBase ? '#5b6b7f' : '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>{fmtArsShort(margin)}{per}</div>
        </div>
        {!isBase && (
          <div style={{ fontSize: 13, fontWeight: 700, color: delta < 0 ? '#b4232a' : '#15803d' }}>
            {delta >= 0 ? '+' : ''}{(delta * 100).toFixed(0)}% vs motor
          </div>
        )}
      </div>

      {/* Equación viva */}
      <div className="glass-panel" style={{ marginTop: 10, padding: '4px 0', overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderTop: i ? '1px solid rgba(0,45,95,0.06)' : 'none', background: r.tone === 'total' ? 'rgba(22,137,196,0.06)' : 'transparent' }}>
            <span style={{ flex: 1, fontSize: 12.5, color: '#3a4a5c', fontWeight: r.tone === 'total' ? 700 : 400 }}>{r.label}</span>
            <span style={{ fontSize: 12.5, fontWeight: r.tone === 'total' ? 700 : 500, color: toneColor[r.tone], fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#8696a7', fontWeight: 600 }}>Atajos:</span>
        {(['conservador', 'base', 'optimista'] as PresetName[]).map((p) => (
          <button key={p} onClick={() => applyPreset(p)}
            style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(0,45,95,0.16)', background: '#fff', color: '#002D5F', cursor: 'pointer', textTransform: 'capitalize' }}>
            {p === 'base' ? 'Base (motor)' : p}
          </button>
        ))}
      </div>

      {/* Supuestos — número libre: poné el valor a tu antojo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {editable.map((key) => {
          const m = ASSUMPTION_META[key];
          return (
            <div key={key} className="glass-panel" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#102A45' }}>{m.label}</span>
                <NumField value={a[key]} unit={m.unit} onChange={(v) => set(key, v)} />
              </div>
              <div style={{ fontSize: 11, color: '#8696a7', lineHeight: 1.45, marginTop: 6 }}>{m.note}</div>
            </div>
          );
        })}
      </div>

      {/* Guardar / reset */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={save} disabled={isBase}
          style={{ fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8, border: 'none', background: isBase ? '#c3ccd6' : '#002D5F', color: '#fff', cursor: isBase ? 'default' : 'pointer' }}>
          Guardar mi escenario
        </button>
        {hasOverride && (
          <button onClick={reset} style={{ fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(0,45,95,0.16)', background: '#fff', color: '#5b6b7f', cursor: 'pointer' }}>
            Volver al motor
          </button>
        )}
        {saved && <span style={{ fontSize: 12.5, fontWeight: 600, color: '#15803d' }}>Guardado ✓ (queda asentado para esta oportunidad)</span>}
      </div>

      <div style={{ fontSize: 11.5, color: '#8696a7', marginTop: 10, lineHeight: 1.5 }}>
        El motor parte de supuestos <b>direccionales</b> (el “recuperable” viene de benchmarks CRO de e-commerce; para una prepaga suele quedar alto).
        Acá dejás asentado <b>lo que VOS asumís</b>. Se guarda por oportunidad y por ahora vive en este navegador.
      </div>
    </section>
  );
}
