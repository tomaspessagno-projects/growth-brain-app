"use client";
import React, { useState } from 'react';
import styles from './GanttChart.module.css';

interface GanttProps {
  experiments: any[];
}

export default function GanttChart({ experiments }: GanttProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const [filterRange, setFilterRange] = useState({
    start: '',
    end: ''
  });

  // Filter and Sort experiments
  const filteredExps = experiments
    .filter(exp => {
      // 1. Solo en curso o planeado
      if (exp.estado !== 'en curso' && exp.estado !== 'planeado') return false;
      
      // 2. Solo HOY o futuro (si no hay filtro manual)
      if (!filterRange.start) {
        const start = exp.fecha_inicio ? new Date(exp.fecha_inicio) : null;
        const today = new Date();
        today.setHours(0,0,0,0);
        // "En curso" siempre se muestra, "Planeado" solo si es hoy o futuro
        if (exp.estado === 'planeado' && start && start < today) return false;
      }

      // 3. Filtro manual por rango (si existe)
      if (filterRange.start && exp.fecha_inicio) {
        const expStart = new Date(exp.fecha_inicio);
        const fStart = new Date(filterRange.start);
        if (expStart < fStart) return false;
      }
      if (filterRange.end && exp.fecha_inicio) {
        const expStart = new Date(exp.fecha_inicio);
        const fEnd = new Date(filterRange.end);
        if (expStart > fEnd) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : Infinity;
      const dateB = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : Infinity;
      return dateA - dateB;
    });

  // Calculate time range (from viewDate or filterRange)
  const startDate = filterRange.start ? new Date(filterRange.start) : new Date(viewDate);
  if (!filterRange.start) startDate.setDate(startDate.getDate() - 10); // Margen de 10 días al pasado si es hoy
  
  const endDate = filterRange.end ? new Date(filterRange.end) : new Date(startDate);
  if (!filterRange.end) endDate.setDate(startDate.getDate() + 60);

  const totalDiff = endDate.getTime() - startDate.getTime();
  const totalDays = Math.max(totalDiff / (1000 * 60 * 60 * 24), 1);

  const getPosition = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (date < startDate || date > endDate) return null;
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
          <div className={styles.filterGroup}>
            <label>Scope:</label>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={filterRange.start} 
              onChange={(e) => setFilterRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span>a</span>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={filterRange.end} 
              onChange={(e) => setFilterRange(prev => ({ ...prev, end: e.target.value }))}
            />
            {(filterRange.start || filterRange.end) && (
              <button className={styles.clearBtn} onClick={() => setFilterRange({ start: '', end: '' })}>Limpiar</button>
            )}
          </div>
          <div className={styles.divider}></div>
          <button className={styles.navBtn} onClick={() => handleNavigate(-15)}>←</button>
          <button className={styles.navBtn} onClick={() => { setViewDate(new Date()); setFilterRange({ start: '', end: '' }); }}>Hoy</button>
          <button className={styles.navBtn} onClick={() => handleNavigate(15)}>→</button>
        </div>
        <div className={styles.rangeInfo}>
           Visible: {startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </div>
      </div>

      <div className={styles.timelineHeader}>
        <div className={styles.marker} style={{ left: '0%' }}>{startDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</div>
        {todayPos !== null && (
          <div className={styles.marker} style={{ left: `${todayPos}%`, color: '#fff', borderLeft: '1px dashed rgba(255,255,255,0.2)', height: '100px', zIndex: 10, top: '-10px' }}>
            <span style={{ background: '#000', padding: '2px 4px', borderRadius: '2px' }}>Hoy</span>
          </div>
        )}
        <div className={styles.marker} style={{ left: '100%' }}>{endDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</div>
      </div>

      <div className={styles.rows}>
        {filteredExps.map((exp) => {
          const bar = getBarData(exp.fecha_inicio, exp.fecha_fin || exp.fecha_inicio);
          if (!bar) return null;

          return (
            <div key={exp.id} className={styles.row}>
              <div className={styles.expLabel}>
                <span className={styles.expName} title={exp.nombre}>{exp.nombre}</span>
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
        {filteredExps.length === 0 && (
          <div className={styles.emptyMsg}>No hay iniciativas activas o próximas en este rango.</div>
        )}
      </div>
    </div>
  );
}
