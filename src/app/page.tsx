"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useReactToPrint } from 'react-to-print';
import WeeklyReportPdf from '@/components/WeeklyReportPdf';
import FunnelChart from '@/components/FunnelChart';
import GrowthTrends from '@/components/GrowthTrends';
import SlideMode from '@/components/SlideMode';
import { FUNNEL_STEPS } from '@/config/funnel';
import styles from "./page.module.css";

export default function Dashboard() {
  const [stats, setStats] = useState({ planeados: 0, en_curso: 0, finalizados: 0 });
  const [recentExperiments, setRecentExperiments] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal/PDF del Reporte
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [isSlideOpen, setIsSlideOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: 'GrowthBrain_WeeklyReport',
    onAfterPrint: () => setIsGenerating(false)
  } as any); 

  useEffect(() => {
    async function fetchDashboardData() {
      // Fetch conteos por estado
      const { data: countData } = await supabase.from('experimentos').select('estado, fecha_inicio, aprendizajes(id), paso_funnel');
      const counts = { planeados: 0, en_curso: 0, finalizados: 0 };
      
      const experiments = countData || [];
      experiments.forEach(exp => {
        const estado = exp.estado?.toLowerCase();
        if (estado === 'planeado') counts.planeados++;
        if (estado === 'en curso') counts.en_curso++;
        if (estado === 'finalizado') counts.finalizados++;
      });
      setStats(counts);

      // Calcular datos para el Trend Chart (últimas 4 semanas)
      const now = new Date();
      const weeks = [3, 2, 1, 0].map(diff => {
        const d = new Date();
        d.setDate(now.getDate() - (diff * 7));
        return d.toISOString().split('T')[0];
      });

      const trends = weeks.map(weekDate => {
        const dateObj = new Date(weekDate);
        return {
          date: weekDate.split('-').slice(1).reverse().join('/'),
          experiments: experiments.filter(e => e.fecha_inicio && new Date(e.fecha_inicio) <= dateObj).length,
          learning: experiments.reduce((acc, e) => acc + (e.aprendizajes?.length || 0), 0)
        };
      });
      setTrendData(trends);

      // Fetch recientes
      const { data: recents } = await supabase
        .from('experimentos')
        .select('*')
        .order('fecha_inicio', { ascending: false })
        .limit(3);
      
      setRecentExperiments(recents || []);

      // Funnel Logic
      const { data: snapshots } = await supabase.from('metricas_snapshots').select('*');
      const funnel = FUNNEL_STEPS.map((step) => {
        const expsInStep = experiments.filter(e => e.paso_funnel === step.key);
        const totalLearnings = experiments.reduce((acc, e) => e.paso_funnel === step.key ? acc + (e.aprendizajes?.length || 0) : acc, 0);
        const latestValue = snapshots?.filter(s => s.nombre_metrica === step.key).sort((a,b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime())[0]?.valor;

        return {
          key: step.key,
          value: latestValue || 0,
          experiments: {
            total: expsInStep.length,
            en_curso: expsInStep.filter(e => e.estado === 'en curso').length,
            finalizado: expsInStep.filter(e => e.estado === 'finalizado').length,
            planeado: expsInStep.filter(e => e.estado === 'planeado').length,
          },
          learnings: { total: totalLearnings, validated: 0 }
        };
      });
      setFunnelData(funnel);
      setLoading(false);
    }
    
    fetchDashboardData();
  }, []);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: exps } = await supabase
        .from('experimentos')
        .select('*, aprendizajes(*), metricas_snapshots(*)')
        .or(`estado.eq.en curso,fecha_fin.gte.${weekAgo.toISOString()}`);

      const allExps = (exps || []).filter((exp: any) => {
        const est = exp.estado?.toLowerCase();
        if (est === 'en curso') return true;
        if (est === 'finalizado') return exp.fecha_fin && new Date(exp.fecha_fin) >= weekAgo;
        return false;
      });
      setReportData(allExps);

      const aiResponse = await fetch('/api/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experiments: allExps })
      });
      const aiData = await aiResponse.json();
      setAiSummary(aiData.summary || 'Resumen no generado.');

      setTimeout(async () => {
        handlePrint();
      }, 500);
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  if (loading) return <div className={styles.dashboard}>Sincronizando Medicus Brain...</div>;

  return (
    <div className={styles.dashboard}>
      <header className={`animate-fade-in ${styles.header}`}>
        <div>
          <h1 className={styles.title}>Growth Center</h1>
          <p className={styles.subtitle}>Panel de control estratégico Medicus.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setIsSlideOpen(true)} className={styles.reportBtn}>
            📽 Presentar
          </button>
          <button onClick={handleGenerateReport} disabled={isGenerating} className={styles.reportBtn}>
            {isGenerating ? 'IA Generando...' : '📄 Reporte de Impacto'}
          </button>
          <Link href="/experimentos/nuevo" className={styles.primaryAction}>
            + Nuevo Experimento
          </Link>
        </div>
      </header>

      <SlideMode 
        isOpen={isSlideOpen} 
        onClose={() => setIsSlideOpen(false)} 
        title="Medicus Growth Center"
        subtitle="Análisis estratégico de conversión y velocidad de experimentación."
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '20px' }}>
          <section className="glass-panel" style={{ padding: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '32px' }}>Embudo de Conversión</h2>
            <FunnelChart data={funnelData} />
          </section>
          <section className="glass-panel" style={{ padding: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '32px' }}>Tendencia de Crecimiento</h2>
            <GrowthTrends data={trendData} />
          </section>
        </div>
        <div className="glass-panel" style={{ padding: '40px', borderLeft: '4px solid #fff' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#888' }}>Insights Estratégicos (Gemini AI)</h2>
          <p style={{ fontSize: '1.4rem', lineHeight: '1.6', fontWeight: 300 }}>
            {aiSummary || "La velocidad de experimentación se mantiene estable. El mayor cuello de botella se encuentra entre la Visita y la Cotización. Se recomienda priorizar experimentos de UX en el onboarding."}
          </p>
        </div>
      </SlideMode>

      <section className={styles.statsGrid}>
        <div className={`glass-panel ${styles.statCard}`}>
          <span className={styles.statLabel}>Activos</span>
          <p className={styles.statNumber}>{stats.en_curso}</p>
        </div>
        <div className={`glass-panel ${styles.statCard}`}>
          <span className={styles.statLabel}>Objetivos</span>
          <p className={styles.statNumber}>{stats.planeados}</p>
        </div>
        <div className={`glass-panel ${styles.statCard}`}>
          <span className={styles.statLabel}>Éxitos</span>
          <p className={styles.statNumber}>{stats.finalizados}</p>
        </div>
      </section>

      <div className={styles.chartsGrid}>
        <section className={`glass-panel ${styles.chartSection}`}>
          <div className={styles.sectionHeader}>
            <h2>Embudo de Conversión</h2>
            <p className={styles.chartSub}>Distribución estratégica del funnel 7-pasos.</p>
          </div>
          <FunnelChart data={funnelData} />
        </section>

        <section className={`glass-panel ${styles.chartSection}`}>
          <div className={styles.sectionHeader}>
            <h2>Velocidad de Crecimiento</h2>
            <p className={styles.chartSub}>Correlación entre experimentos y conocimiento.</p>
          </div>
          <GrowthTrends data={trendData} />
        </section>
      </div>

      <section className={`glass-panel ${styles.recentSection}`}>
        <div className={styles.sectionHeader}>
          <h2>Monitor de Actividad</h2>
          <Link href="/experimentos" className={styles.viewAll}>Historial Completo →</Link>
        </div>
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Iniciativa</span>
            <span>Estado</span>
            <span style={{ textAlign: 'right' }}>Lanzamiento</span>
          </div>
          <div className={styles.tableBody}>
            {recentExperiments.map(exp => (
              <Link href={`/experimentos/${exp.id}`} key={exp.id} className={styles.tableRow}>
                <span className={styles.expTitle}>{exp.nombre}</span>
                <span className={styles.expStatus}>
                  <span className={styles.monochromeBadge}>
                    {exp.estado === 'en curso' ? 'Activo' : exp.estado === 'planeado' ? 'Pendiente' : 'Completado'}
                  </span>
                </span>
                <span className={styles.expDate} style={{ textAlign: 'right' }}>
                  {exp.fecha_inicio ? new Date(exp.fecha_inicio).toLocaleDateString('es-ES') : '-'}
                </span>
              </Link>
            ))}
            )}
          </div>
        </div>
      </section>

      {/* COMPONENTE DE PDF ESCONDIDO */}
      <div style={{ display: 'none' }}>
        <WeeklyReportPdf ref={reportRef} data={reportData} aiSummary={aiSummary} />
      </div>
    </div>
  );
}
