"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import styles from './CorrelationAnalysis.module.css';

interface CorrelationProps {
  categoria: string;
  funnelStep: string;
  currentExperimentId: string;
}

export default function CorrelationAnalysis({ categoria, funnelStep, currentExperimentId }: CorrelationProps) {
  const [stats, setStats] = useState<{ successRate: number; totalExperiments: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoria) {
      setLoading(false);
      return;
    }

    const fetchCorrelationData = async () => {
      setLoading(true);
      // Fetch all experiments of the same category
      const { data: experiments } = await supabase
        .from('experimentos')
        .select('id, aprendizajes(validado)')
        .eq('categoria', categoria)
        .neq('id', currentExperimentId);

      if (experiments && experiments.length > 0) {
        let totalLearnings = 0;
        let validatedLearnings = 0;

        experiments.forEach((exp: any) => {
          if (exp.aprendizajes) {
            totalLearnings += exp.aprendizajes.length;
            validatedLearnings += exp.aprendizajes.filter((l: any) => l.validado).length;
          }
        });

        const successRate = totalLearnings > 0 ? (validatedLearnings / totalLearnings) * 100 : 0;
        setStats({
          successRate: Math.round(successRate),
          totalExperiments: experiments.length
        });
      } else {
        setStats(null);
      }
      setLoading(false);
    };

    fetchCorrelationData();
  }, [categoria, currentExperimentId]);

  if (loading) return <div className={styles.loading}>Analizando correlaciones históricas...</div>;
  if (!categoria) return <div className={styles.empty}>Asigna una categoría para activar el análisis de correlación.</div>;
  if (!stats) return <div className={styles.empty}>Primer experimento de esta categoría. Iniciando base de conocimiento.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.categoryTag}>{categoria}</span>
        <h4 className={styles.title}>Insight de Categoría</h4>
      </div>
      
      <div className={styles.content}>
        <div className={styles.matrix}>
          <div className={styles.statBox}>
            <span className={styles.value}>{stats.successRate}%</span>
            <span className={styles.label}>Tasa de Validación</span>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.statBox}>
            <span className={styles.value}>{stats.totalExperiments}</span>
            <span className={styles.label}>Casos Previos</span>
          </div>
        </div>

        <p className={styles.recommendation}>
          {stats.successRate > 50 
            ? `Los experimentos de ${categoria} tienen una alta probabilidad de éxito en Medicus. Recomendamos proceder con confianza.`
            : `Históricamente, ${categoria} ha sido difícil de validar. Asegúrate de que la hipótesis sea extremadamente específica.`}
        </p>
      </div>
    </div>
  );
}
