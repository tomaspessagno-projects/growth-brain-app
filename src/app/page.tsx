"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useReactToPrint } from 'react-to-print';
import WeeklyReportPdf from '@/components/WeeklyReportPdf';
import styles from "./page.module.css";

export default function Dashboard() {
  const [stats, setStats] = useState({ planeados: 0, en_curso: 0, finalizados: 0 });
  const [recentExperiments, setRecentExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal/PDF del Reporte
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: 'GrowthBrain_WeeklyReport',
    onAfterPrint: () => setIsGenerating(false)
  } as any); // cast an any for typing compatibility with newer versions

  useEffect(() => {
    async function fetchDashboardData() {
      // Fetch conteos por estado
      const { data: countData } = await supabase.from('experimentos').select('estado');
      const counts = { planeados: 0, en_curso: 0, finalizados: 0 };
      
      countData?.forEach(exp => {
        if (exp.estado === 'Planeado') counts.planeados++;
        if (exp.estado === 'En Curso') counts.en_curso++;
        if (exp.estado === 'Finalizado') counts.finalizados++;
      });
      setStats(counts);

      // Fetch recientes
      const { data: recents } = await supabase
        .from('experimentos')
        .select('*')
        .order('fecha_inicio', { ascending: false })
        .limit(3);
      
      setRecentExperiments(recents || []);
      setLoading(false);
    }
    
    fetchDashboardData();
  }, []);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      // 1. Conseguir fecha de hace 7 días
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      // 2. Traer experimentos recientes con sus aprendizajes y metricas
      const { data: exps } = await supabase
        .from('experimentos')
        .select('*, aprendizajes(*), metricas_snapshots(*)')
        .gte('created_at', weekAgo.toISOString());
        
      setReportData(exps || []);

      // 3. Obtener el texto del CEO desde la IA de Gemini
      const aiResponse = await fetch('/api/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experiments: exps || [] })
      });
      const aiData = await aiResponse.json();
      setAiSummary(aiData.summary || "No se pudo generar reporte IA.");

      // 4. Retraso brevisimo para asegurar renderizado de datos, luego imprimir
      setTimeout(() => {
        handlePrint();
      }, 1000);

    } catch (e: any) {
      alert("Error generando el reporte: " + e.message);
      setIsGenerating(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Iniciando panel principal...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={`animate-fade-in ${styles.header}`}>
        <div>
          <h1 className={styles.title}>Dashboard General</h1>
          <p className={styles.subtitle}>Resumen de todos tus experimentos de Growth.</p>
        </div>
        <button 
          onClick={handleGenerateReport} 
          disabled={isGenerating} 
          className={styles.reportBtn}
        >
          {isGenerating ? 'IA Generando Reporte...' : '📄 Reporte Semanal'}
        </button>
      </header>

      <section className={styles.statsGrid}>
        <div className={`glass-panel stagger-1 ${styles.statCard}`}>
          <h3>En Curso</h3>
          <p className={styles.statNumber}>{stats.en_curso}</p>
        </div>
        <div className={`glass-panel stagger-2 ${styles.statCard}`}>
          <h3>Planeados</h3>
          <p className={styles.statNumber}>{stats.planeados}</p>
        </div>
        <div className={`glass-panel stagger-3 ${styles.statCard}`}>
          <h3>Finalizados</h3>
          <p className={styles.statNumber}>{stats.finalizados}</p>
        </div>
      </section>

      <section className={`glass-panel stagger-4 ${styles.recentSection}`}>
        <h2>Experimentos Recientes</h2>
        <div className={styles.recentGrid}>
          {recentExperiments.map(exp => (
            <Link href={`/experimentos/${exp.id}`} key={exp.id} className={styles.experimentCard}>
              <div className={styles.cardHeader}>
                <span className={styles.statusBadge}>{exp.estado}</span>
              </div>
              <h3 className={styles.cardTitle}>{exp.nombre}</h3>
            </Link>
          ))}
          {recentExperiments.length === 0 && (
            <p style={{ color: '#a0aab2' }}>No tienes experimentos recientes. ¡Empieza creando uno en el menú lateral!</p>
          )}
        </div>
      </section>

      {/* COMPONENTE DE PDF ESCONDIDO */}
      <div style={{ display: 'none' }}>
        <WeeklyReportPdf ref={reportRef} data={reportData} aiSummary={aiSummary} />
      </div>
    </div>
  );
}
