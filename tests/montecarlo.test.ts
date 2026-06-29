import { describe, it, expect } from 'vitest';
import { simulateMargin } from '../src/lib/triangulation/montecarlo';
import type { Recommendation } from '../src/lib/mixpanel/recommendations';
import type { PriorMap } from '../src/lib/triangulation/priors';
import { makeAnalytics, liveHubspot } from './fixtures';

const rec = (id: string, discipline: Recommendation['discipline'] = 'diseno'): Recommendation => ({
  id, priority: 'alta', discipline, owner: 'producto', tag: 'x', title: '', detail: '',
});

describe('simulateMargin — banda probabilística (Monte Carlo seedeado)', () => {
  it('es REPRODUCIBLE: mismo input → banda idéntica (RNG por rec.id)', () => {
    const a = makeAnalytics();
    const b1 = simulateMargin(rec('imp-cot-design'), a);
    const b2 = simulateMargin(rec('imp-cot-design'), a);
    expect(b1).not.toBeNull();
    expect(b1).toEqual(b2);
  });

  it('respeta el orden de cuantiles P10 ≤ P50 ≤ P90 y corre N=2000', () => {
    const b = simulateMargin(rec('imp-cot-design'), makeAnalytics())!;
    expect(b.p10).toBeLessThanOrEqual(b.p50);
    expect(b.p50).toBeLessThanOrEqual(b.p90);
    expect(b.p10).toBeGreaterThan(0);
    expect(b.n).toBe(2000);
    expect(typeof b.robust).toBe('boolean');
    expect(typeof b.dominantDriver).toBe('string');
  });

  it('devuelve null para una reco sin modelo económico (no inventa números)', () => {
    expect(simulateMargin(rec('dead', 'desarrollo'), makeAnalytics())).toBeNull();
    expect(simulateMargin(rec('live', 'desarrollo'), makeAnalytics())).toBeNull();
  });

  it('NO simula banda para channel-best (ya no tiene margen cuantificado → cero falsa esperanza)', () => {
    expect(simulateMargin(rec('channel-best', 'datos'), makeAnalytics())).toBeNull();
  });

  it('cubre los tipos comerciales (winrate / stock) con HubSpot vivo', () => {
    const a = makeAnalytics({ hubspot: liveHubspot() });
    expect(simulateMargin(rec('hs-winrate', 'producto'), a)).not.toBeNull();
    expect(simulateMargin(rec('hs-stock', 'producto'), a)).not.toBeNull();
  });

  it('un prior aprendido más alto desplaza la mediana hacia arriba', () => {
    const a = makeAnalytics();
    const low = simulateMargin(rec('imp-cot-design'), a)!; // M0 formularios 0.30
    const priors: PriorMap = {
      formularios: { family: 'formularios', recoveryMean: 0.6, n: 5, validated: 5, refuted: 0, inconclusive: 0, observations: [0.6], updatedAt: '' },
    };
    const high = simulateMargin(rec('imp-cot-design'), a, priors)!;
    expect(high.p50).toBeGreaterThan(low.p50);
  });
});
