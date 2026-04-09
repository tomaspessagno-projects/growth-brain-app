"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ModalPortal from '@/components/ModalPortal';
import FunnelChart from '@/components/FunnelChart';
import { FUNNEL_STEPS } from '@/config/funnel';
import styles from './detalle.module.css';

export default function ExperimentoDetalle() {
  const { id } = useParams();
  const router = useRouter();
  
  const [experiment, setExperiment] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [learnings, setLearnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Edit metric state
  const [editingMetric, setEditingMetric] = useState<any>(null);

  // Forms
  const [newMetric, setNewMetric] = useState({ nombre_metrica: '', valor: '' });
  const [newLearning, setNewLearning] = useState({ hipotesis: '', resultado: '', insights: '', validado: false });
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', estado: '', funnel_step: '', fecha_inicio: '', fecha_fin: '' });

  useEffect(() => {
    if (id) loadExperimentData();
  }, [id]);

  const loadExperimentData = async () => {
    setLoading(true);
    const { data: exp } = await supabase.from('experimentos').select('*').eq('id', id).single();
    if (exp) {
      setExperiment(exp);
      setEditForm({
        nombre: exp.nombre || '',
        descripcion: exp.descripcion || '',
        estado: exp.estado || 'planeado',
        funnel_step: exp.funnel_step || '',
        fecha_inicio: exp.fecha_inicio ? exp.fecha_inicio.split('T')[0] : '',
        fecha_fin: exp.fecha_fin ? exp.fecha_fin.split('T')[0] : '',
      });
    }
    const { data: met } = await supabase.from('metricas_snapshots').select('*').eq('experimento_id', id).order('fecha_registro', { ascending: false });
    if (met) setMetrics(met);
    const { data: lea } = await supabase.from('aprendizajes').select('*').eq('experimento_id', id).order('creado_en', { ascending: false });
    if (lea) setLearnings(lea);
    setLoading(false);
  };

  // --- EXPERIMENT CRUD ---
  const handleUpdateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    const { error } = await supabase.from('experimentos').update({
      nombre: editForm.nombre,
      descripcion: editForm.descripcion,
      estado: editForm.estado,
      funnel_step: editForm.funnel_step || null,
      fecha_inicio: editForm.fecha_inicio || null,
      fecha_fin: editForm.fecha_fin || null,
    }).eq('id', id);
    setModalLoading(false);
    if (!error) {
      setShowEditModal(false);
      loadExperimentData();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteExperiment = async () => {
    if (!confirm('¿Eliminar este experimento y todos sus datos? Esta acción no se puede deshacer.')) return;
    await supabase.from('experimentos').delete().eq('id', id);
    router.push('/experimentos');
  };

  // --- METRIC CRUD ---
  const handleSaveMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    if (editingMetric) {
      // Update
      const { error } = await supabase.from('metricas_snapshots').update({
        nombre_metrica: newMetric.nombre_metrica,
        valor: parseFloat(newMetric.valor),
      }).eq('id', editingMetric.id);
      setModalLoading(false);
      if (!error) { setShowMetricModal(false); setEditingMetric(null); setNewMetric({ nombre_metrica: '', valor: '' }); loadExperimentData(); }
      else alert('Error: ' + error.message);
    } else {
      // Insert
      const { error } = await supabase.from('metricas_snapshots').insert([{
        experimento_id: id,
        nombre_metrica: newMetric.nombre_metrica,
        valor: parseFloat(newMetric.valor)
      }]);
      setModalLoading(false);
      if (!error) { setShowMetricModal(false); setNewMetric({ nombre_metrica: '', valor: '' }); loadExperimentData(); }
      else alert('Error: ' + error.message);
    }
  };

  const openEditMetric = (m: any) => {
    setEditingMetric(m);
    setNewMetric({ nombre_metrica: m.nombre_metrica, valor: String(m.valor) });
    setShowMetricModal(true);
  };

  const handleDeleteMetric = async (metricId: string) => {
    if (!confirm('¿Eliminar esta métrica?')) return;
    await supabase.from('metricas_snapshots').delete().eq('id', metricId);
    loadExperimentData();
  };

  // --- LEARNING CRUD ---
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
    if (!error) { setShowLearningModal(false); setNewLearning({ hipotesis: '', resultado: '', insights: '', validado: false }); loadExperimentData(); }
    else alert('Error: ' + error.message);
  };

  const handleDeleteLearning = async (learningId: string) => {
    if (!confirm('¿Deseas eliminar este aprendizaje permanentemente?')) return;
    await supabase.from('aprendizajes').delete().eq('id', learningId);
    loadExperimentData();
  };

  // --- AI ---
  const [aiGenerating, setAiGenerating] = useState(false);
  const handleAnalizarConIA = async () => {
    setAiGenerating(true);
    try {
      const response = await fetch('/api/analyze-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experiment, metrics })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fallo desconocido');
      if (data.success && data.analysis) {
        setNewLearning({
          hipotesis: data.analysis.hipotesisSugerida || '',
          resultado: data.analysis.resultadoObservado || '',
          insights: data.analysis.insightsClave || '',
          validado: data.analysis.hipotesisAparentementeValidada || false
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setShowLearningModal(true);
      }
    } catch (e: any) {
      alert('Error Analizando con Gemini AI: ' + e.message);
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) return <div className={styles.container}>Cargando...</div>;
  if (!experiment) return <div className={styles.container}>Experimento no encontrado.</div>;

  const estadoKey = (experiment.estado.charAt(0).toUpperCase() + experiment.estado.slice(1)).replace(/\s+/g, '');

  // ── MINI FUNNEL: datos de métricas mapeados a pasos del funnel
  const miniFunnelData = FUNNEL_STEPS.map(step => {
    const stepLabel = step.label.toLowerCase();
    const stepKey = step.key.replace(/_/g, ' ');
    // Buscar en las métricas del experimento una que coincida con este paso
    const matching = metrics.filter(m => {
      const mName = (m.nombre_metrica || '').toLowerCase();
      return mName.includes(stepLabel.slice(0, 8)) || mName.includes(stepKey);
    });
    // Tomar el valor del snapshot más reciente que coincida
    const latest = matching.sort((a, b) =>
      new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime()
    )[0];
    return {
      key: step.key,
      value: latest ? Number(latest.valor) : null,
    };
  });

  const hasMiniFunnelData = miniFunnelData.some(d => d.value !== null);

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/experimentos" className={styles.backLink}>← Volver a Experimentos</Link>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={styles.secondaryAction} onClick={() => setShowEditModal(true)}>
            ✏ Editar
          </button>
          <button onClick={handleDeleteExperiment} style={{ background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>
            Eliminar
          </button>
        </div>
      </div>

      <header className={`glass-panel ${styles.header}`}>
        <div className={styles.headerTop}>
          <h1 className="page-title" style={{ marginBottom: 0, fontSize: '2rem' }}>{experiment.nombre}</h1>
          <span className={`${styles.statusBadge} ${styles[estadoKey]}`}>{experiment.estado}</span>
        </div>
        <p className={styles.desc}>{experiment.descripcion || 'Sin descripción'}</p>
        <div className={styles.metaData}>
          <div className={styles.metaItem}>
            <span>Fecha Inicio:</span>
            <strong>{experiment.fecha_inicio ? new Date(experiment.fecha_inicio).toLocaleDateString('es-ES') : 'N/A'}</strong>
          </div>
          <div className={styles.metaItem}>
            <span>Fecha Fin Estimada:</span>
            <strong>{experiment.fecha_fin ? new Date(experiment.fecha_fin).toLocaleDateString('es-ES') : 'N/A'}</strong>
          </div>
        </div>
      </header>

      {/* ── MINI FUNNEL DEL EXPERIMENTO ── */}
      <section className={`glass-panel ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Posición en el Embudo</h2>
            {experiment.funnel_step ? (
              <p style={{ fontSize: '0.8rem', color: '#555', marginTop: '4px' }}>
                Este experimento impacta el paso: <strong style={{ color: '#aaa' }}>
                  {FUNNEL_STEPS.find(s => s.key === experiment.funnel_step)?.label || experiment.funnel_step}
                </strong>
              </p>
            ) : (
              <p style={{ fontSize: '0.8rem', color: '#444', marginTop: '4px' }}>
                No asignado a ningún paso — <button onClick={() => setShowEditModal(true)} style={{ background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>Asignar →</button>
              </p>
            )}
          </div>
        </div>
        {hasMiniFunnelData ? (
          <FunnelChart data={miniFunnelData} highlightStep={experiment.funnel_step} compact={false} />
        ) : (
          <p style={{ color: '#333', fontSize: '0.85rem', fontStyle: 'italic' }}>
            Aún no hay métricas que coincidan con los pasos del funnel. Registrá métricas con el nombre exacto de un paso (ej: &quot;Cotizaron&quot;, &quot;Visitas a armatuplan&quot;) para que aparezcan aquí.
          </p>
        )}
      </section>

      <div className={styles.contentGrid}>
        {/* METRICS */}
        <section className={`glass-panel stagger-1 ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2>Métricas Snapshots</h2>
            <button className={styles.secondaryAction} onClick={() => {
              setEditingMetric(null);
              setNewMetric({ nombre_metrica: '', valor: '' });
              setShowMetricModal(true);
            }}>+ Registrar Métrica</button>
          </div>

          {metrics.length > 0 && (
            <div style={{ width: '100%', height: 280, marginTop: '16px', marginBottom: '24px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...metrics].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="fecha_registro" tickFormatter={(tick) => new Date(tick).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} stroke="#555" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#555" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', fontSize: '12px' }} labelFormatter={(label) => new Date(label).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })} />
                  <Line type="monotone" dataKey="valor" stroke="#ffffff" strokeWidth={2} dot={{ r: 4, fill: '#ffffff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          
          <div className={styles.table}>
            <div className={styles.tableHead} style={{ gridTemplateColumns: '1fr 2fr 1fr auto' }}>
              <span>Fecha</span>
              <span>Métrica</span>
              <span>Valor</span>
              <span></span>
            </div>
            <div className={styles.tableBody}>
              {metrics.length === 0 && <div className={styles.tableRow} style={{ color: '#555' }}>No hay métricas registradas.</div>}
              {metrics.map((m) => (
                <div key={m.id} className={styles.tableRow} style={{ gridTemplateColumns: '1fr 2fr 1fr auto' }}>
                  <span>{new Date(m.fecha_registro).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                  <span>{m.nombre_metrica}</span>
                  <span className={styles.highlightValue}>{m.valor}</span>
                  <span style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openEditMetric(m)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem' }} title="Editar">✏</button>
                    <button onClick={() => handleDeleteMetric(m.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }} title="Eliminar">×</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LEARNINGS */}
        <section className={`glass-panel stagger-2 ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2>Aprendizajes</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className={styles.aiAction} onClick={handleAnalizarConIA} disabled={aiGenerating}>
                {aiGenerating ? 'Analizando...' : 'Analizar con IA ✨'}
              </button>
              <button className={styles.secondaryAction} onClick={() => {
                setShowLearningModal(true);
              }}>+ Nuevo Aprendizaje</button>
            </div>
          </div>

          <div className={styles.learningsList}>
            {learnings.length === 0 && <p style={{ color: '#555' }}>No se han registrado aprendizajes aún.</p>}
            {learnings.map(l => (
              <div key={l.id} className={styles.learningCard}>
                <div className={styles.learningHeader}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span className={styles.badgeLabel}>Hipótesis Central</span>
                    {l.validado && <span className={styles.validatedBadge}>✓ Validada</span>}
                  </div>
                  <button onClick={() => handleDeleteLearning(l.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }} title="Eliminar">×</button>
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

      {/* === PORTAL: EDITAR EXPERIMENTO === */}
      {showEditModal && (
        <ModalPortal onClose={() => setShowEditModal(false)}>
          <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'white' }}>Editar Experimento</h3>
          <form onSubmit={handleUpdateExperiment} className={styles.modalForm}>
            <div className={styles.formGroup}>
              <label>Nombre</label>
              <input type="text" required value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Descripción</label>
              <textarea rows={3} value={editForm.descripcion} onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Estado</label>
              <select value={editForm.estado} onChange={e => setEditForm({ ...editForm, estado: e.target.value })} style={{ background: 'transparent', border: '1px solid #222', color: 'white', padding: '10px 14px', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none', width: '100%' }}>
                <option value="planeado" style={{ background: '#0a0a0a' }}>Planeado</option>
                <option value="en curso" style={{ background: '#0a0a0a' }}>En Curso</option>
                <option value="finalizado" style={{ background: '#0a0a0a' }}>Finalizado</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Paso del Funnel que impacta</label>
              <select value={editForm.funnel_step} onChange={e => setEditForm({ ...editForm, funnel_step: e.target.value })} style={{ background: 'transparent', border: '1px solid #222', color: 'white', padding: '10px 14px', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none', width: '100%' }}>
                <option value="" style={{ background: '#0a0a0a' }}>— Sin asignar —</option>
                {FUNNEL_STEPS.map(step => (
                  <option key={step.key} value={step.key} style={{ background: '#0a0a0a' }}>{step.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className={styles.formGroup}>
                <label>Fecha Inicio</label>
                <input type="date" value={editForm.fecha_inicio} onChange={e => setEditForm({ ...editForm, fecha_inicio: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>Fecha Fin</label>
                <input type="date" value={editForm.fecha_fin} onChange={e => setEditForm({ ...editForm, fecha_fin: e.target.value })} />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnCancel} onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button type="submit" className={styles.btnSubmit} disabled={modalLoading}>{modalLoading ? '...' : 'Guardar Cambios'}</button>
            </div>
          </form>
        </ModalPortal>
      )}

      {/* === PORTAL: MÉTRICA === */}
      {showMetricModal && (
        <ModalPortal onClose={() => { setShowMetricModal(false); setEditingMetric(null); setNewMetric({ nombre_metrica: '', valor: '' }); }}>
          <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'white' }}>{editingMetric ? 'Editar Métrica' : 'Registrar Nueva Métrica'}</h3>
          <form onSubmit={handleSaveMetric} className={styles.modalForm}>
            <div className={styles.formGroup}>
              <label>Nombre de la Métrica</label>
              <input type="text" required placeholder="Ej. Tasa de Conversión" value={newMetric.nombre_metrica} onChange={e => setNewMetric({ ...newMetric, nombre_metrica: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Valor (Numérico)</label>
              <input type="number" step="0.01" required placeholder="Ej. 12.5" value={newMetric.valor} onChange={e => setNewMetric({ ...newMetric, valor: e.target.value })} />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnCancel} onClick={() => { setShowMetricModal(false); setEditingMetric(null); setNewMetric({ nombre_metrica: '', valor: '' }); }}>Cancelar</button>
              <button type="submit" className={styles.btnSubmit} disabled={modalLoading}>{modalLoading ? '...' : editingMetric ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </ModalPortal>
      )}

      {/* === PORTAL: APRENDIZAJE === */}
      {showLearningModal && (
        <ModalPortal onClose={() => setShowLearningModal(false)}>
          <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'white' }}>Registrar Nuevo Aprendizaje</h3>
          <form onSubmit={handleSaveLearning} className={styles.modalForm}>
            <div className={styles.formGroup}>
              <label>Hipótesis Central</label>
              <textarea required rows={4} placeholder="¿Qué probamos?" value={newLearning.hipotesis} onChange={e => setNewLearning({ ...newLearning, hipotesis: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Resultado Observado</label>
              <textarea required rows={4} placeholder="¿Qué pasó en la realidad?" value={newLearning.resultado} onChange={e => setNewLearning({ ...newLearning, resultado: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Insights Clave</label>
              <textarea rows={4} placeholder="Conclusiones..." value={newLearning.insights} onChange={e => setNewLearning({ ...newLearning, insights: e.target.value })} />
            </div>
            <div className={styles.formRowCheck}>
              <input type="checkbox" id="validado" checked={newLearning.validado} onChange={e => setNewLearning({ ...newLearning, validado: e.target.checked })} />
              <label htmlFor="validado">¿Hipótesis Validada Exitosamente?</label>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnCancel} onClick={() => setShowLearningModal(false)}>Cancelar</button>
              <button type="submit" className={styles.btnSubmit} disabled={modalLoading}>{modalLoading ? '...' : 'Guardar'}</button>
            </div>
          </form>
        </ModalPortal>
      )}
    </div>
  );
}
