// SNAPSHOTS DIARIOS (simulación) — un snapshot por día, del 1 de junio 2026 hasta hoy (30/06).
// "Aloja" la serie diaria que en producción persiste el cron en analytics_snapshots. Acá está
// bakeada y es DETERMINISTA, anclada a los valores reales (Mayo) con la estacionalidad semanal típica.
//
// IMPORTANTE / honestidad: NO es un pull histórico real (Mixpanel/HubSpot no permiten "viajar" al
// estado de un día pasado — HubSpot es estado actual; Mixpanel sería 30 llamadas rate-limited). Es una
// serie simulada que le da datos a la detección (quiebres/pace) y al histórico AHORA; el cron la
// reemplaza con datos reales capturados de acá en adelante.

import type { SnapshotRow } from '../brain/detect';

const DAY_MS = 86_400_000;
const START = '2026-06-01';
const DAYS = 30; // 1→30 de junio

const dayStr = (i: number): string =>
  new Date(new Date(`${START}T00:00:00Z`).getTime() + i * DAY_MS).toISOString().slice(0, 10);
const weekday = (s: string): number => new Date(`${s}T00:00:00Z`).getUTCDay(); // 0=domingo

// Multiplicador de volumen por día de semana (lun-vie alto, finde bajo) → la detección lo desestacionaliza.
const WD_VOL: Record<number, number> = { 0: 0.55, 1: 1.06, 2: 1.10, 3: 1.08, 4: 1.05, 5: 0.95, 6: 0.5 };
// Ruido determinista chico, centrado en ~0.
const noise = (i: number, scale: number): number => (((i * 37) % 11) - 5) * scale;

function buildDailySnapshots(): SnapshotRow[] {
  const rows: SnapshotRow[] = [];
  for (let i = 0; i < DAYS; i++) {
    const day = dayStr(i);
    const wd = weekday(day);
    const trend = 1 + i * 0.002; // leve crecimiento a lo largo del mes
    const entradas = Math.round(1400 * WD_VOL[wd] * trend + noise(i, 12));
    const asociados = Math.round(entradas * 0.028 + noise(i, 1)); // altas completadas
    const cotizadorConversion = +(0.077 + i * 0.0001 + noise(i, 0.0006)).toFixed(4); // bajo la meta (0.12) → pace
    const winRate = +(0.378 + i * 0.0001 + noise(i, 0.0004)).toFixed(4); // bajo la meta (0.45) → pace
    rows.push({
      day,
      summary: { totalEntradas: entradas, asociados, cotizadorConversion },
      payload: {
        funnels: [{ id: 'cotizador', overallConversion: cotizadorConversion }],
        hubspot: { winRate },
      },
    });
  }
  return rows;
}

// Serie diaria lista para consumir (ordenada por día asc, como la espera buildSignals).
export const DAILY_SNAPSHOTS: SnapshotRow[] = buildDailySnapshots();

// Filas para upsert en Supabase (mismo shape que escribe el cron en analytics_snapshots).
export function dailySnapshotRows(): { day: string; source: string; summary: unknown; payload: unknown; created_at: string }[] {
  return DAILY_SNAPSHOTS.map((r) => ({
    day: r.day,
    source: 'snapshot',
    summary: r.summary,
    payload: r.payload,
    created_at: `${r.day}T09:00:00.000Z`,
  }));
}
