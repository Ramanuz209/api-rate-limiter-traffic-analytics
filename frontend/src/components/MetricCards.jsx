import React from 'react';
import { Activity, ShieldAlert, Clock, Users } from 'lucide-react';

export default function MetricCards({ overview }) {
  const cards = [
    {
      title: 'Total Traffic Volume',
      value: overview?.totalRequests?.toLocaleString() || '0',
      subtitle: `${overview?.allowedRequests?.toLocaleString() || 0} allowed requests`,
      icon: Activity,
      color: 'sky',
      border: 'border-sky-500/30',
      glow: 'shadow-sky-500/10'
    },
    {
      title: 'Rate-Limited (429)',
      value: `${overview?.blockedRate || 0}%`,
      subtitle: `${overview?.blockedRequests?.toLocaleString() || 0} blocked by policies`,
      icon: ShieldAlert,
      color: overview?.blockedRate > 20 ? 'amber' : 'emerald',
      border: overview?.blockedRate > 20 ? 'border-amber-500/30' : 'border-emerald-500/30',
      glow: overview?.blockedRate > 20 ? 'shadow-amber-500/10' : 'shadow-emerald-500/10'
    },
    {
      title: 'Average Latency',
      value: `${overview?.avgLatency || 0} ms`,
      subtitle: `Min: ${overview?.minLatency || 0}ms · Max: ${overview?.maxLatency || 0}ms`,
      icon: Clock,
      color: 'indigo',
      border: 'border-indigo-500/30',
      glow: 'shadow-indigo-500/10'
    },
    {
      title: 'Active Clients & Tiers',
      value: overview?.totalClients || '0',
      subtitle: `${overview?.totalPolicies || 0} policies · ${overview?.totalApiKeys || 0} active keys`,
      icon: Users,
      color: 'purple',
      border: 'border-purple-500/30',
      glow: 'shadow-purple-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`p-5 rounded-2xl bg-slate-900/60 border ${c.border} backdrop-blur shadow-lg ${c.glow} relative overflow-hidden transition-all hover:scale-[1.01]`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {c.title}
              </span>
              <div className={`p-2 rounded-xl bg-${c.color}-500/10 border border-${c.color}-500/20`}>
                <Icon className={`h-4 w-4 text-${c.color}-400`} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1">
              {c.value}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {c.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
}

