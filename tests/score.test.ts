import { describe, it, expect } from 'vitest';
import { scoreRecommendation } from '../src/lib/triangulation/score';
import type { Recommendation } from '../src/lib/mixpanel/recommendations';
import type { PriorMap } from '../src/lib/triangulation/priors';
import { ltvArs, ECON_ASSUMPTIONS } from '../src/lib/economics/model';
import { WINRATE_TARGET } from '../src/lib/mixpanel/benchmarks';
import { ARPU_MENSUAL_ARS } from '../src/lib/mixpanel/snapshot';
import { makeAnalytics, liveHubspot } from './fixtures';

const DATO_CAPITA = ECON_ASSUMPTIONS.datoToCapitaPct.value; // 0.06
const rec = (over: Partial<Recommendation> & Pick<Recommendation, 'id'>): Recommendation => ({
  priority: 'alta', discipline: 'producto', owner: 'producto', tag: 'x', title: '', detail: '', ...over,
});

describe('confianza — base / Playbook / aprendido, clampeada a [0.30, 0.95]', () => {
  it('regla determinista sin respaldo: 0.50', () => {
    const t = scoreRecommendation(rec({ id: 'imp-cot-design', discipline: 'diseno' }), makeAnalytics());
    expect(t.confidence).toBeCloseTo(0.5, 10);
  });
  it('respaldada por el Playbook: +0.20 → 0.70', () => {
    const t = scoreRecommendation(rec({ id: 'imp-cot-design', discipline: 'diseno', backedBy: { id: 'r-form-fields', statement: '' } }), makeAnalytics());
    expect(t.confidence).toBeCloseTo(0.7, 10);
  });
  it('experimentos de la familia suman confianza (Capa 4)', () => {
    const priors: PriorMap = {
      formularios: { family: 'formularios', recoveryMean: 0.4, n: 2, validated: 2, refuted: 0, inconclusive: 0, observations: [0.4, 0.4], updatedAt: '' },
    };
    const t = scoreRecommendation(rec({ id: 'imp-cot-design', discipline: 'diseno' }), makeAnalytics(), priors);
    // 0.50 base + boost(2 val/2) = 0.2·0.4·1 = 0.08 → 0.58
    expect(t.confidence).toBeCloseTo(0.58, 10);
  });
});

describe('imp-cot-design — la cifra es INGRESO POR MES (socios × cuota), no LTV', () => {
  it('sin priors usa el M0 de formularios (0.30) y es económico', () => {
    const a = makeAnalytics();
    const t = scoreRecommendation(rec({ id: 'imp-cot-design', discipline: 'diseno' }), a);
    const leak = a.funnels[0].leakDropCount!;
    const socios = leak * 0.3 * DATO_CAPITA;
    const expected = socios * ARPU_MENSUAL_ARS; // ingreso/mes = socios × cuota
    expect(t.marginAtStakeArs).toBeCloseTo(expected, 2);
    expect(t.cadence).toBe('mensual');
    expect(t.changeKind).toBe('economico');
    expect(t.feedsInto).toBeUndefined();
    // el valor de vida (LTV) queda como dato secundario
    expect(t.lifetimeArs).toBeCloseTo(socios * ltvArs(), 2);
    // score = ingreso/mes · conf · urgencia / esfuerzo  (urgencia 1.3, esfuerzo diseño=2)
    expect(t.score).toBeCloseTo((expected * 0.5 * 1.3) / 2, 2);
  });
  it('con prior aprendido usa esa recovery', () => {
    const priors: PriorMap = {
      formularios: { family: 'formularios', recoveryMean: 0.4, n: 2, validated: 2, refuted: 0, inconclusive: 0, observations: [0.4, 0.4], updatedAt: '' },
    };
    const a = makeAnalytics();
    const t = scoreRecommendation(rec({ id: 'imp-cot-design', discipline: 'diseno' }), a, priors);
    expect(t.marginAtStakeArs).toBeCloseTo(a.funnels[0].leakDropCount! * 0.4 * DATO_CAPITA * ARPU_MENSUAL_ARS, 2);
  });
});

describe('HubSpot — ingreso/mes que se destraba del stock (mensualizado /24 en el score)', () => {
  it('hs-winrate: decididos × brecha = socios; × cuota', () => {
    const a = makeAnalytics({ hubspot: liveHubspot() });
    const h = a.hubspot!;
    const t = scoreRecommendation(rec({ id: 'hs-winrate' }), a);
    const decided = h.won + h.lost; // 8000
    const gap = Math.max(0, WINRATE_TARGET - h.winRate!); // 0.075
    const expected = decided * gap * ARPU_MENSUAL_ARS; // 600 socios · cuota
    expect(t.marginAtStakeArs).toBeCloseTo(expected, 0);
    expect(t.cadence).toBe('acumulado');
    expect(t.changeKind).toBe('economico');
    expect(t.score).toBeCloseTo((expected / 24 * 0.5 * 1.2) / 2, 0);
  });
  it('hs-stock: atascados × cierre = socios; × cuota', () => {
    const a = makeAnalytics({ hubspot: liveHubspot() });
    const h = a.hubspot!;
    const t = scoreRecommendation(rec({ id: 'hs-stock', discipline: 'producto' }), a);
    expect(t.marginAtStakeArs).toBeCloseTo(h.biggestOpenStage!.count * h.winRate! * ARPU_MENSUAL_ARS, 0);
    expect(t.cadence).toBe('acumulado');
  });
});

describe('canales — meticulosidad con la plata (sin falsa esperanza)', () => {
  it('channel-junk NO reclama pesos: es higiene del dato (proceso), no plata recuperable', () => {
    const t = scoreRecommendation(rec({ id: 'channel-junk', discipline: 'datos' }), makeAnalytics());
    expect(t.marginAtStakeArs).toBeNull(); // <- nada de "$44M reasignables"
    expect(t.changeKind).toBe('proceso');
    expect(t.feedsInto).toContain('conversión');
    // y la honestidad lo dice explícito
    expect(t.honesty.join(' ')).toMatch(/no es plata recuperable/i);
  });

  it('channel-best es palanca real pero SIN $ cuantificado (no se infla un número)', () => {
    const t = scoreRecommendation(rec({ id: 'channel-best', discipline: 'datos' }), makeAnalytics());
    expect(t.marginAtStakeArs).toBeNull();
    expect(t.changeKind).toBe('economico');
    expect(t.honesty.join(' ')).toMatch(/sin \$ cuantificado/i);
  });
});

describe('segundo eje — changeKind económico vs proceso', () => {
  it('hs-loop es PROCESO con feedsInto (habilitador, sin $ propio)', () => {
    const t = scoreRecommendation(rec({ id: 'hs-loop', discipline: 'desarrollo' }), makeAnalytics({ hubspot: liveHubspot() }));
    expect(t.changeKind).toBe('proceso');
    expect(t.feedsInto && t.feedsInto.length).toBeGreaterThan(0);
    expect(t.marginAtStakeArs).toBeNull();
  });
  it('una reco de VOZ es proceso y alimenta la experiencia del socio', () => {
    const t = scoreRecommendation(rec({ id: 'voice-seguimiento' }), makeAnalytics());
    expect(t.changeKind).toBe('proceso');
    expect(t.feedsInto).toContain('socio');
  });
});
