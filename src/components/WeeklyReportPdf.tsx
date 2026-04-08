import React, { forwardRef } from 'react';

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
    <div ref={ref} style={{ padding: '40px', fontFamily: '"Arial", sans-serif', color: '#000', backgroundColor: '#fff', width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>Weekly Growth Report</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>
            Semana del {weekStartStr} al {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>GROWTH BRAIN AI</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>Fecha de Emisión: {printDate}</p>
        </div>
      </div>

      {/* AI Executive Summary */}
      <div style={{ backgroundColor: '#f9f9f9', border: '1px solid #ddd', padding: '24px', borderRadius: '4px', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0', color: '#333' }}>
          Resumen Ejecutivo Generado por IA
        </h2>
        <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
          {aiSummary || "Analizando el volumen de datos de la semana..."}
        </p>
      </div>

      {/* Experiments Listing */}
      <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '20px' }}>
        Trazabilidad de Experimentos ({data.length})
      </h2>

      {data.length === 0 ? (
        <p style={{ fontSize: '14px', fontStyle: 'italic', letterSpacing: '0.5px' }}>No se registraron actualizaciones de experimentos en estos 7 días.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {data.map((exp) => (
            <div key={exp.id} style={{ borderLeft: '4px solid #333', paddingLeft: '16px', pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{exp.nombre}</h3>
                <span style={{ fontSize: '11px', padding: '4px 8px', border: '1px solid #000', borderRadius: '2px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {exp.estado}
                </span>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#444' }}>{exp.descripcion}</p>
              
              {/* Resumen de Métricas o Aprendizajes si tiene */}
              {exp.aprendizajes && exp.aprendizajes.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <strong style={{ fontSize: '12px', textTransform: 'uppercase' }}>Último Aprendizaje Clave:</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', backgroundColor: '#f0f0f0', padding: '8px', borderLeft: exp.aprendizajes[0].validado ? '3px solid #10b981' : '3px solid #ef4444' }}>
                    {exp.aprendizajes[0].insights}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '50px', borderTop: '1px solid #ddd', paddingTop: '16px', textAlign: 'center', fontSize: '10px', color: '#888' }}>
        Documento autogenerado por Growth Brain AI. Confidencial.
      </div>
    </div>
  );
});

WeeklyReportPdf.displayName = 'WeeklyReportPdf';
export default WeeklyReportPdf;
