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

  return (
    <div ref={ref} style={{ padding: '40px', fontFamily: 'Inter, system-ui, sans-serif', color: '#000', backgroundColor: '#fff', width: '210mm', minH: '297mm', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '3px solid #000', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-1px' }}>Executive Growth Report</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#666', fontWeight: 500 }}>
            Periodo: {weekStartStr} — {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 800 }}>MEDICUS BRAIN AI</p>
          <p style={{ margin: 0, fontSize: '11px', color: '#999' }}>{printDate}</p>
        </div>
      </div>

      {/* AI Contextual Insight */}
      <div style={{ border: '1px solid #eee', padding: '20px', borderRadius: '8px', marginBottom: '40px', backgroundColor: '#fafafa' }}>
        <h2 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 10px 0', color: '#888', fontWeight: 700 }}>
          Strategic Insight (Gemini AI)
        </h2>
        <p style={{ fontSize: '14px', lineHeight: '1.5', margin: 0, color: '#333' }}>
          {aiSummary || "Analizando los deltas de conversión de la semana..."}
        </p>
      </div>

      {/* Table Structure */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #000', color: '#000' }}>
            <th style={{ padding: '12px 8px', width: '25%' }}>INICIATIVA</th>
            <th style={{ padding: '12px 8px', width: '15%' }}>FUNNEL</th>
            <th style={{ padding: '12px 8px', width: '20%' }}>MÉTRICAS (i/a/Δ)</th>
            <th style={{ padding: '12px 8px', width: '10%', textAlign: 'center' }}>STATUS</th>
            <th style={{ padding: '12px 8px', width: '30%' }}>CONCLUSIÓN</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '40px 0', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                No se registraron experimentos activos o finalizados en este periodo.
              </td>
            </tr>
          ) : (
            data.map((exp) => {
              const step = FUNNEL_STEPS.find(s => s.key === exp.funnel_step);
              const deltaColor = parseFloat(exp.delta_porcentaje) > 0 ? '#10b981' : (parseFloat(exp.delta_porcentaje) < 0 ? '#ef4444' : '#666');
              
              return (
                <tr key={exp.id} style={{ borderBottom: '1px solid #efefef', verticalAlign: 'top' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 700, color: '#000', marginBottom: '4px' }}>{exp.nombre}</div>
                    <div style={{ fontSize: '10px', color: '#888', lineHeight: '1.3' }}>{exp.descripcion?.substring(0, 80)}...</div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>
                      {step?.shortLabel || exp.funnel_step}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ color: '#888' }}>{exp.metrica_inicial?.toLocaleString()} <span style={{ fontSize: '10px' }}>→</span> {exp.metrica_actual?.toLocaleString()}</div>
                    <div style={{ fontWeight: 800, color: deltaColor, fontSize: '13px', marginTop: '2px' }}>
                      {parseFloat(exp.delta_porcentaje) > 0 ? '↑' : '↓'} {Math.abs(parseFloat(exp.delta_porcentaje))}%
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    {exp.es_exito ? (
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '14px' }}>✓</span>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '14px' }}>✕</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '11px', lineHeight: '1.4', color: '#444' }}>
                    {exp.conclusion}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: '40px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '9px', color: '#999', letterSpacing: '0.5px' }}>
        ESTE DOCUMENTO ES CONFIDENCIAL Y PROPIEDAD DE MEDICUS GROWTH TEAM. <br />
        AUTOGENERADO POR ENGINE ACE v2.0
      </div>
    </div>
  );
});

WeeklyReportPdf.displayName = 'WeeklyReportPdf';
export default WeeklyReportPdf;
