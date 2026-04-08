"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';
import styles from './experimentos.module.css';

export default function ExperimentosList() {
  const [allExperiments, setAllExperiments] = useState<any[]>([]);
  const [filteredExperiments, setFilteredExperiments] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Todos'); // 'Todos', 'en curso', 'finalizado', 'planeado'

  useEffect(() => {
    fetchExperiments();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, activeTab, allExperiments]);

  const fetchExperiments = async () => {
    const { data } = await supabase
      .from('experimentos')
      .select('*')
      .order('creado_en', { ascending: false });

    if (data) {
      setAllExperiments(data);
    }
  };

  const filterData = () => {
    let filtered = allExperiments;

    // Filter by Tab
    if (activeTab !== 'Todos') {
      filtered = filtered.filter(exp => exp.estado.toLowerCase() === activeTab.toLowerCase());
    }

    // Filter by text
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(exp => 
        (exp.nombre && exp.nombre.toLowerCase().includes(q)) ||
        (exp.descripcion && exp.descripcion.toLowerCase().includes(q))
      );
    }

    setFilteredExperiments(filtered);
  };

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Experimentos</h1>
          <p className="page-subtitle">Gestiona y analiza todas tus iniciativas de crecimiento.</p>
        </div>
        <Link href="/experimentos/nuevo" className={styles.primaryAction}>
           + Crear Nuevo
        </Link>
      </header>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Buscar experimento..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterTabs}>
          <button className={`${styles.tab} ${activeTab === 'Todos' ? styles.active : ''}`} onClick={() => setActiveTab('Todos')}>Todos</button>
          <button className={`${styles.tab} ${activeTab === 'planeado' ? styles.active : ''}`} onClick={() => setActiveTab('planeado')}>Planeados</button>
          <button className={`${styles.tab} ${activeTab === 'en curso' ? styles.active : ''}`} onClick={() => setActiveTab('en curso')}>En curso</button>
          <button className={`${styles.tab} ${activeTab === 'finalizado' ? styles.active : ''}`} onClick={() => setActiveTab('finalizado')}>Finalizados</button>
        </div>
      </div>

      <div className={styles.grid}>
        {filteredExperiments.length === 0 && <p style={{color: '#a0aab2'}}>No se encontraron experimentos.</p>}
        {filteredExperiments.map((exp, i) => (
          <Link href={`/experimentos/${exp.id}`} key={exp.id} className={`glass-panel stagger-${(i % 3) + 1} ${styles.card}`}>
            <div className={styles.cardHeader}>
              <span className={`${styles.statusBadge} ${styles[(exp.estado.charAt(0).toUpperCase() + exp.estado.slice(1)).replace(/\s+/g, '')]}`}>
                {exp.estado}
              </span>
              <span className={styles.date}>
                {new Date(exp.creado_en).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
              </span>
            </div>
            
            <h3 className={styles.title}>{exp.nombre}</h3>
            <p className={styles.desc}>{exp.descripcion || 'Sin descripción.'}</p>
            
            <div className={styles.cardFooter}>
              <div className={styles.metric}>
                <span>Métrica Clave:</span>
                <strong>Ver detalles</strong>
              </div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.arrow}>
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
