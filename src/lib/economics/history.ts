// Histórico mensual del PELG (#4) — híbrido Supabase / localStorage.
// Si hay sesión → tabla `pelg_history` (compartido); si no → localStorage (dev local).
// El valor es la serie temporal: ¿subió el CAC?, ¿cambió el mix?, ¿un experimento movió la economía?

import { MARKETING } from '../marketing/unitEconomics';
import { supabase } from '@/utils/supabase/client';
import { hasSession } from '../store/session';

export interface PelgChannelSnap {
  label: string;
  spendArs: number;
}

export interface PelgMonth {
  month: string; // 'YYYY-MM'
  label: string;
  totalSpendArs: number;
  totalLeads: number;
  blendedCacArs: number;
  channels: PelgChannelSnap[];
  pdfName?: string;
  source: 'seed' | 'manual';
}

const LS = 'gb_pelg_history';
const TABLE = 'pelg_history';

// El primer punto de la serie = el PELG de Mayo que ya teníamos (no se persiste, se muestra).
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

type Row = Record<string, unknown>;
function toRow(m: PelgMonth): Row {
  return {
    month: m.month, label: m.label, total_spend_ars: m.totalSpendArs, total_leads: m.totalLeads,
    blended_cac_ars: m.blendedCacArs, channels: m.channels, pdf_name: m.pdfName ?? null, source: m.source,
  };
}
function fromRow(r: Row): PelgMonth {
  return {
    month: String(r.month), label: String(r.label ?? r.month), totalSpendArs: Number(r.total_spend_ars ?? 0),
    totalLeads: Number(r.total_leads ?? 0), blendedCacArs: Number(r.blended_cac_ars ?? 0),
    channels: (r.channels as PelgChannelSnap[]) ?? [], pdfName: r.pdf_name ? String(r.pdf_name) : undefined,
    source: (r.source as 'seed' | 'manual') ?? 'manual',
  };
}

function withSeed(list: PelgMonth[]): PelgMonth[] {
  const out = list.some((m) => m.month === '2026-05') ? [...list] : [...list, seedMonth()];
  return out.sort((a, b) => a.month.localeCompare(b.month));
}

function lsLoad(): PelgMonth[] {
  try {
    const raw = localStorage.getItem(LS);
    const list: PelgMonth[] = raw ? JSON.parse(raw) : [];
    return withSeed(list);
  } catch {
    return [seedMonth()];
  }
}

export async function loadHistory(): Promise<PelgMonth[]> {
  if (await hasSession()) {
    const { data, error } = await supabase.from(TABLE).select('*').order('month');
    if (!error && data) return withSeed((data as Row[]).map(fromRow));
  }
  return lsLoad();
}

// Agrega (o reemplaza) un mes y devuelve la serie ordenada.
export async function addMonth(m: PelgMonth): Promise<PelgMonth[]> {
  if (await hasSession()) {
    await supabase.from(TABLE).upsert(toRow(m));
    return loadHistory();
  }
  const list = lsLoad().filter((x) => x.month !== m.month && x.source !== 'seed');
  list.push(m);
  try { localStorage.setItem(LS, JSON.stringify(list)); } catch { /* noop */ }
  return withSeed(list);
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

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m >= 1 && m <= 12 ? `${MESES[m - 1]} ${y}` : month;
}
