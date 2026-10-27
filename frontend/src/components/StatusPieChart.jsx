import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = {
  200: '#10b981', // emerald
  429: '#f43f5e', // rose
  401: '#f59e0b', // amber
  500: '#a855f7'  // purple
};

export default function StatusPieChart({ data }) {
  const chartData = data && data.length > 0 ? data : [
    { name: '200 OK', count: 1, status: 200 }
  ];

  return (
    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur shadow-xl">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">HTTP Status Code Distribution</h3>
        <p className="text-xs text-slate-400">Ratio of successful vs rate-limited vs failed responses</p>
      </div>

      <div className="h-64 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="count"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.status] || '#64748b'}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '12px'
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry) => (
                <span className="text-xs text-slate-300 font-medium">
                  {value} ({entry.payload.count})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

