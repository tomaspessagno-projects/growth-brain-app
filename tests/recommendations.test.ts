import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getAnalytics, type Analytics } from '../src/lib/mixpanel/analytics';
import { generateRecommendations } from '../src/lib/mixpanel/recommendations';
import { liveHubspot } from './fixtures';

// Hermético: sin credenciales, getAnalytics corre en modo SNAPSHOT (sin red) y es 100% determinista.
const KEYS = ['MIXPANEL_SERVICE_USER', 'MIXPANEL_SERVICE_SECRET', 'HUBSPOT_TOKEN'];
const saved: Record<string, string | undefined> = {};
beforeAll(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterAll(() => {
  for (const k of KEYS) if (saved[k] !== undefined) process.env[k] = saved[k];
});

const rankKey = (r: { tri?: { exploreScore?: number; score: number } }) => r.tri?.exploreScore ?? r.tri?.score ?? 0;

describe('generateRecommendations — modo snapshot (offline, determinista)', () => {
  it('GOLDEN: el ranking y los scores quedan congelados (atrapa regresiones del motor)', async () => {
    const a = await getAnalytics();
    expect(a.source).toBe('snapshot');
    expect(a.hubspot).toBeNull();
    const recs = generateRecommendations(a);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.map((r) => ({ id: r.id, score: Math.round(r.tri!.score) }))).toMatchSnapshot();
  });

  it('es DETERMINISTA: dos corridas dan exactamente el mismo orden y score', async () => {
    const a = await getAnalytics();
    const run = () => generateRecommendations(a).map((r) => [r.id, Math.round(r.tri!.score)]);
    expect(run()).toEqual(run());
  });

  it('INVARIANTES de sanidad sobre cada oportunidad', async () => {
    const a = await getAnalytics();
    const recs = generateRecommendations(a);
    for (const r of recs) {
      const t = r.tri!;
      expect(t).toBeDefined();
      expect(t.score).toBeGreaterThanOrEqual(0);
      expect(t.confidence).toBeGreaterThanOrEqual(0.3);
      expect(t.confidence).toBeLessThanOrEqual(0.95);
      expect(t.effort).toBeGreaterThanOrEqual(1);
      if (t.band) {
        expect(t.band.p10).toBeLessThanOrEqual(t.band.p50);
        expect(t.band.p50).toBeLessThanOrEqual(t.band.p90);
      }
      // un cambio de PROCESO siempre dice a qué proceso económico alimenta
      if (t.changeKind === 'proceso') {
        expect(typeof t.feedsInto).toBe('string');
        expect((t.feedsInto ?? '').length).toBeGreaterThan(0);
      }
    }
  });

  it('queda ORDENADO de mayor a menor por el score de ranking', async () => {
    const a = await getAnalytics();
    const recs = generateRecommendations(a);
    for (let i = 0; i + 1 < recs.length; i++) {
      expect(rankKey(recs[i])).toBeGreaterThanOrEqual(rankKey(recs[i + 1]) - 1e-6);
    }
  });
});

describe('generateRecommendations — con HubSpot vivo', () => {
  it('aparecen las recos comerciales y el loop es PROCESO con valor heredado (no queda sepultado)', async () => {
    const base = await getAnalytics();
    const a: Analytics = { ...base, hubspot: liveHubspot() };
    const recs = generateRecommendations(a);
    const ids = recs.map((r) => r.id);
    expect(ids).toContain('hs-winrate');
    expect(ids).toContain('hs-stock');
    expect(ids).toContain('hs-loop');

    const loop = recs.find((r) => r.id === 'hs-loop')!;
    expect(loop.tri!.changeKind).toBe('proceso');
    expect(loop.tri!.feedsInto).toBeTruthy();
    expect(loop.tri!.score).toBeGreaterThan(0); // hereda urgencia del proceso económico que destraba
  });
});
