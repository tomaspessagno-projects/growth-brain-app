"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import styles from './detalle.module.css';

export default function ExperimentoDetalle() {
  const { id } = useParams();
  
  const [experiment, setExperiment] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [learnings, setLearnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Forms
  const [newMetric, setNewMetric] = useState({ nombre_metrica: '', valor: '' });
  const [newLearning, setNewLearning] = useState({ hipotesis: '', resultado: '', insights: '', validado: false });

  useEffect(() => {
    if (id) {
      loadExperimentData();
    }
  }, [id]);

  const loadExperimentData = async () => {
    setLoading(true);
    
    // Fetch Experiment
    const { data: exp } = await supabase.from('experimentos').select('*').eq('id', id).single();
    if (exp) setExperiment(exp);

    // Fetch Metrics
    const { data: met } = await supabase.from('metricas_snapshots').select('*').eq('experimento_id', id).order('fecha_registro', { ascending: false });
    if (met) setMetrics(met);

    // Fetch Learnings
    const { data: lea } = await supabase.from('aprendizajes').select('*').eq('experimento_id', id).order('creado_en', { ascending: false });
    if (lea) setLearnings(lea);

    setLoading(false);
  };

  const handleSaveMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    const { error } = await supabase.from('metricas_snapshots').insert([{
      experimento_id: id,
      nombre_metrica: newMetric.nombre_metrica,
      valor: parseFloat(newMetric.valor)
    }]);
    setModalLoading(false);
    if (!error) {
      setShowMetricModal(false);
      setNewMetric({ nombre_metrica: '', valor: '' });
      loadExperimentData(); // refresh data
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleSaveLearning = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    const { error } = await supabase.from('aprendizajes').insert([{
      experimento_id: id,
      hipotesis: newLearning.hipotesis,
      resultado: newLearning.resultado,
      insights: newLearning.insights,
      validado: newLearning.validado
    }]);
    setModalLoading(false);
    if (!error) {
      setShowLearningModal(false);
      setNewLearning({ hipotesis: '', resultado: '', insights: '', validado: false });
      loadExperimentData(); // refresh data
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleDeleteLearning = async (learningId: string) => {
    if (!confirm('¿Deseas eliminar este aprendizaje permanentemente?')) return;
    setLoading(true);
    await supabase.from('aprendizajes').delete().eq('id', learningId);
    loadExperimentData();
  };

  const [aiGenerating, setAiGenerating] = useState(false);

  const handleAnalizarConIA = async () => {
    setAiGenerating(true);
    
    try {
      const response = await fetch('/api/analyze-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experiment,
          metrics,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fallo desconocido en el servidor API');
      }

      if (data.success && data.analysis) {
        // Pre-poblar el modal y abrirlo para que el usuario pueda editar/guardar
        setNewLearning({
          hipotesis: data.analysis.hipotesisSugerida || 'No logré sugerir hipótesis.',
          resultado: data.analysis.resultadoObservado || 'Sin resultados observables.',
          insights: data.analysis.insightsClave || '-',
          validado: data.analysis.hipotesisAparentementeValidada || false
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setShowLearningModal(true);
      }
    } catch (e: any) {
      alert("Error Analizando con Gemini AI: " + e.message);
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) return <div className={styles.container}>Cargando...</div>;
  if (!experiment) return <div className={styles.container}>Experimento no encontrado.</div>;

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <Link href="/experimentos" className={styles.backLink}>
        ← Volver a Experimentos
      </Link>

      <header className={`glass-panel ${styles.header}`}>
        <div className={styles.headerTop}>
          <h1 className="page-title" style={{ marginBottom: 0, fontSize: '2rem' }}>{experiment.nombre}</h1>
          <span className={`${styles.statusBadge} ${styles[(experiment.estado.charAt(0).toUpperCase() + experiment.estado.slice(1)).replace(/\s+/g, '')]}`}>
            {experiment.estado}
          </span>
        </div>
        <p className={styles.desc}>{experiment.descripcion || 'Sin descripción'}</p>
        <div className={styles.metaData}>
          <div className={styles.metaItem}>
            <span>Fecha Inicio Estimada:</span>
            <strong>{experiment.fecha_inicio ? new Date(experiment.fecha_inicio).toLocaleDateString('es-ES') : 'N/A'}</strong>
          </div>
          <div className={styles.metaItem}>
            <span>Fecha Fin Estimada:</span>
            <strong>{experiment.fecha_fin ? new Date(experiment.fecha_fin).toLocaleDateString('es-ES') : 'N/A'}</strong>
          </div>
        </div>
      </header>

      <div className={styles.contentGrid}>
        {/* Section: Metrics */}
        <section className={`glass-panel stagger-1 ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2>Métricas Snapshots</h2>
            <button className={styles.secondaryAction} onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setShowMetricModal(true);
            }}>+ Registrar Métrica</button>
          </div>

          {metrics.length > 0 && (
            <div style={{ width: '100%', height: 300, marginTop: '16px', marginBottom: '24px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...metrics].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="fecha_registro" 
                    tickFormatter={(tick) => new Date(tick).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} 
                    stroke="#a0aab2"
                     tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#a0aab2" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(20, 25, 35, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  />
                  <Line type="monotone" dataKey="valor" stroke="#45f3ff" strokeWidth={3} dot={{ r: 5, fill: "#6d28d9", strokeWidth: 2 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Fecha</span>
              <span>Nombre de Métrica</span>
              <span>Valor</span>
            </div>
            <div className={styles.tableBody}>
              {metrics.length === 0 && <div className={styles.tableRow} style={{color: '#a0aab2'}}>No hay métricas registradas.</div>}
              {metrics.map((m) => (
                <div key={m.id} className={styles.tableRow}>
                  <span>{new Date(m.fecha_registro).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}</span>
                  <span>{m.nombre_metrica}</span>
                  <span className={styles.highlightValue}>{m.valor}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section: Learnings */}
        <section className={`glass-panel stagger-2 ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2>Aprendizajes</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className={styles.aiAction} 
                onClick={handleAnalizarConIA}
                disabled={aiGenerating}
              >
                {aiGenerating ? 'Analizando...' : 'Analizar con IA ✨'}
              </button>
              <button className={styles.secondaryAction} onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setShowLearningModal(true);
              }}>+ Nuevo Aprendizaje</button>
            </div>
          </div>

          <div className={styles.learningsList}>
            {learnings.length === 0 && <p style={{color: '#a0aab2'}}>No se han registrado aprendizajes aún.</p>}
            {learnings.map(l => (
              <div key={l.id} className={styles.learningCard}>
                <div className={styles.learningHeader}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span className={styles.badgeLabel}>Hipótesis Central</span>
                    {l.validado && <span className={styles.validatedBadge}>✓ Validada</span>}
                  </div>
                  <button 
                    onClick={() => handleDeleteLearning(l.id)} 
                    style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                    title="Eliminar aprendizaje"
                  >
                    ×
                  </button>
                </div>
                <p className={styles.hypothesisText}>&quot;{l.hipotesis}&quot;</p>
                
                <div className={styles.learningResult}>
                  <div className={styles.resBox}>
                    <strong>Resultado Observado:</strong>
                    <p>{l.resultado}</p>
                  </div>
                  <div className={styles.resBox}>
                    <strong>Insights / Conclusión:</strong>
                    <p>{l.insights || '-'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* --- MODALS --- */}
      {showMetricModal && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalContent} animate-fade-in`}>
            <h3>Registrar Nueva Métrica</h3>
            <form onSubmit={handleSaveMetric} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Nombre de la Métrica</label>
                <input type="text" required placeholder="Ej. Tasa de Conversión" value={newMetric.nombre_metrica} onChange={e => setNewMetric({...newMetric, nombre_metrica: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Valor (Numérico)</label>
                <input type="number" step="0.01" required placeholder="Ej. 12.5" value={newMetric.valor} onChange={e => setNewMetric({...newMetric, valor: e.target.value})} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setShowMetricModal(false)}>Cancelar</button>
                <button type="submit" className={styles.btnSubmit} disabled={modalLoading}>{modalLoading ? '...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLearningModal && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalContent} animate-fade-in`}>
            <h3>Registrar Nuevo Aprendizaje</h3>
            <form onSubmit={handleSaveLearning} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Hipótesis Central</label>
                <textarea required rows={2} placeholder="¿Qué probamos?" value={newLearning.hipotesis} onChange={e => setNewLearning({...newLearning, hipotesis: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Resultado Observado</label>
                <textarea required rows={2} placeholder="¿Qué pasó en la realidad?" value={newLearning.resultado} onChange={e => setNewLearning({...newLearning, resultado: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Insights Clave</label>
                <textarea rows={2} placeholder="Conclusiones..." value={newLearning.insights} onChange={e => setNewLearning({...newLearning, insights: e.target.value})} />
              </div>
              <div className={styles.formRowCheck}>
                <input type="checkbox" id="validado" checked={newLearning.validado} onChange={e => setNewLearning({...newLearning, validado: e.target.checked})} />
                <label htmlFor="validado">¿Hipótesis Validada Exitosamente?</label>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setShowLearningModal(false)}>Cancelar</button>
                <button type="submit" className={styles.btnSubmit} disabled={modalLoading}>{modalLoading ? '...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
