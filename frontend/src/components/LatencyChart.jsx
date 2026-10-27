import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function LatencyChart({ data }) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Response Latency Trend</h3>
          <p className="text-xs text-slate-400">Average response duration (ms) per minute</p>
        </div>
      </div>

      <div className="h-72 w-full">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="ms" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px'
                }}
                labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="avgLatency"
                name="Avg Latency (ms)"
                stroke="#818cf8"
                strokeWidth={2.5}
                dot={{ r: 2, fill: '#818cf8' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Waiting for latency metrics...
          </div>
        )}
      </div>
    </div>
  );
}
