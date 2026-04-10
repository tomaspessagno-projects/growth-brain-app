"use client";
import React from 'react';
import styles from './GanttChart.module.css';

interface GanttProps {
  experiments: any[];
}

export default function GanttChart({ experiments }: GanttProps) {
  // Sort experiments by start date
  const sortedExps = [...experiments].sort((a, b) => {
    const dateA = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : Infinity;
    const dateB = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : Infinity;
    return dateA - dateB;
  });

  // Calculate time range (last 4 weeks and next 4 weeks)
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - 30);
  const endDate = new Date();
  endDate.setDate(now.getDate() + 30);

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const getPosition = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const diff = date.getTime() - startDate.getTime();
    const day = diff / (1000 * 60 * 60 * 24);
    return (day / totalDays) * 100;
  };

  const getWidth = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return '10%'; // Default minimal width
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diff = end.getTime() - start.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return Math.max((days / totalDays) * 100, 2); // At least 2% width
  };

  return (
    <div className={styles.ganttContainer}>
      <div className={styles.timelineHeader}>
        {/* Render Month/Week markers */}
        <div className={styles.marker} style={{ left: '0%' }}>{startDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</div>
        <div className={styles.marker} style={{ left: '25%' }}>-15d</div>
        <div className={styles.marker} style={{ left: '50%', color: '#fff', borderLeft: '1px dashed #555' }}>Hoy</div>
        <div className={styles.marker} style={{ left: '75%' }}>+15d</div>
        <div className={styles.marker} style={{ left: '100%' }}>{endDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</div>
      </div>

      <div className={styles.rows}>
        {sortedExps.map((exp, idx) => {
          const left = getPosition(exp.fecha_inicio);
          const width = getWidth(exp.fecha_inicio, exp.fecha_fin || exp.fecha_inicio);
          
          if (left === null || left > 100 || (left + parseFloat(String(width))) < 0) return null;

          return (
            <div key={exp.id} className={styles.row}>
              <div className={styles.expLabel}>
                <span className={styles.expName}>{exp.nombre}</span>
              </div>
              <div className={styles.track}>
                <div 
                  className={`${styles.bar} ${exp.estado === 'en curso' ? styles.active : styles.planned}`}
                  style={{ 
                    left: `${left}%`, 
                    width: `${width}%` 
                  }}
                >
                  <span className={styles.statusDot}></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
