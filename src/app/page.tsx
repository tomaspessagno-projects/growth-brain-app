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
        const estado = exp.estado?.toLowerCase();
        if (estado === 'planeado') counts.planeados++;
        if (estado === 'en curso') counts.en_curso++;
        if (estado === 'finalizado') counts.finalizados++;
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
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Traer TODOS los experimentos activos o modificados esta semana:
      // - Creados esta semana, O
      // - En Curso (siempre relevantes), O  
      // - Que tengan métricas/aprendizajes registrados esta semana
      const { data: exps } = await supabase
        .from('experimentos')
        .select('*, aprendizajes(*), metricas_snapshots(*)')
        .or(`creado_en.gte.${weekAgo.toISOString()},estado.eq.en curso`);

      const allExps = exps || [];
      setReportData(allExps);

      const aiResponse = await fetch('/api/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experiments: allExps })
      });
      const aiData = await aiResponse.json();
      const summary = aiData.summary || 'No se pudo generar el resumen IA.';
      setAiSummary(summary);

      // Generar y descargar PDF directamente via jsPDF
      setTimeout(async () => {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        const weekStartStr = weekAgo.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        const todayStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        
        let y = 20;
        
        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Weekly Growth Report', 20, y);
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Semana del ${weekStartStr} al ${todayStr}`, 20, y);
        doc.text('GROWTH BRAIN AI', 190, y - 8, { align: 'right' });
        y += 10;
        doc.setDrawColor(0);
        doc.line(20, y, 190, y);
        y += 12;
        
        // AI Summary
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('RESUMEN EJECUTIVO (IA)', 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const summaryLines = doc.splitTextToSize(summary, 165);
        doc.text(summaryLines, 20, y);
        y += summaryLines.length * 5 + 12;
        
        // Experiments
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`Experimentos de la Semana (${allExps.length})`, 20, y);
        y += 8;
        
        allExps.forEach((exp: any) => {
          if (y > 260) { doc.addPage(); y = 20; }
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(exp.nombre, 20, y);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80);
          doc.text(`Estado: ${exp.estado}`, 20, y + 5);
          y += 10;
          if (exp.descripcion) {
            doc.setTextColor(60);
            const descLines = doc.splitTextToSize(exp.descripcion, 165);
            doc.text(descLines, 20, y);
            y += descLines.length * 4 + 4;
          }
          if (exp.aprendizajes?.length > 0) {
            doc.setTextColor(0);
            doc.setFont('helvetica', 'bold');
            doc.text('Aprendizaje clave:', 20, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60);
            const insightLines = doc.splitTextToSize(exp.aprendizajes[0].insights || exp.aprendizajes[0].resultado, 165);
            doc.text(insightLines, 20, y);
            y += insightLines.length * 4 + 4;
          }
          doc.setDrawColor(220);
          doc.line(20, y, 190, y);
          y += 6;
          doc.setTextColor(0);
        });
        
        doc.save(`GrowthBrain_Reporte_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsGenerating(false);
      }, 800);

    } catch (e: any) {
      alert('Error generando el reporte: ' + e.message);
      setIsGenerating(false);
    }
  };

  if (loading) {
    return <div className={styles.dashboard}>Iniciando panel principal...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <header className={`animate-fade-in ${styles.header}`}>
        <div>
          <h1 className={styles.title}>Dashboard General</h1>
          <p className={styles.subtitle}>Resumen de todos tus experimentos de Growth.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleGenerateReport} 
            disabled={isGenerating} 
            className={styles.reportBtn}
          >
            {isGenerating ? 'IA Generando Reporte...' : '📄 Reporte Semanal'}
          </button>
          <Link href="/experimentos/nuevo" className={styles.primaryAction}>
            + Crear Experimento
          </Link>
        </div>
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
        <div className={styles.sectionHeader}>
          <h2>Experimentos Recientes</h2>
          <Link href="/experimentos" className={styles.viewAll}>Ver Todos →</Link>
        </div>
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Nombre del Experimento</span>
            <span>Estado</span>
            <span>Fecha Inicio</span>
          </div>
          <div className={styles.tableBody}>
            {recentExperiments.map(exp => (
              <Link href={`/experimentos/${exp.id}`} key={exp.id} className={styles.tableRow} style={{textDecoration: 'none', color: 'inherit'}}>
                <span className={styles.expTitle}>{exp.nombre}</span>
                <span className={styles.expStatus}>
                  <div className={`${styles.dot} ${exp.estado === 'En Curso' ? styles.Encurso : exp.estado === 'Planeado' ? styles.Planeado : styles.Finalizado}`}></div>
                  {exp.estado}
                </span>
                <span className={styles.expDate}>
                  {exp.fecha_inicio ? new Date(exp.fecha_inicio).toLocaleDateString('es-ES') : '-'}
                </span>
              </Link>
            ))}
            {recentExperiments.length === 0 && (
              <p style={{ padding: '16px', color: '#a0aab2' }}>No tienes experimentos recientes. ¡Empieza creando uno en el menú lateral!</p>
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
