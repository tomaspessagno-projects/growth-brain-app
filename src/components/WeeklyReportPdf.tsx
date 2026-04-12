import React, { forwardRef } from 'react';
import { FUNNEL_STEPS } from '@/config/funnel';

interface WeeklyReportPdfProps {
  data: any[];
  aiSummary: string;
}

const WeeklyReportPdf = forwardRef<HTMLDivElement, WeeklyReportPdfProps>(({ data, aiSummary }, ref) => {
  const printDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  // Estilos base institucionales
  const NAVY = '#002D5F';
  const SKY_BLUE = '#6B9EF2';
  const LIGHT_BG = '#F8F9FA';
  const BORDER = '#EBF0F5';

  return (
    <div ref={ref} style={{ padding: '60px', fontFamily: '"Montserrat", "Inter", sans-serif', color: '#333', backgroundColor: '#fff', width: '210mm', minHeight: '297mm', boxSizing: 'border-box', position: 'relative' }}>
      
      {/* Marcador lateral institucional */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '10px', backgroundColor: NAVY }}></div>

      {/* Header */}
      <div style={{ paddingBottom: '32px', marginBottom: '40px', borderBottom: `2.5px solid ${NAVY}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: NAVY, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '18px' }}>G</div>
            <span style={{ fontSize: '14px', fontWeight: 800, color: NAVY, letterSpacing: '1px', textTransform: 'uppercase' }}>Growth Brain AI</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '-1.5px', lineHeight: 1 }}>Reporte Ejecutivo</h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '15px', color: '#888', fontWeight: 600 }}>
            Periodo Estratégico: {weekStartStr} — {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: NAVY }}>MEDICUS CORPORATE</p>
          <p style={{ margin: 0, fontSize: '11px', color: '#999', fontWeight: 500 }}>{printDate}</p>
        </div>
      </div>

      {/* Strategic Summary (Gemini AI) */}
      <div style={{ backgroundColor: LIGHT_BG, padding: '32px', borderRadius: '24px', marginBottom: '48px', borderLeft: `6px solid ${SKY_BLUE}` }}>
        <h2 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 12px 0', color: SKY_BLUE, fontWeight: 800 }}>
          Análisis de Velocidad y Crecimiento (AI)
        </h2>
        <p style={{ fontSize: '15px', lineHeight: '1.7', margin: 0, color: NAVY, fontWeight: 500, fontStyle: 'italic' }}>
          &quot;{aiSummary || "Analizando los deltas de conversión de la semana para optimizar la toma de decisiones..."}&quot;
        </p>
      </div>

      {/* Table Structure */}
      <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 20px 8px', color: NAVY, fontWeight: 900 }}>
        Detalle de Experimentos e Impacto Real
      </h2>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px', fontSize: '12px' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: NAVY }}>
            <th style={{ padding: '0 16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1px' }}>INICIATIVA</th>
            <th style={{ padding: '0 16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1px' }}>ETAPA FUNNEL</th>
            <th style={{ padding: '0 16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1px' }}>DELTAS (i/a/Δ)</th>
            <th style={{ padding: '0 16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1px', textAlign: 'center' }}>RESULTADO</th>
            <th style={{ padding: '0 16px', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1px' }}>CONCLUSIÓN ESTRATÉGICA</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '60px 0', textAlign: 'center', color: '#BDC5D0', fontWeight: 600, fontSize: '14px' }}>
                No se registraron iniciativas críticas en este periodo semanal.
              </td>
            </tr>
          ) : (
            data.map((exp) => {
              const step = FUNNEL_STEPS.find(s => s.key === exp.funnel_step);
              const isPositive = parseFloat(exp.delta_porcentaje) > 0;
              const deltaColor = isPositive ? '#10B981' : (parseFloat(exp.delta_porcentaje) < 0 ? '#EF4444' : '#888');
              
              return (
                <tr key={exp.id} style={{ verticalAlign: 'top' }}>
                  <td style={{ padding: '20px 16px', backgroundColor: LIGHT_BG, borderRadius: '16px 0 0 16px' }}>
                    <div style={{ fontWeight: 800, color: NAVY, fontSize: '13px', marginBottom: '4px' }}>{exp.nombre}</div>
                    <div style={{ fontSize: '10px', color: '#999', lineHeight: '1.4', fontWeight: 500 }}>{exp.categoria || 'Genérico'}</div>
                  </td>
                  <td style={{ padding: '20px 16px', backgroundColor: LIGHT_BG }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, background: '#EBF0F5', color: NAVY, padding: '4px 8px', borderRadius: '40px', textTransform: 'uppercase' }}>
                      {step?.shortLabel || exp.funnel_step || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '20px 16px', backgroundColor: LIGHT_BG }}>
                    <div style={{ color: '#888', fontWeight: 600, fontSize: '11px' }}>{exp.metrica_inicial?.toLocaleString()} → {exp.metrica_actual?.toLocaleString()}</div>
                    <div style={{ fontWeight: 900, color: deltaColor, fontSize: '14px', marginTop: '4px' }}>
                      {isPositive ? '↑' : (parseFloat(exp.delta_porcentaje) < 0 ? '↓' : '•')} {Math.abs(parseFloat(exp.delta_porcentaje))}%
                    </div>
                  </td>
                  <td style={{ padding: '20px 16px', backgroundColor: LIGHT_BG, textAlign: 'center' }}>
                    {exp.es_exito ? (
                      <div style={{ color: '#10B981', background: '#ECFDF5', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '1.5px solid #10B981' }}>
                        <span style={{ fontSize: '16px', fontWeight: 900 }}>✓</span>
                      </div>
                    ) : (
                      <div style={{ color: '#EF4444', background: '#FEF2F2', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '1.5px solid #EF4444' }}>
                        <span style={{ fontSize: '16px', fontWeight: 900 }}>✕</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '20px 16px', backgroundColor: LIGHT_BG, borderRadius: '0 16px 16px 0', fontSize: '11px', lineHeight: '1.6', color: '#555', fontWeight: 500 }}>
                    {exp.conclusion}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Global Metadata */}
      <div style={{ marginTop: '40px', padding: '24px', border: `1px dashed ${BORDER}`, borderRadius: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '10px', color: '#999', fontWeight: 600 }}>ID REPORTE: {Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
        <div style={{ fontSize: '10px', color: '#999', fontWeight: 600 }}>ENGINE: GROWTH BRAIN ACE v3.0</div>
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '60px', left: '60px', right: '60px', textAlign: 'center', fontSize: '10px', color: '#BDC5D0', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
        Este documento contiene información estratégica confidencial propiedad de MEDICUS S.A.
      </div>
    </div>
  );
});

WeeklyReportPdf.displayName = 'WeeklyReportPdf';
export default WeeklyReportPdf;
