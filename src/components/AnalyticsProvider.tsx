"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Analytics } from '@/lib/mixpanel/analytics';
import type { Recommendation } from '@/lib/mixpanel/recommendations';
import { computePreset, type DateRange } from '@/components/DateRangePicker';

export type AnalyticsResp = Analytics & { recommendations: Recommendation[] };

interface Ctx {
  data: AnalyticsResp | null;
  loading: boolean; // solo true en la PRIMERA carga (skeleton). Después la data persiste → nav instantáneo.
  busy: boolean; // refetch en curso (cambio de rango / auto-refresh) sin perder la data vieja
  range: DateRange;
  setRange: (r: DateRange) => void;
  reload: () => void;
}

const AnalyticsContext = createContext<Ctx | null>(null);

export function useAnalytics(): Ctx {
  const c = useContext(AnalyticsContext);
  if (!c) throw new Error('useAnalytics debe usarse dentro de <AnalyticsProvider>');
  return c;
}

// Provider único: trae la analítica UNA vez y la comparte. Navegar entre tabs no re-fetchea
// (la data vive acá, en el layout persistente) → instantáneo. El date picker del navbar setea
// el rango global y dispara un único refetch para toda la app.
export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AnalyticsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState<DateRange>(() => computePreset('30d'));

  const load = useCallback(() => {
    setBusy(true);
    fetch(`/api/mixpanel/analytics?from=${range.from}&to=${range.to}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.summary) setData(d); }) // mantener la data vieja si falla
      .catch(() => {})
      .finally(() => { setLoading(false); setBusy(false); });
  }, [range.from, range.to]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000); // auto-refresh (cache server 10min lo absorbe)
    return () => clearInterval(id);
  }, [load]);

  return (
    <AnalyticsContext.Provider value={{ data, loading, busy, range, setRange, reload: load }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
