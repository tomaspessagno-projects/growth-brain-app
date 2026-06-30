import { describe, it, expect } from 'vitest';
import {
  marginFromScenario,
  ltvFromScenario,
  engineAssumptions,
  presetAssumptions,
  EDITABLE_BY_KIND,
  type ScenarioAssumptions,
} from '../src/lib/economics/scenario';
import { scoreRecommendation } from '../src/lib/triangulation/score';
import type { Recommendation } from '../src/lib/mixpanel/recommendations';
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

  it('bajar el recuperable baja la cifra proporcionalmente (lo que pidió el usuario)', () => {
    const base = engineAssumptions(0.3);
    const inp = { kind: 'leak' as const, leak: 36304, recMult: 1 };
    const at30 = marginFromScenario(inp, base);
    const at10 = marginFromScenario(inp, { ...base, recovery: 0.1 });
    expect(at10).toBeCloseTo(at30 / 3, 2); // 10% es un tercio de 30%
  });

  it('winrate y stock usan decididos×brecha×LTV y stock×cierre×LTV', () => {
    const a = engineAssumptions();
    expect(marginFromScenario({ kind: 'winrate', decided: 8000, gap: 0.075 }, a)).toBeCloseTo(8000 * 0.075 * ltvFromScenario(24, 0.18), 0);
    expect(marginFromScenario({ kind: 'stock', stock: 13485, winRate: 0.375 }, a)).toBeCloseTo(13485 * 0.375 * ltvFromScenario(24, 0.18), 0);
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
  it('imp-cot-design: marginFromScenario(inputs, assumptions) == marginAtStakeArs del motor', () => {
    const t = scoreRecommendation(rec('imp-cot-design'), makeAnalytics());
    expect(t.marginInputs).toBeDefined();
    expect(t.assumptions).toBeDefined();
    expect(marginFromScenario(t.marginInputs!, t.assumptions!)).toBeCloseTo(t.marginAtStakeArs!, 2);
    expect(EDITABLE_BY_KIND[t.marginInputs!.kind]).toContain('recovery');
  });

  it('hs-winrate y hs-stock también exponen inputs reproducibles', () => {
    const a = makeAnalytics({ hubspot: liveHubspot() });
    for (const id of ['hs-winrate', 'hs-stock']) {
      const t = scoreRecommendation(rec(id, 'producto'), a);
      expect(t.marginInputs, id).toBeDefined();
      expect(marginFromScenario(t.marginInputs!, t.assumptions!), id).toBeCloseTo(t.marginAtStakeArs!, 0);
    }
  });

  it('una reco SIN $ (channel-junk, proceso) no expone marginInputs', () => {
    const t = scoreRecommendation(rec('channel-junk', 'datos'), makeAnalytics());
    expect(t.marginInputs).toBeUndefined();
  });
});
