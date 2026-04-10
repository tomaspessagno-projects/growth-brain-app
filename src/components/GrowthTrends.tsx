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
              <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            stroke="#444" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#444" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#000', 
              border: '1px solid #333',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#fff'
            }}
            itemStyle={{ color: '#fff' }}
          />
          <Area 
            type="monotone" 
            dataKey="experiments" 
            stroke="#FFFFFF" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorExp)" 
            name="Experimentos"
          />
          <Area 
            type="monotone" 
            dataKey="learning" 
            stroke="#888888" 
            strokeDasharray="5 5"
            fillOpacity={0} 
            strokeWidth={1}
            name="Aprendizajes"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
