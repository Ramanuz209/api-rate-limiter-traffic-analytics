import React from 'react';
import { Activity, ShieldCheck, Database, RefreshCw, Zap } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  autoRefresh,
  setAutoRefresh,
  health,
  onRefreshNow
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-300">
              RateFlow
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs text-slate-400 font-mono border-l border-slate-700 pl-2">
              API Traffic & Limiting Engine
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'simulator', label: 'Live Simulator' },
            { id: 'policies', label: 'Policies & Keys' },
            { id: 'logs', label: 'Audit Logs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Engine Status & Auto-refresh */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Storage / Redis Badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs">
            <ShieldCheck className={`h-3.5 w-3.5 ${health?.redisConnected ? 'text-emerald-400' : 'text-sky-400'}`} />
            <span className="text-slate-300 font-mono">
              {health?.rateLimitingEngine || 'Sliding Window'}
            </span>
          </div>

          {/* Database Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 font-mono">
            <Database className="h-3.5 w-3.5 text-indigo-400" />
            <span className="uppercase">{health?.database || 'MySQL'}</span>
          </div>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Toggle 3s live polling"
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <Activity className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{autoRefresh ? 'Live (3s)' : 'Paused'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefreshNow}
            title="Refresh metrics immediately"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

      </div>
    </header>
  );
}

