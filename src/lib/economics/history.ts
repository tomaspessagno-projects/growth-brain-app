// Histórico mensual del PELG (#4): cada 1° del mes se carga un snapshot y se ve la TENDENCIA.
// El valor no es parsear el PDF (es de imágenes, frágil) sino la serie temporal: ¿subió el CAC?,
// ¿cambió el mix de canales?, ¿un experimento movió la economía? Hoy en localStorage; prod → Supabase.

import { MARKETING } from '../marketing/unitEconomics';

export interface PelgChannelSnap {
  label: string;
  spendArs: number;
}

export interface PelgMonth {
  month: string; // 'YYYY-MM'
  label: string; // 'Mayo 2026'
  totalSpendArs: number; // inversión lead-gen
  totalLeads: number;
  blendedCacArs: number; // = totalSpend / leads
  channels: PelgChannelSnap[];
  pdfName?: string; // PDF subido de referencia
  source: 'seed' | 'manual';
}

const KEY = 'gb_pelg_history';

// El primer punto de la serie = el PELG de Mayo que ya teníamos.
export function seedMonth(): PelgMonth {
  return {
    month: '2026-05',
    label: MARKETING.period,
    totalSpendArs: MARKETING.totalSpendArs,
    totalLeads: MARKETING.totalLeads,
    blendedCacArs: MARKETING.blendedCacArs,
    channels: MARKETING.channels.map((c) => ({ label: c.label, spendArs: c.spendArs })),
    source: 'seed',
  };
}

export function loadHistory(): PelgMonth[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list: PelgMonth[] = raw ? JSON.parse(raw) : [];
    if (!list.length) return [seedMonth()];
    if (!list.some((m) => m.month === '2026-05')) list.push(seedMonth());
    return list.sort((a, b) => a.month.localeCompare(b.month));
  } catch {
    return [seedMonth()];
  }
}

export function saveHistory(list: PelgMonth[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

// Agrega (o reemplaza) un mes y devuelve la serie ordenada.
export function addMonth(m: PelgMonth): PelgMonth[] {
  const list = loadHistory().filter((x) => x.month !== m.month);
  list.push(m);
  list.sort((a, b) => a.month.localeCompare(b.month));
  saveHistory(list);
  return list;
}

export interface MonthDelta {
  cacPct: number | null;
  spendPct: number | null;
  leadsPct: number | null;
}

export function deltaVsPrev(list: PelgMonth[], idx: number): MonthDelta | null {
  if (idx <= 0) return null;
  const cur = list[idx];
  const prev = list[idx - 1];
  const d = (c: number, p: number) => (p > 0 ? (c - p) / p : null);
  return {
    cacPct: d(cur.blendedCacArs, prev.blendedCacArs),
    spendPct: d(cur.totalSpendArs, prev.totalSpendArs),
    leadsPct: d(cur.totalLeads, prev.totalLeads),
  };
}

// Mes 'YYYY-MM' → etiqueta 'Mayo 2026'.
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m >= 1 && m <= 12 ? `${MESES[m - 1]} ${y}` : month;
}
