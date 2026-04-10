"use client";
import React, { useState } from 'react';
import { FUNNEL_STEPS } from '@/config/funnel';

interface StepData {
  key: string;
  value: number | null;
  experiments?: {
    total: number;
    en_curso: number;
    finalizado: number;
    planeado: number;
  };
  learnings?: {
    total: number;
    validated: number;
  };
}

interface FunnelChartProps {
  data: StepData[];               // Un objeto por cada uno de los 7 pasos
  highlightStep?: string;         // Key del paso que este experimento está impactando
  compact?: boolean;              // Si es true, versión pequeña para el experimento
}

export default function FunnelChart({ data, highlightStep, compact = false }: FunnelChartProps) {
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);

  // Encontrar el máximo para calcular proporciones
  const maxValue = Math.max(...data.map(d => d.value ?? 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '6px' : '10px', width: '100%' }}>
      {/* Header de columnas — solo en modo completo */}
      {!compact && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #1a1a1a',
          marginBottom: '4px',
        }}>
          <span style={{ fontSize: '10px', color: '#666', minWidth: '16px' }} />
          <span style={{ fontSize: '10px', color: '#666', minWidth: '200px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Etapa</span>
          <span style={{ fontSize: '10px', color: '#666', minWidth: '100px', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conversión</span>
          <span style={{ fontSize: '10px', color: '#666', minWidth: '100px', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Experimentos</span>
        </div>
      )}
      {FUNNEL_STEPS.map((step, idx) => {
        const stepData = data.find(d => d.key === step.key);
        const value = stepData?.value ?? null;
        const widthPct = value !== null ? Math.max((value / maxValue) * 100, 4) : 4;
        const isHighlighted = step.key === highlightStep;
        const isHovered = hoveredStep === step.key;

        // Conversión: % respecto al paso anterior
        let conversionPct: string | null = null;
        if (idx > 0 && value !== null) {
          const prevData = data.find(d => d.key === FUNNEL_STEPS[idx - 1].key);
          const prevVal = prevData?.value;
          if (prevVal && prevVal > 0) {
            conversionPct = ((value / prevVal) * 100).toFixed(1);
          }
        }

        const experiments = stepData?.experiments;

        return (
          <div
            key={step.key}
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredStep(step.key)}
            onMouseLeave={() => setHoveredStep(null)}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: compact ? '8px' : '12px',
              padding: '8px 0',
              borderBottom: '1px solid #0f0f0f',
            }}>
              {/* Etapa (Paso + Nombre) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' }}>
                <span style={{ fontSize: '10px', color: '#333', width: '12px' }}>{idx + 1}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontSize: compact ? '11px' : '13px',
                    color: isHighlighted ? '#fff' : '#ccc',
                    fontWeight: isHighlighted ? '600' : '400',
                  }}>
                    {compact ? step.shortLabel : step.label}
                  </span>
                  {!compact && value !== null && (
                    <span style={{ fontSize: '10px', color: '#555' }}>
                      {value.toLocaleString('es-AR')} unidades
                    </span>
                  )}
                </div>
              </div>

              {/* Tasa de Conversión */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '100px' }}>
                {conversionPct ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>{conversionPct}%</span>
                    <span style={{ fontSize: '8px', color: '#333', textTransform: 'uppercase' }}>Conv.</span>
                  </div>
                ) : (
                  <span style={{ color: '#1a1a1a' }}>—</span>
                )}
              </div>

              {/* Cantidad de Experimentos y Desglose (Hover) */}
              <div style={{ minWidth: '100px', display: 'flex', justifyContent: 'flex-end', position: 'relative' }}>
                {experiments !== undefined && (
                  <>
                    <div style={{ 
                      background: experiments.total > 0 ? '#111' : 'transparent',
                      border: '1px solid #222',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ fontSize: '12px', color: experiments.total > 0 ? '#fff' : '#444', fontWeight: '600' }}>
                        {experiments.total}
                      </span>
                      <span style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>Exp.</span>
                    </div>

                    {/* Desglose Tooltip (Hover) */}
                    {isHovered && experiments.total > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        background: '#0a0a0a',
                        border: '1px solid #222',
                        borderRadius: '6px',
                        padding: '12px 16px',
                        zIndex: 10000,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.9)',
                      }}>
                         <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Desglose: {step.label}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', fontSize: '12px' }}>
                            <span style={{ color: '#3b82f6' }}>En Curso</span>
                            <span style={{ color: '#fff', fontWeight: '700' }}>{experiments.en_curso}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', fontSize: '12px' }}>
                            <span style={{ color: '#10b981' }}>Finalizado</span>
                            <span style={{ color: '#fff', fontWeight: '700' }}>{experiments.finalizado}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', fontSize: '12px' }}>
                            <span style={{ color: '#666' }}>Planeado</span>
                            <span style={{ color: '#fff', fontWeight: '700' }}>{experiments.planeado}</span>
                          </div>
                          
                          {stepData?.learnings && stepData.learnings.total > 0 && (
                            <>
                              <div style={{ height: '1px', background: '#222', margin: '8px 0' }} />
                              <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px', textTransform: 'uppercase' }}>Memoria</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', fontSize: '12px' }}>
                                <span style={{ color: '#aaa' }}>Aprendizajes</span>
                                <span style={{ color: '#fff', fontWeight: '700' }}>{stepData.learnings.total}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', fontSize: '12px' }}>
                                <span style={{ color: '#10b981' }}>Validados</span>
                                <span style={{ color: '#fff', fontWeight: '700' }}>{stepData.learnings.validated}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Barra visual sutil como fondo o indicador de progreso */}
            <div style={{ 
              position: 'absolute', 
              left: 0, 
              bottom: 0, 
              height: '1px', 
              width: `${widthPct}%`, 
              background: isHighlighted ? '#fff' : '#333',
              opacity: 0.3,
            }} />
          </div>
        );
      })}

    </div>
  );
}
