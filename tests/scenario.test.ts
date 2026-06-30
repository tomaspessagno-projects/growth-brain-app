import { describe, it, expect } from 'vitest';
import {
  marginFromScenario,
  monthlyRevenueFromScenario,
  convertedSocios,
  ltvFromScenario,
  engineAssumptions,
  presetAssumptions,
  EDITABLE_BY_KIND,
  type ScenarioAssumptions,
} from '../src/lib/economics/scenario';
import { scoreRecommendation } from '../src/lib/triangulation/score';
import type { Recommendation } from '../src/lib/mixpanel/recommendations';
import { ARPU_MENSUAL_ARS } from '../src/lib/mixpanel/snapshot';
import { makeAnalytics, liveHubspot } from './fixtures';

const rec = (id: string, discipline: Recommendation['discipline'] = 'diseno'): Recommendation => ({
  id, priority: 'alta', discipline, owner: 'producto', tag: 'x', title: '', detail: '',
});

describe('scenario — la fórmula de plata compartida', () => {
  it('LTV = ARPU × permanencia × margen', () => {
    expect(ltvFromScenario(24, 0.18)).toBe(90_000 * 24 * 0.18); // 388.800
  });

  it('leak: fuga × recuperable × factor × dato→cápita × LTV', () => {
    const a: ScenarioAssumptions = { recovery: 0.3, datoCapita: 0.06, retentionMonths: 24, marginPct: 0.18 };
    const m = marginFromScenario({ kind: 'leak', leak: 36304, recMult: 1 }, a);
    expect(m).toBeCloseTo(36304 * 0.3 * 1 * 0.06 * ltvFromScenario(24, 0.18), 2);
  });

  it('INGRESO/MES = socios × cuota ($90.000) — la cifra que pidió el usuario', () => {
    const a: ScenarioAssumptions = { recovery: 0.3, datoCapita: 0.06, retentionMonths: 24, marginPct: 0.18 };
    const inp = { kind: 'leak' as const, leak: 36304, recMult: 1 };
    const socios = convertedSocios(inp, a); // 36304 × 0.3 × 0.06 ≈ 653
    expect(monthlyRevenueFromScenario(inp, a)).toBeCloseTo(socios * ARPU_MENSUAL_ARS, 2);
    // y NO lleva ni permanencia ni margen (eso es el LTV, otra cosa)
    expect(monthlyRevenueFromScenario(inp, a)).toBeCloseTo(36304 * 0.3 * 0.06 * 90_000, 2);
  });

  it('bajar el recuperable baja el ingreso/mes proporcionalmente', () => {
    const base = engineAssumptions(0.3);
    const inp = { kind: 'leak' as const, leak: 36304, recMult: 1 };
    const at30 = monthlyRevenueFromScenario(inp, base);
    const at10 = monthlyRevenueFromScenario(inp, { ...base, recovery: 0.1 });
    expect(at10).toBeCloseTo(at30 / 3, 2); // 10% es un tercio de 30%
  });

  it('winrate/stock: ingreso/mes = socios (decididos×brecha / atascados×cierre) × cuota', () => {
    const a = engineAssumptions();
    expect(monthlyRevenueFromScenario({ kind: 'winrate', decided: 8000, gap: 0.075 }, a)).toBeCloseTo(8000 * 0.075 * ARPU_MENSUAL_ARS, 0);
    expect(monthlyRevenueFromScenario({ kind: 'stock', stock: 13485, winRate: 0.375 }, a)).toBeCloseTo(13485 * 0.375 * ARPU_MENSUAL_ARS, 0);
  });
});

describe('scenario — presets', () => {
  it("'base' devuelve los supuestos del motor; conservador < base < optimista en recuperable", () => {
    const base = engineAssumptions(0.3);
    expect(presetAssumptions('base', base)).toEqual(base);
    expect(presetAssumptions('conservador', base).recovery).toBeLessThan(base.recovery);
    expect(presetAssumptions('optimista', base).recovery).toBeGreaterThan(base.recovery);
  });
  it('clampea las fracciones a [0, 0.95]', () => {
    const hi = presetAssumptions('optimista', { recovery: 0.9, datoCapita: 0.9, retentionMonths: 24, marginPct: 0.9 });
    expect(hi.recovery).toBeLessThanOrEqual(0.95);
    expect(hi.marginPct).toBeLessThanOrEqual(0.95);
  });
});

describe('scenario — el motor expone lo necesario para que el panel reproduzca su cifra', () => {
  it('imp-cot-design: marginAtStakeArs == ingreso/mes; lifetimeArs == valor de vida', () => {
    const t = scoreRecommendation(rec('imp-cot-design'), makeAnalytics());
    expect(t.marginInputs).toBeDefined();
    expect(t.assumptions).toBeDefined();
    // la cifra principal del motor ES el ingreso/mes que recalcula el panel
    expect(monthlyRevenueFromScenario(t.marginInputs!, t.assumptions!)).toBeCloseTo(t.marginAtStakeArs!, 2);
    // y el LTV queda como dato secundario
    expect(marginFromScenario(t.marginInputs!, t.assumptions!)).toBeCloseTo(t.lifetimeArs!, 2);
    expect(EDITABLE_BY_KIND[t.marginInputs!.kind]).toContain('recovery');
  });

  it('hs-winrate y hs-stock también exponen inputs reproducibles (ingreso/mes)', () => {
    const a = makeAnalytics({ hubspot: liveHubspot() });
    for (const id of ['hs-winrate', 'hs-stock']) {
      const t = scoreRecommendation(rec(id, 'producto'), a);
      expect(t.marginInputs, id).toBeDefined();
      expect(monthlyRevenueFromScenario(t.marginInputs!, t.assumptions!), id).toBeCloseTo(t.marginAtStakeArs!, 0);
    }
  });

  it('una reco SIN $ (channel-junk, proceso) no expone marginInputs', () => {
    const t = scoreRecommendation(rec('channel-junk', 'datos'), makeAnalytics());
    expect(t.marginInputs).toBeUndefined();
  });
});
