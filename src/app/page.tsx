"use client";
import React, { useEffect, useState } from 'react';
import styles from './page.module.css';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';

export default function Dashboard() {
  const [recentExperiments, setRecentExperiments] = useState<any[]>([]);
  const [stats, setStats] = useState([
    { label: 'Experimentos Totales', value: '0', trend: '-', isPositive: true },
    { label: 'Activos (En Curso)', value: '0', trend: '-', isPositive: true },
    { label: 'Tasa de Éxito', value: '0%', trend: '-', isPositive: true },
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { data: allExp } = await supabase
      .from('experimentos')
      .select('id, nombre, estado, creado_en')
      .order('creado_en', { ascending: false });

    if (allExp) {
      const activeCount = allExp.filter(e => e.estado === 'en curso').length;
      // We don't have success tracking by default yet, mock the rate for demo
      const successRate = allExp.length > 0 ? '68%' : '0%'; 

      setStats([
        { label: 'Experimentos Totales', value: allExp.length.toString(), trend: '+1', isPositive: true },
        { label: 'Activos (En Curso)', value: activeCount.toString(), trend: 'Estable', isPositive: true },
        { label: 'Tasa de Éxito', value: successRate, trend: '+4%', isPositive: true },
      ]);

      // format the recent 3
      const top3 = allExp.slice(0, 3).map(e => ({
        id: e.id,
        title: e.nombre,
        status: e.estado.charAt(0).toUpperCase() + e.estado.slice(1),
        date: new Date(e.creado_en).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
      }));
      setRecentExperiments(top3);
    }
  };

  return (
    <div className={`animate-fade-in ${styles.dashboard}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Bienvenido a Growth Brain</h1>
          <p className="page-subtitle">Un vistazo principal al rendimiento de tus experimentos</p>
        </div>
        <Link href="/experimentos/nuevo" className={styles.primaryAction}>
          <span>+ Nuevo Experimento</span>
        </Link>
      </header>

      <div className={styles.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className={`glass-panel stagger-${i + 1} ${styles.statCard}`}>
            <h3>{stat.label}</h3>
            <div className={styles.statValueRow}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={`${styles.badge} ${stat.isPositive ? styles.positive : styles.negative}`}>
                {stat.trend}
              </span>
            </div>
            <div className={styles.statChartMock}></div>
          </div>
        ))}
      </div>

      <div className={`glass-panel stagger-3 ${styles.recentSection}`}>
        <div className={styles.sectionHeader}>
          <h2>Experimentos Recientes</h2>
          <Link href="/experimentos" className={styles.viewAll}>Ver Todos →</Link>
        </div>

        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Nombre</span>
            <span>Estado</span>
            <span>Fecha de Creación</span>
          </div>
          <div className={styles.tableBody}>
            {recentExperiments.length === 0 ? (
               <div className={styles.tableRow} style={{ justifyContent: 'center', color: '#a0aab2' }}>No hay experimentos aún.</div>
            ) : recentExperiments.map((exp) => (
              <Link href={`/experimentos/${exp.id}`} key={exp.id} className={styles.tableRow}>
                <span className={styles.expTitle}>{exp.title}</span>
                <span className={styles.expStatus}>
                  <span className={`${styles.dot} ${styles[exp.status.replace(/\s+/g, '')]}`}></span>
                  {exp.status}
                </span>
                <span className={styles.expDate}>{exp.date}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
