"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import GanttChart from '@/components/GanttChart';
import styles from './roadmap.module.css';

export default function RoadmapPage() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExperiments = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('experimentos')
        .select('*')
        .order('fecha_inicio', { ascending: true });
      
      setExperiments(data || []);
      setLoading(false);
    };

    fetchExperiments();
  }, []);

  if (loading) return <div className={styles.container}>Cargando Mapa de Ruta...</div>;

  const planned = experiments.filter(e => e.estado === 'planeado');
  const active = experiments.filter(e => e.estado === 'en curso');

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Roadmap Estratégico</h1>
          <p className="page-subtitle">Cronograma proyectado de iniciativas de Growth.</p>
        </div>
      </header>

      <section className={`glass-panel ${styles.ganttSection}`}>
        <div className={styles.sectionHeader}>
          <h2>Cronograma (GANTT)</h2>
          <div className={styles.legend}>
            <div className={styles.legendItem}><span className={styles.dotActive}></span> Activo</div>
            <div className={styles.legendItem}><span className={styles.dotPlanned}></span> Planeado</div>
          </div>
        </div>
        <GanttChart experiments={[...active, ...planned]} />
      </section>

      <div className={styles.grid}>
        <section className={`glass-panel ${styles.listSection}`}>
          <h2>Próximos Pasos (Planeados)</h2>
          <div className={styles.list}>
            {planned.map(exp => (
              <div key={exp.id} className={styles.listItem}>
                <span className={styles.expName}>{exp.nombre}</span>
                <span className={styles.expDate}>{exp.fecha_inicio ? new Date(exp.fecha_inicio).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : 'Sin fecha'}</span>
              </div>
            ))}
            {planned.length === 0 && <p className={styles.empty}>No hay experimentos planeados.</p>}
          </div>
        </section>

        <section className={`glass-panel ${styles.listSection}`}>
          <h2>En Ejecución</h2>
          <div className={styles.list}>
            {active.map(exp => (
              <div key={exp.id} className={styles.listItem}>
                <span className={styles.expName}>{exp.nombre}</span>
                <span className={styles.expDate}>{exp.fecha_fin ? `Cierra: ${new Date(exp.fecha_fin).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}` : 'Sin fecha fin'}</span>
              </div>
            ))}
            {active.length === 0 && <p className={styles.empty}>No hay experimentos activos.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
