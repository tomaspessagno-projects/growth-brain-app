"use client";
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface TrendData {
  date: string;
  experiments: number;
  learning: number;
}

interface GrowthTrendsProps {
  data: TrendData[];
}

export default function GrowthTrends({ data }: GrowthTrendsProps) {
  return (
    <div style={{ width: '100%', height: 300, background: 'transparent' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#002D5F" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#002D5F" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            stroke="#BDC5D0" 
            fontSize={11} 
            fontWeight={600}
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            stroke="#BDC5D0" 
            fontSize={11} 
            fontWeight={600}
            tickLine={false} 
            axisLine={false} 
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #EBF0F5',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#002D5F',
              boxShadow: '0 10px 30px rgba(0, 45, 95, 0.1)',
              padding: '12px'
            }}
            itemStyle={{ color: '#002D5F', fontWeight: 700 }}
          />
          <Area 
            type="monotone" 
            dataKey="experiments" 
            stroke="#002D5F" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorExp)" 
            name="Experimentos"
          />
          <Area 
            type="monotone" 
            dataKey="learning" 
            stroke="#6B9EF2" 
            strokeDasharray="6 6"
            fillOpacity={0} 
            strokeWidth={2}
            name="Aprendizajes"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
