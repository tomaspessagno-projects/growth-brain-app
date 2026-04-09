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
            }}>
              {/* Step number */}
              <span style={{
                fontSize: compact ? '10px' : '11px',
                color: isHighlighted ? '#ffffff' : '#555',
                fontWeight: isHighlighted ? '700' : '400',
                minWidth: compact ? '14px' : '16px',
                textAlign: 'right',
              }}>
                {idx + 1}
              </span>

              {/* Label */}
              <span style={{
                fontSize: compact ? '10px' : '12px',
                color: isHighlighted ? '#ffffff' : '#888',
                fontWeight: isHighlighted ? '600' : '400',
                minWidth: compact ? '90px' : '160px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {compact ? step.shortLabel : step.label}
              </span>

              {/* Bar */}
              <div style={{ flex: 1, position: 'relative', height: compact ? '18px' : '24px' }}>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${widthPct}%`,
                  background: isHighlighted
                    ? '#ffffff'
                    : value === null
                      ? '#1a1a1a'
                      : '#333',
                  borderRadius: '2px',
                  transition: 'width 0.6s ease',
                  border: isHighlighted ? '1px solid #fff' : '1px solid #222',
                }} />
              </div>

              {/* Value */}
              <span style={{
                fontSize: compact ? '11px' : '13px',
                fontWeight: '700',
                color: isHighlighted ? '#ffffff' : value !== null ? '#aaa' : '#333',
                minWidth: compact ? '40px' : '60px',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {value !== null ? value.toLocaleString('es-AR') : '—'}
              </span>

              {/* Conversion % */}
              {!compact && (
                <span style={{
                  fontSize: '10px',
                  color: conversionPct ? '#10b981' : '#333',
                  minWidth: '48px',
                  textAlign: 'right',
                }}>
                  {conversionPct ? `${conversionPct}%` : ''}
                </span>
              )}

              {/* Experiment count badge */}
              {experiments !== undefined && !compact && (
                <div style={{ position: 'relative' }}>
                  <span style={{
                    fontSize: '10px',
                    background: experiments.total > 0 ? '#1a1a1a' : 'transparent',
                    border: experiments.total > 0 ? '1px solid #333' : '1px solid #1a1a1a',
                    color: experiments.total > 0 ? '#aaa' : '#333',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    cursor: experiments.total > 0 ? 'default' : 'default',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: '28px',
                    textAlign: 'center',
                    display: 'inline-block',
                  }}>
                    {experiments.total > 0 ? `${experiments.total} exp` : '—'}
                  </span>

                  {/* Hover tooltip para desglose de experimentos */}
                  {isHovered && experiments.total > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-80px',
                      right: 0,
                      background: '#0a0a0a',
                      border: '1px solid #222',
                      borderRadius: '6px',
                      padding: '12px 16px',
                      zIndex: 1000,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
                    }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {step.label}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', fontSize: '12px' }}>
                          <span style={{ color: '#3b82f6' }}>● En Curso</span>
                          <span style={{ color: '#aaa', fontWeight: '700' }}>{experiments.en_curso}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', fontSize: '12px' }}>
                          <span style={{ color: '#10b981' }}>● Finalizado</span>
                          <span style={{ color: '#aaa', fontWeight: '700' }}>{experiments.finalizado}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', fontSize: '12px' }}>
                          <span style={{ color: '#666' }}>● Planeado</span>
                          <span style={{ color: '#aaa', fontWeight: '700' }}>{experiments.planeado}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Leyenda de columnas */}
      {!compact && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #1a1a1a',
        }}>
          <span style={{ minWidth: '16px' }} />
          <span style={{ fontSize: '10px', color: '#333', minWidth: '160px' }}>PASO</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '10px', color: '#333', minWidth: '60px', textAlign: 'right' }}>VALOR</span>
          <span style={{ fontSize: '10px', color: '#333', minWidth: '48px', textAlign: 'right' }}>CONV.</span>
          <span style={{ fontSize: '10px', color: '#333', minWidth: '60px', textAlign: 'right' }}>EXP.</span>
        </div>
      )}
    </div>
  );
}
