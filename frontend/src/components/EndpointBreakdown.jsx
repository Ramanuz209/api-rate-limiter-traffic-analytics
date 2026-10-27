import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function EndpointBreakdown({ endpoints = [], clients = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top Endpoints */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur shadow-xl">
        <h3 className="text-base font-semibold text-white mb-1">Top API Endpoints</h3>
        <p className="text-xs text-slate-400 mb-4">Most requested resources and latency</p>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={endpoints}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis dataKey="endpoint" type="category" stroke="#94a3b8" fontSize={10} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="count" name="Total Calls" fill="#38bdf8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Clients by Traffic */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur shadow-xl">
        <h3 className="text-base font-semibold text-white mb-1">Top Clients by Traffic</h3>
        <p className="text-xs text-slate-400 mb-4">Volume breakdown and rate-limit hits</p>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={clients}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis dataKey="clientName" type="category" stroke="#94a3b8" fontSize={10} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="totalRequests" name="Allowed Calls" fill="#818cf8" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="blockedRequests" name="Rate-Limited" fill="#f43f5e" stackId="a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

