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

// medido = de Mixpanel/HubSpot (azul). supuesto = lo editable (ámbar). Resultado en azul oscuro.
const Med = ({ children }: { children: React.ReactNode }) => <b style={{ color: '#1689C4' }}>{children}</b>;
const Sup = ({ children }: { children: React.ReactNode }) => <b style={{ color: '#9a6a00' }}>{children}</b>;
const Res = ({ children }: { children: React.ReactNode }) => <b style={{ color: '#002D5F' }}>{children}</b>;

// "De dónde sale el número", en criollo: una historia con cada paso y cada término explicado.
function Narrative({ inp, a }: { inp: MarginInputs; a: ScenarioAssumptions }) {
  const ltv = ltvFromScenario(a.retentionMonths, a.marginPct);
  const margin = marginFromScenario(inp, a);
  // El LTV (valor de vida) es por TODA la permanencia, NO por mes. Se aclara explícito porque es lo
  // que más confunde: $388.800 = $90.000/mes × 24 meses × 18% de margen.
  const ltvSentence = (
    <>
      Cada socio deja <Res>{fmtArs(ltv)}</Res> de margen en <b>toda su permanencia</b> —su “valor de vida”, <b>no por mes</b>—:
      paga <Sup>{fmtArs(ARPU_MENSUAL_ARS)}/mes</Sup> durante ~<Sup>{a.retentionMonths} meses</Sup> que se queda, y de esa
      plata el <Sup>{pct(a.marginPct)}</Sup> es margen (lo que queda después de costos) → {fmtArs(ARPU_MENSUAL_ARS)} × {a.retentionMonths} × {pct(a.marginPct)} = <Res>{fmtArs(ltv)}</Res>.
    </>
  );
  const p: React.CSSProperties = { fontSize: 13.5, lineHeight: 1.9, color: '#3a4a5c', margin: 0 };
  const ojoBox: React.CSSProperties = { marginTop: 10, padding: '10px 12px', background: 'rgba(154,106,0,0.08)', border: '1px solid rgba(154,106,0,0.18)', borderRadius: 8, fontSize: 12.5, lineHeight: 1.6, color: '#3a4a5c' };

  if (inp.kind === 'leak') {
    const recovered = (inp.leak ?? 0) * a.recovery * (inp.recMult ?? 1);
    const capitas = recovered * a.datoCapita;
    const monthlyMargin = capitas * ARPU_MENSUAL_ARS * a.marginPct; // margen recurrente que SÍ entra por mes
    return (
      <>
        <p style={p}>
          Cada mes, <Med>{fmtN(inp.leak ?? 0)} personas</Med> llegan a este paso y se van sin completarlo <i>(medido en Mixpanel)</i>.{' '}
          Si la mejora recupera el <Sup>{pct(a.recovery)}</Sup> de ellas{(inp.recMult ?? 1) !== 1 ? <> (y como esta variante ataca la misma fuga con menos fuerza, ×{inp.recMult})</> : null} <i>(tu supuesto — editalo abajo)</i>,{' '}
          son <Res>{fmtN(recovered)} personas</Res> que sí completan los datos.{' '}
          Pero no todas se vuelven socias: asumimos que <Sup>{pct(a.datoCapita)}</Sup> de los datos capturados termina firmando <i>(supuesto)</i> → <Res>{fmtN(capitas)} socios nuevos</Res> por mes.{' '}
          {ltvSentence}{' '}
          <br />
          <span style={{ fontSize: 15 }}>Valor de vida del cohorte: <Res>{fmtN(capitas)} socios × {fmtArs(ltv)} = {fmtArsShort(margin)}</Res>.</span>
        </p>
        <div style={ojoBox}>
          ⚠️ <b>Cuidado con el “por mes”:</b> esos <b>{fmtArsShort(margin)}</b> son el <b>valor de por vida</b> de los {fmtN(capitas)} socios que sumás en un mes — <b>no</b> es plata que entre todos los meses.{' '}
          Lo que entra por mes de <b>margen recurrente</b> es {fmtN(capitas)} socios × {fmtArs(ARPU_MENSUAL_ARS)} × {pct(a.marginPct)} ≈ <Res>{fmtArsShort(monthlyMargin)} / mes</Res>{' '}
          (y se acumula: el mes siguiente sumás otros {fmtN(capitas)}, y así).
        </div>
      </>
    );
  }
  if (inp.kind === 'winrate') {
    const extra = (inp.decided ?? 0) * (inp.gap ?? 0);
    return (
      <p style={p}>
        Hay <Med>{fmtN(inp.decided ?? 0)} negocios</Med> ya decididos (ganados + perdidos) en el CRM <i>(medido en HubSpot)</i>.{' '}
        La tasa de cierre está <Med>{pct(inp.gap ?? 0)}</Med> por debajo de la meta: cerrar esa brecha equivale a <Res>{fmtN(extra)} socios</Res> más.{' '}
        {ltvSentence}{' '}
        <br />
        <span style={{ fontSize: 15 }}>En total: <Res>{fmtN(extra)} × {fmtArs(ltv)} = {fmtArsShort(margin)}</Res> de valor de vida (es un stock histórico — no plata mensual).</span>
      </p>
    );
  }
  const socios = (inp.stock ?? 0) * (inp.winRate ?? 0);
  return (
    <p style={p}>
      Hay <Med>{fmtN(inp.stock ?? 0)} negocios</Med> atascados en la etapa comercial más cargada <i>(medido en HubSpot)</i>.{' '}
      Si se cierran al <Med>{pct(inp.winRate ?? 0)}</Med> esperado, son <Res>{fmtN(socios)} socios</Res>.{' '}
      {ltvSentence}{' '}
      <br />
      <span style={{ fontSize: 15 }}>En total: <Res>{fmtN(socios)} × {fmtArs(ltv)} = {fmtArsShort(margin)}</Res> de valor de vida (stock — no plata mensual).</span>
    </p>
  );
}

// Input NUMÉRICO de entrada libre: escribís el valor (porcentaje o meses) a tu antojo. Mantiene un
// estado de texto propio para no pisar lo que tipeás; se re-sincroniza solo ante cambios externos (preset).
function NumField({ value, unit, onChange }: { value: number; unit: 'pct' | 'months'; onChange: (n: number) => void }) {
  const toText = (v: number) => (unit === 'pct' ? String(+(v * 100).toFixed(2)) : String(Math.round(v)));
  const [text, setText] = useState(toText(value));
  useEffect(() => {
    const parsed = parseFloat(text.replace(',', '.'));
    const cur = !Number.isFinite(parsed) ? NaN : unit === 'pct' ? Math.max(0, Math.min(100, parsed)) / 100 : Math.max(1, Math.round(parsed));
    if (!Number.isFinite(cur) || Math.abs(cur - value) > 1e-9) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const onText = (s: string) => {
    setText(s);
    const n = parseFloat(s.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    onChange(unit === 'pct' ? Math.max(0, Math.min(100, n)) / 100 : Math.max(1, Math.round(n)));
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <input
        value={text}
        onChange={(e) => onText(e.target.value)}
        inputMode="decimal"
        aria-label="valor"
        style={{ width: 92, textAlign: 'right', fontSize: 17, fontWeight: 800, color: '#002D5F', fontFamily: 'Satoshi, sans-serif', padding: '7px 10px', border: '1.5px solid #1689C4', borderRadius: 8, background: '#fff', outline: 'none' }}
      />
      <span style={{ fontSize: 14, color: '#5b6b7f', fontWeight: 700, minWidth: 46 }}>{unit === 'pct' ? '%' : 'meses'}</span>
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

  useEffect(() => {
    let alive = true;
    loadAssumptions().then((m) => {
      if (alive && m[recId]) { setA({ ...baseAssumptions, ...m[recId] }); setHasOverride(true); }
    });
    return () => { alive = false; };
  }, [recId, baseAssumptions]);

  const margin = useMemo(() => marginFromScenario(inputs, a), [inputs, a]);
  const isBase = eq(a, baseAssumptions);
  const delta = baseMargin > 0 ? margin / baseMargin - 1 : 0;
  const editable = EDITABLE_BY_KIND[inputs.kind];
  const per = cadence === 'acumulado' ? ' (acumulado)' : ' / mes';

  const set = (k: keyof ScenarioAssumptions, v: number) => { setA((p) => ({ ...p, [k]: v })); setSaved(false); };
  const applyPreset = (name: PresetName) => { setA(presetAssumptions(name, baseAssumptions)); setSaved(false); };
  const save = async () => { await saveAssumptions(recId, a); setSaved(true); setHasOverride(true); };
  const reset = async () => { await clearAssumptions(recId); setA(baseAssumptions); setSaved(false); setHasOverride(false); };

  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#8696a7', marginBottom: 8 }}>
        ¿De dónde sale este número? (y ajustalo a lo que vos asumís)
      </div>

      {/* 1) La explicación en criollo, paso a paso */}
      <div className="glass-panel" style={{ padding: '16px 18px' }}>
        <Narrative inp={inputs} a={a} />
        <div style={{ fontSize: 11, color: '#8696a7', marginTop: 12 }}>
          <b style={{ color: '#1689C4' }}>Azul</b> = dato medido (Mixpanel/HubSpot) · <b style={{ color: '#9a6a00' }}>Ámbar</b> = supuesto que podés editar abajo.
        </div>
      </div>

      {/* 2) Comparativo motor → tu escenario */}
      <div className="glass-panel" style={{ marginTop: 10, padding: '14px 16px', display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-end' }}>
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

      {/* 3) Atajos + inputs numéricos libres */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#8696a7', fontWeight: 600 }}>Atajos:</span>
        {(['conservador', 'base', 'optimista'] as PresetName[]).map((pname) => (
          <button key={pname} onClick={() => applyPreset(pname)}
            style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(0,45,95,0.16)', background: '#fff', color: '#002D5F', cursor: 'pointer', textTransform: 'capitalize' }}>
            {pname === 'base' ? 'Base (motor)' : pname}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
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

      {/* 4) Guardar / volver */}
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
        El motor parte de supuestos <b>direccionales</b> (el “recuperable” sale de benchmarks CRO de e-commerce; para una prepaga suele quedar alto). Acá dejás asentado <b>lo que VOS asumís</b>. Se guarda por oportunidad (por ahora, en este navegador).
      </div>
    </section>
  );
}
