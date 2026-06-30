"use client";
import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import styles from '../funnel/funnel.module.css';
import { MONTHLY, FUNNEL_LABEL, trendDelta, type MonthPoint } from '@/lib/history/monthly';

const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');
const fmtArs = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
const fmtArsK = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : `$${Math.round(n / 1e3)}k`);

const C = { axis: '#8696a7', grid: '#eef2f7', blue: '#1689C4', navy: '#002D5F', green: '#15803d', orange: '#ff7a59' };

function DeltaBadge({ d }: { d: number }) {
  const up = d >= 0;
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color: up ? C.green : '#b4232a' }}>
      {up ? '↑' : '↓'} {Math.abs(d * 100).toFixed(0)}% en el trimestre
    </span>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className={`glass-panel ${styles.card}`} style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#102A45' }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: '#8696a7', marginBottom: 8 }}>{sub}</div>}
      <div style={{ width: '100%', height: 200, marginTop: 6 }}>{children}</div>
    </section>
  );
}

const chip = (active: boolean): React.CSSProperties => ({
  fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
  border: active ? '1px solid #002D5F' : '1px solid rgba(0,45,95,0.16)',
  background: active ? '#002D5F' : '#fff', color: active ? '#fff' : '#3a4a5c',
});

export default function HistoricoPage() {
  const [sel, setSel] = useState<string>('cotizador');
  const convData = MONTHLY.map((m) => ({ label: m.label, value: m.funnelConv[sel] ?? 0 }));
  const data = (pick: (m: MonthPoint) => number) => MONTHLY.map((m) => ({ label: m.label, value: pick(m) }));

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Histórico</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Últimos 3 meses — cómo evolucionó cada métrica de cada herramienta para comparar el desempeño.
          </p>
        </div>
      </header>

      {/* Conversión por embudo (Mixpanel) */}
      <section>
        <h3 className={styles.sectionTitle}>Conversión por embudo · Mixpanel</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {Object.keys(FUNNEL_LABEL).map((id) => (
            <button key={id} style={chip(sel === id)} onClick={() => setSel(id)}>{FUNNEL_LABEL[id]}</button>
          ))}
        </div>
        <section className={`glass-panel ${styles.card}`} style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#102A45' }}>{FUNNEL_LABEL[sel]} · conversión total (visita → fin)</span>
            <DeltaBadge d={trendDelta((m) => m.funnelConv[sel] ?? 0)} />
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={convData} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" stroke={C.axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={C.axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => pct(v, 0)} width={48} />
                <Tooltip formatter={(v) => [pct(Number(v), 1), 'Conversión']} />
                <Line type="monotone" dataKey="value" stroke={C.blue} strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </section>

      {/* Comercial + PELG + NPS */}
      <h3 className={styles.sectionTitle}>Comercial, inversión y satisfacción</h3>
      <div className={styles.grid}>
        <ChartCard title="Cierre de ventas · HubSpot" sub="% de negocios decididos que se ganan">
          <ResponsiveContainer>
            <LineChart data={data((m) => m.winRate)} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" stroke={C.axis} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={C.axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => pct(v, 0)} width={42} domain={[0.2, 0.5]} />
              <Tooltip formatter={(v) => [pct(Number(v), 1), 'Cierre']} />
              <Line type="monotone" dataKey="value" stroke={C.green} strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Leads por mes · PELG" sub="conversiones totales (Meta + Google)">
          <ResponsiveContainer>
            <BarChart data={data((m) => m.leads)} margin={{ top: 8, right: 16, bottom: 4, left: -4 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" stroke={C.axis} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={C.axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} width={36} />
              <Tooltip formatter={(v) => [fmt(Number(v)), 'Leads']} />
              <Bar dataKey="value" fill={C.blue} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Costo por lead · PELG" sub="inversión / leads — cuanto más bajo, mejor">
          <ResponsiveContainer>
            <LineChart data={data((m) => m.cpl)} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" stroke={C.axis} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={C.axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => fmtArsK(v)} width={48} />
              <Tooltip formatter={(v) => [fmtArs(Number(v)), 'CPL']} />
              <Line type="monotone" dataKey="value" stroke={C.orange} strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="NPS · Voz del cliente" sub="satisfacción direccional">
          <ResponsiveContainer>
            <LineChart data={data((m) => m.nps)} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" stroke={C.axis} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={C.axis} fontSize={12} tickLine={false} axisLine={false} width={36} domain={[40, 55]} />
              <Tooltip formatter={(v) => [Number(v), 'NPS']} />
              <Line type="monotone" dataKey="value" stroke={C.navy} strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={{ fontSize: 11.5, color: '#8696a7', marginTop: 14, lineHeight: 1.5 }}>
        Serie de simulación (Mayo anclado al snapshot real; Marzo/Abril previos + datos reales de PELG). En producción se llena solo con el barrido diario.
      </div>
    </div>
  );
}
