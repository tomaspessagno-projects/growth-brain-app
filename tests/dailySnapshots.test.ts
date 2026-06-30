import { describe, it, expect } from 'vitest';
import { DAILY_SNAPSHOTS, dailySnapshotRows } from '../src/lib/history/dailySnapshots';
import { buildSignals } from '../src/lib/brain/detect';

// La serie diaria bakeada (jun 1→30) que "aloja" lo que el cron persiste en analytics_snapshots.
// No es un pull histórico real (ver el comentario del módulo); es determinista y le da datos a la
// detección y al histórico hasta que el cron acumule datos reales. Estos tests fijan su forma.
describe('DAILY_SNAPSHOTS (serie diaria simulada)', () => {
  it('cubre los 30 días de junio, ordenados asc y sin huecos', () => {
    expect(DAILY_SNAPSHOTS).toHaveLength(30);
    expect(DAILY_SNAPSHOTS[0].day).toBe('2026-06-01');
    expect(DAILY_SNAPSHOTS[29].day).toBe('2026-06-30');
    const days = DAILY_SNAPSHOTS.map((r) => r.day);
    expect([...days].sort()).toEqual(days); // ya viene ordenada (como la espera buildSignals)
    expect(new Set(days).size).toBe(30); // sin duplicados
  });

  it('cada fila trae las métricas que mira la detección', () => {
    for (const r of DAILY_SNAPSHOTS) {
      expect(r.summary?.totalEntradas).toBeGreaterThan(0);
      expect(r.summary?.asociados).toBeGreaterThan(0);
      expect(r.payload?.funnels?.[0]?.id).toBe('cotizador');
      expect(typeof r.payload?.funnels?.[0]?.overallConversion).toBe('number');
      expect(typeof r.payload?.hubspot?.winRate).toBe('number');
    }
  });

  it('es determinista (mismo build, mismos valores)', () => {
    const a = DAILY_SNAPSHOTS.map((r) => r.summary?.totalEntradas);
    const b = dailySnapshotRows().map((r) => (r.summary as { totalEntradas?: number }).totalEntradas);
    expect(b).toEqual(a);
  });

  it('genera señales de RITMO: cotizador y cierre vienen bajo meta', () => {
    const signals = buildSignals(DAILY_SNAPSHOTS);
    const pace = signals.filter((s) => s.kind === 'pace');
    expect(pace.length).toBeGreaterThanOrEqual(2);
    expect(pace.some((s) => s.metric === 'Conversión cotizador')).toBe(true);
    expect(pace.some((s) => s.metric === 'Cierre de ventas')).toBe(true);
    // Todas las señales de ritmo apuntan hacia abajo (por debajo de meta).
    expect(pace.every((s) => s.direction === 'down')).toBe(true);
  });

  it('las filas para Supabase tienen el shape del cron (day/source/summary/payload/created_at)', () => {
    const rows = dailySnapshotRows();
    expect(rows).toHaveLength(30);
    for (const r of rows) {
      expect(r.source).toBe('snapshot');
      expect(r.day).toMatch(/^2026-06-\d{2}$/);
      expect(r.created_at).toBe(`${r.day}T09:00:00.000Z`);
      expect(r.summary).toBeTruthy();
      expect(r.payload).toBeTruthy();
    }
  });
});
