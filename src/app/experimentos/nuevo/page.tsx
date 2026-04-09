"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { FUNNEL_STEPS } from '@/config/funnel';
import styles from './nuevo.module.css';

export default function NuevoExperimento() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    estado: 'planeado',
    funnel_step: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!formData.nombre) {
      setErrorMsg('El nombre es requerido.');
      setLoading(false);
      return;
    }

    // Format dates back to ISO if provided, or leave them null
    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || null,
      estado: formData.estado,
      funnel_step: formData.funnel_step || null,
      ...(formData.fecha_inicio ? { fecha_inicio: new Date(formData.fecha_inicio).toISOString() } : {}),
      ...(formData.fecha_fin ? { fecha_fin: new Date(formData.fecha_fin).toISOString() } : {})
    };

    const { data, error } = await supabase
      .from('experimentos')
      .insert([payload])
      .select()
      .single();

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.push(`/experimentos/${data.id}`);
    }
  };

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <Link href="/experimentos" className={styles.backLink}>
        ← Volver a Experimentos
      </Link>

      <header className={styles.header}>
        <h1 className="page-title">Nuevo Experimento</h1>
        <p className="page-subtitle">Diseña una nueva iniciativa para testear tus hipótesis.</p>
      </header>

      <div className={`glass-panel ${styles.formPanel}`}>
        {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="nombre">Nombre del Experimento *</label>
            <input 
              id="nombre"
              name="nombre" 
              type="text" 
              placeholder="Ej. Nuevo diseño de Checkout" 
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="descripcion">Hipótesis / Descripción</label>
            <textarea 
              id="descripcion"
              name="descripcion" 
              rows={4}
              placeholder="¿Qué intentamos validar?"
              value={formData.descripcion}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="funnel_step">Paso del Funnel que impacta</label>
              <select id="funnel_step" name="funnel_step" value={formData.funnel_step} onChange={handleChange}>
                <option value="">— Sin asignar —</option>
                {FUNNEL_STEPS.map(step => (
                  <option key={step.key} value={step.key}>{step.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="fecha_inicio">Fecha de Inicio Estimada</label>
              <input 
                id="fecha_inicio"
                name="fecha_inicio" 
                type="date"
                value={formData.fecha_inicio}
                onChange={handleChange}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="fecha_fin">Fecha de Fin Estimada</label>
              <input 
                id="fecha_fin"
                name="fecha_fin" 
                type="date"
                value={formData.fecha_fin}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/experimentos" className={styles.cancelBtn}>Cancelar</Link>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Creando...' : 'Crear Experimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
