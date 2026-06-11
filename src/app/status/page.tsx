"use client";
import React, { useEffect, useState, useCallback } from 'react';
import styles from '../funnel/funnel.module.css';

interface Service { name: string; kind: string; ok: boolean; status: number; detail: string; ms: number }
interface StatusResp { asOf: string; services: Service[] }

export default function StatusPage() {
  const [data, setData] = useState<StatusResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    fetch('/api/status').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setData(d); }).catch(() => {}).finally(() => { setLoading(false); setBusy(false); });
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id); }, [load]);

  const color = (s: Service) => (s.ok ? '#17A673' : s.status === 429 ? '#D38A18' : '#C25B45');
  const label = (s: Service) => (s.ok ? 'Operativo' : s.status === 429 ? 'Rate limited' : 'Con problemas');

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Status</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Estado en vivo de las integraciones — para saber si algo falla o está rate-limiteado.</p>
        </div>
        <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} onClick={load} disabled={busy}>{busy ? 'Verificando…' : '↻ Refrescar'}</button>
      </header>

      {loading && !data ? (
        <div className={styles.signalSub} style={{ marginTop: 20 }}>Verificando integraciones…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginTop: 8 }}>
          {(data?.services || []).map((s) => (
            <div key={s.name} className="glass-panel sd-lift" style={{ padding: 18, borderLeft: `4px solid ${color(s)}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#002D5F', fontFamily: 'Satoshi, sans-serif' }}>{s.name}</div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: color(s) }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: color(s), animation: s.ok ? 'sd-pulse 2s infinite' : 'none' }} />
                  {label(s)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#8696a7', marginTop: 2 }}>{s.kind}</div>
              <div style={{ fontSize: 13.5, color: '#3a4a5c', marginTop: 14 }}>{s.detail}</div>
              <div style={{ display: 'flex', gap: 18, marginTop: 12, fontSize: 11.5, color: '#5b6b7f', fontVariantNumeric: 'tabular-nums' }}>
                <span>HTTP {s.status || '—'}</span>
                <span>⏱ {s.ms} ms</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && <div style={{ fontSize: 11, color: '#8696a7', marginTop: 16 }}>Última verificación: {new Date(data.asOf).toLocaleTimeString('es-AR')} · se refresca cada 20 s</div>}
      <div style={{ marginTop: 16, fontSize: 11.5, color: '#8696a7', lineHeight: 1.6, maxWidth: 640 }}>
        ℹ️ Mixpanel tiene un límite en la Query API que se agota si se consulta mucho seguido (sobre todo cambiando rangos del date picker). Si ves <b>“Rate limited”</b>, esperá unos minutos — se recupera solo. HubSpot rara vez se limita.
      </div>
    </div>
  );
}
