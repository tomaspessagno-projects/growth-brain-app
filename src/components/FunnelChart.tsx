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
        backgroundColor: '#fff',
        border: '1px solid #EBF0F5',
        padding: '16px',
        color: '#002D5F',
        borderRadius: '12px',
        fontSize: '12px',
        boxShadow: '0 10px 30px rgba(0, 45, 95, 0.1)'
      }}>
        <p style={{ fontWeight: 800, borderBottom: '2px solid #F8F9FA', paddingBottom: '8px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {step?.label}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px' }}>
            <span style={{ color: '#888', fontWeight: 500 }}>Registros:</span>
            <span style={{ fontWeight: 800 }}>{data.value?.toLocaleString('es-AR')}</span>
          </div>
          {data.conversion && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px' }}>
              <span style={{ color: '#888', fontWeight: 500 }}>Conversión:</span>
              <span style={{ fontWeight: 800, color: '#6B9EF2' }}>{data.conversion}</span>
            </div>
          )}
          {exps && (
            <div style={{ marginTop: '4px', borderTop: '2px solid #F8F9FA', paddingTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#888', fontWeight: 500 }}>Iniciativas:</span>
                <span style={{ fontWeight: 700 }}>{exps.total}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                • Activas: {exps.en_curso} | Finalizadas: {exps.finalizado}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function FunnelChart({ data, highlightStep, compact = false }: FunnelChartProps) {
  const chartData = FUNNEL_STEPS.map((step, idx) => {
    const stepData = data.find(d => d.key === step.key);
    
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
                  fill={entry.key === highlightStep ? '#002D5F' : '#EBF0F5'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: 220, marginTop: '10px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          layout="vertical" 
          barSize={14} 
          margin={{ top: 0, right: 140, left: 40, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis 
            type="category" 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            fontSize={11} 
            fontWeight={700}
            stroke="#002D5F"
            width={85}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'rgba(0, 45, 95, 0.02)' }}
          />
          <Bar 
            dataKey="value" 
            radius={[0, 7, 7, 0]}
            animationDuration={1500}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={index === 0 ? '#002D5F' : `rgba(0, 45, 95, ${1 - index * 0.1})`}
              />
            ))}
            <LabelList 
              dataKey="value" 
              position="right" 
              content={(props: any) => {
                const { x, y, width, value, index } = props;
                const entry = chartData[index];
                const percentage = entry.conversion ? ` (${entry.conversion})` : '';
                const displayVal = typeof value === 'number' && value > 0 ? value.toLocaleString('es-AR') : '';
                
                return (
                  <text 
                    x={x + width + 10} 
                    y={y + 12} 
                    fill="#002D5F" 
                    fontSize="11px" 
                    fontWeight="800"
                    textAnchor="start"
                  >
                    {displayVal}
                    <tspan fill="#6B9EF2" fontWeight="700" fontSize="10px">
                      {percentage}
                    </tspan>
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
