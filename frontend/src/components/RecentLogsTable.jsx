import React, { useState } from 'react';
import { Search, Filter, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function RecentLogsTable({ logs = [] }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (filterStatus === 'allowed' && log.isBlocked) return false;
    if (filterStatus === 'blocked' && !log.isBlocked) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchClient = log.clientName?.toLowerCase().includes(q);
      const matchEndpoint = log.endpoint?.toLowerCase().includes(q);
      const matchIp = log.ip?.toLowerCase().includes(q);
      return matchClient || matchEndpoint || matchIp;
    }
    return true;
  });

  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Audit & Traffic Stream</span>
          </h3>
          <p className="text-xs text-slate-400">Live request inspection and policy enforcement events</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search endpoint, client, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-sky-500 w-56"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filterStatus === 'all' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilterStatus('allowed')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filterStatus === 'allowed' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Allowed
            </button>
            <button
              onClick={() => setFilterStatus('blocked')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filterStatus === 'blocked' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Blocked (429)
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs text-slate-300 font-mono">
          <thead className="sticky top-0 bg-slate-950/95 uppercase tracking-wider text-slate-400 text-[11px] border-b border-slate-800 z-10">
            <tr>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Method & Endpoint</th>
              <th className="py-3 px-4">Client Identity</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Latency</th>
              <th className="py-3 px-4">Policy Enforcement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, index) => {
                const isBlocked = log.isBlocked || log.statusCode === 429;
                return (
                  <tr key={log.id || index} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.method === 'POST' ? 'bg-purple-500/20 text-purple-300' : 'bg-sky-500/20 text-sky-300'
                          }`}
                        >
                          {log.method}
                        </span>
                        <span className="text-slate-200">{log.endpoint}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-300">
                      {log.clientName || 'Anonymous IP'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isBlocked
                            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-medium">
                      {log.responseTimeMs} ms
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {isBlocked ? (
                        <span className="text-rose-400 font-sans">
                          {log.blockedReason || 'Quota exceeded (429)'}
                        </span>
                      ) : (
                        <span className="text-emerald-400/80 font-sans">
                          Quota respected
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-500">
                  No matching request logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

