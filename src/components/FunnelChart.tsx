"use client";
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList
} from 'recharts';
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
  data: StepData[];
  highlightStep?: string;
  compact?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const step = FUNNEL_STEPS.find(s => s.key === data.key);
    const exps = data.experiments;

    return (
      <div style={{
        backgroundColor: '#000',
        border: '1px solid #333',
        padding: '12px',
        color: '#fff',
        borderRadius: '4px',
        fontSize: '11px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
      }}>
        <p style={{ fontWeight: 'bold', borderBottom: '1px solid #222', paddingBottom: '6px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {step?.label}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span>Registros:</span>
            <span style={{ fontWeight: 'bold' }}>{data.value?.toLocaleString('es-AR')}</span>
          </div>
          {data.conversion && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', color: '#888' }}>
              <span>Conv. vs Anterior:</span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>{data.conversion}</span>
            </div>
          )}
          {exps && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginTop: '4px', borderTop: '0.5px solid #222', paddingTop: '4px' }}>
                <span>Experimentos:</span>
                <span style={{ color: '#fff' }}>[{exps.total}]</span>
              </div>
              <div style={{ paddingLeft: '8px', color: '#666' }}>
                <div>• En curso: {exps.en_curso}</div>
                <div>• Finalizados: {exps.finalizado}</div>
              </div>
            </>
          )}
          {data.learnings?.total > 0 && (
            <div style={{ borderTop: '1px solid #222', marginTop: '6px', paddingTop: '6px' }}>
              <span>Aprendizajes: {data.learnings.total}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function FunnelChart({ data, highlightStep, compact = false }: FunnelChartProps) {
  // Solo los 7 pasos principales
  const chartData = FUNNEL_STEPS.map((step, idx) => {
    const stepData = data.find(d => d.key === step.key);
    
    // Calcular conversión
    let conversion = '';
    if (idx > 0) {
      const prevData = data.find(d => d.key === FUNNEL_STEPS[idx - 1].key);
      if (prevData?.value && stepData?.value) {
        conversion = `${((stepData.value / prevData.value) * 100).toFixed(0)}%`;
      }
    }

    return {
      name: step.shortLabel,
      key: step.key,
      value: stepData?.value || 0,
      conversion,
      ...stepData
    };
  });

  if (compact) {
    return (
      <div style={{ width: '100%', height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: -30, right: 10 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.key === highlightStep ? '#FFFFFF' : '#222222'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: 450, marginTop: '20px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          layout="vertical" 
          barSize={24} 
          margin={{ top: 20, right: 80, left: 40, bottom: 20 }}
        >
          <XAxis type="number" hide />
          <YAxis 
            type="category" 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            fontSize={10} 
            stroke="#666"
            width={70}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar 
            dataKey="value" 
            radius={[0, 4, 4, 0]}
            animationDuration={1500}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={index === 0 ? '#FFFFFF' : '#111111'}
                stroke={index === 0 ? 'none' : '#333'}
                strokeWidth={1}
              />
            ))}
            <LabelList 
              dataKey="value" 
              position="right" 
              formatter={(val: any) => typeof val === 'number' && val > 0 ? val.toLocaleString('es-AR') : ''}
              style={{ fill: '#fff', fontSize: '11px', fontWeight: 'bold' }} 
              offset={10}
            />
            <LabelList 
              dataKey="conversion" 
              position="right" 
              style={{ fill: '#666', fontSize: '10px', fontWeight: 'bold' }} 
              offset={55}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
