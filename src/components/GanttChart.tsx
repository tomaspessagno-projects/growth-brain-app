"use client";
import React, { useState } from 'react';
import styles from './GanttChart.module.css';

interface GanttProps {
  experiments: any[];
}

export default function GanttChart({ experiments }: GanttProps) {
  const [viewDate, setViewDate] = useState(new Date());

  // Sort experiments by start date
  const sortedExps = [...experiments].sort((a, b) => {
    const dateA = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : Infinity;
    const dateB = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : Infinity;
    return dateA - dateB;
  });

  // Calculate time range (last 30 days and next 30 days from viewDate)
  const startDate = new Date(viewDate);
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date(viewDate);
  endDate.setDate(endDate.getDate() + 30);

  const totalDays = 60; // Fixed 60 day window

  const getPosition = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const diff = date.getTime() - startDate.getTime();
    const day = diff / (1000 * 60 * 60 * 24);
    return (day / totalDays) * 100;
  };

  const getBarData = (startStr: string, endStr: string) => {
    if (!startStr) return null;
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : start;

    // Clipping logic
    const effectiveStart = start < startDate ? startDate : (start > endDate ? endDate : start);
    const effectiveEnd = end > endDate ? endDate : (end < startDate ? startDate : end);

    if (effectiveStart >= endDate || effectiveEnd <= startDate) return null;

    const left = ((effectiveStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
    const width = ((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;

    return { left, width: Math.max(width, 0.5) };
  };

  const handleNavigate = (days: number) => {
    const nextDate = new Date(viewDate);
    nextDate.setDate(nextDate.getDate() + days);
    setViewDate(nextDate);
  };

  const todayPos = getPosition(new Date().toISOString());

  return (
    <div className={styles.ganttContainer}>
      <div className={styles.ganttHeader}>
        <div className={styles.navControls}>
          <button className={styles.navBtn} onClick={() => handleNavigate(-15)}>← Ant.</button>
          <button className={styles.navBtn} onClick={() => setViewDate(new Date())}>Hoy</button>
          <button className={styles.navBtn} onClick={() => handleNavigate(15)}>Sig. →</button>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#555', fontStyle: 'italic' }}>
           Ventana: {startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </div>
      </div>

      <div className={styles.timelineHeader}>
        <div className={styles.marker} style={{ left: '0%' }}>{startDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</div>
        <div className={styles.marker} style={{ left: '25%' }}>-15d</div>
        {todayPos !== null && todayPos >= 0 && todayPos <= 100 && (
          <div className={styles.marker} style={{ left: `${todayPos}%`, color: '#fff', borderLeft: '1px dashed #555', height: '100%' }}>Hoy</div>
        )}
        <div className={styles.marker} style={{ left: '75%' }}>+15d</div>
        <div className={styles.marker} style={{ left: '100%' }}>{endDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</div>
      </div>

      <div className={styles.rows}>
        {sortedExps.map((exp, idx) => {
          const bar = getBarData(exp.fecha_inicio, exp.fecha_fin || exp.fecha_inicio);
          if (!bar) return null;

          return (
            <div key={exp.id} className={styles.row}>
              <div className={styles.expLabel}>
                <span className={styles.expName}>{exp.nombre}</span>
              </div>
              <div className={styles.track}>
                <div 
                  className={`${styles.bar} ${exp.estado === 'en curso' ? styles.active : styles.planned}`}
                  style={{ 
                    left: `${bar.left}%`, 
                    width: `${bar.width}%` 
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
