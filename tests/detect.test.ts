import { describe, it, expect } from 'vitest';
import { median, deseasonalizeByWeekday, buildSignals, type SnapshotRow } from '../src/lib/brain/detect';
import { dayStr, weekday, entradasRow } from './fixtures';

// Patrón semanal fuerte: fin de semana bajo, días hábiles altos (por día de semana real, 0=domingo).
const WK: Record<number, number> = { 0: 300, 1: 1000, 2: 1100, 3: 1050, 4: 1080, 5: 1020, 6: 320 };

describe('median', () => {
  it('impar y par', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
  it('vacío → 0', () => expect(median([])).toBe(0));
});

describe('deseasonalizeByWeekday', () => {
  it('aplana el ciclo semanal (la dispersión cae drásticamente)', () => {
    const pts = Array.from({ length: 28 }, (_, i) => {
      const day = dayStr('2026-01-01', i);
      return { day, value: WK[weekday(day)] };
    });
    const raw = pts.map((p) => p.value);
    const des = deseasonalizeByWeekday(pts);
    const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
    expect(spread(raw)).toBeGreaterThan(700); // 1100 − 300
    expect(spread(des)).toBeLessThan(spread(raw) * 0.05); // queda casi plano
  });

  it('sin 2 semanas de datos, devuelve la serie cruda intacta', () => {
    const pts = Array.from({ length: 10 }, (_, i) => ({ day: dayStr('2026-01-01', i), value: 100 + i }));
    expect(deseasonalizeByWeekday(pts)).toEqual(pts.map((p) => p.value));
  });

  it('si la mediana global es 0, no toca nada', () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ day: dayStr('2026-01-01', i), value: 0 }));
    expect(deseasonalizeByWeekday(pts)).toEqual(pts.map((p) => p.value));
  });
});

describe('buildSignals — quiebres', () => {
  it('detecta un salto real fuera de rango (no cíclico)', () => {
    const rows: SnapshotRow[] = Array.from({ length: 15 }, (_, i) =>
      entradasRow(dayStr('2026-01-01', i), i < 14 ? 1000 + (i % 5) * 10 : 5000),
    );
    const sig = buildSignals(rows).find((s) => s.metric === 'Entradas a embudos' && s.kind === 'quiebre');
    expect(sig).toBeDefined();
    expect(sig!.direction).toBe('up');
  });

  it('NO grita por el ciclo semanal normal (lo desestacionaliza)', () => {
    const rows: SnapshotRow[] = Array.from({ length: 28 }, (_, i) => {
      const day = dayStr('2026-01-01', i);
      return entradasRow(day, WK[weekday(day)]); // patrón semanal, sin anomalía
    });
    const sig = buildSignals(rows).find((s) => s.metric === 'Entradas a embudos' && s.kind === 'quiebre');
    expect(sig).toBeUndefined();
  });

  it('SÍ detecta una caída real aunque haya estacionalidad semanal', () => {
    const noise = (i: number) => ((i * 53) % 13) - 6; // ±6, varía por índice → MAD>0 tras desestacionalizar
    const rows: SnapshotRow[] = Array.from({ length: 28 }, (_, i) => {
      const day = dayStr('2026-01-01', i);
      const base = WK[weekday(day)] + noise(i);
      // el último día se desploma a un 10% de lo normal de SU día de semana
      return entradasRow(day, i === 27 ? Math.round(WK[weekday(day)] * 0.1) : base);
    });
    const sig = buildSignals(rows).find((s) => s.metric === 'Entradas a embudos' && s.kind === 'quiebre');
    expect(sig).toBeDefined();
    expect(sig!.direction).toBe('down');
  });
});

describe('buildSignals — pace vs meta', () => {
  it('marca cuando el ritmo viene por debajo de la meta', () => {
    const rows: SnapshotRow[] = Array.from({ length: 10 }, (_, i) => ({
      day: dayStr('2026-01-01', i),
      summary: {},
      payload: { funnels: [{ id: 'cotizador', overallConversion: 0.06 }] }, // meta cotizador 0.12
    }));
    const sig = buildSignals(rows).find((s) => s.metric === 'Conversión cotizador' && s.kind === 'pace');
    expect(sig).toBeDefined();
    expect(sig!.direction).toBe('down');
  });
});
