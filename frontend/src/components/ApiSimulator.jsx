import React, { useState } from 'react';
import { Play, Zap, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

const PRESET_KEYS = [
  {
    name: 'Acme Enterprise (200 req / min)',
    key: 'key_enterprise_live_9999',
    tier: 'Enterprise',
    limit: 200,
    window: '60s'
  },
  {
    name: 'Fintech Payments (60 req / min)',
    key: 'key_standard_live_5555',
    tier: 'Standard',
    limit: 60,
    window: '60s'
  },
  {
    name: 'Indie App (20 req / min)',
    key: 'key_free_live_1111',
    tier: 'Free',
    limit: 20,
    window: '60s'
  },
  {
    name: 'Demo Strict Burst (5 req / 10s - Test 429)',
    key: 'key_strict_live_0005',
    tier: 'Strict',
    limit: 5,
    window: '10s'
  },
  {
    name: 'Anonymous (IP Fallback - No Key)',
    key: '',
    tier: 'Anonymous',
    limit: 30,
    window: '60s'
  }
];

export default function ApiSimulator({ onTrafficTriggered }) {
  const [selectedKeyObj, setSelectedKeyObj] = useState(PRESET_KEYS[3]); // default to strict burst
  const [customKey, setCustomKey] = useState('');
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [endpoint, setEndpoint] = useState('/api/v1/data');
  const [burstCount, setBurstCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [burstResult, setBurstResult] = useState(null);

  const activeApiKey = useCustomKey ? customKey : selectedKeyObj.key;

  const handleRunBurst = async () => {
    setLoading(true);
    setBurstResult(null);
    try {
      const res = await api.sendBurst(activeApiKey, endpoint, burstCount);
      setBurstResult(res);
      if (onTrafficTriggered) {
        // Trigger live refresh of analytics
        setTimeout(onTrafficTriggered, 500);
      }
    } catch (err) {
      console.error('Simulator error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-900/40 via-slate-900/60 to-indigo-900/40 border border-sky-500/20 backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Zap className="h-5 w-5 text-sky-400" />
              <span>Live API Rate Limiting Simulator & Concurrency Tester</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Simulate burst traffic and test concurrent race-condition handling in real-time.
              Select a client key and burst size to watch atomic sliding-window enforcement in action.
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          
          {/* 1. Client / Key Preset */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Client & Rate Limit Policy
            </label>
            <select
              value={useCustomKey ? 'custom' : selectedKeyObj.name}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setUseCustomKey(true);
                } else {
                  setUseCustomKey(false);
                  const found = PRESET_KEYS.find(k => k.name === e.target.value);
                  if (found) setSelectedKeyObj(found);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500"
            >
              {PRESET_KEYS.map((k, i) => (
                <option key={i} value={k.name}>
                  {k.name}
                </option>
              ))}
              <option value="custom">-- Custom API Key --</option>
            </select>

            {useCustomKey && (
              <input
                type="text"
                placeholder="Enter custom API key..."
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                className="mt-2 w-full bg-slate-950 border border-slate-700 text-white text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
              />
            )}

            <div className="mt-2 flex items-center space-x-2 text-xs text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">
                Quota: {selectedKeyObj.limit} reqs / {selectedKeyObj.window}
              </span>
            </div>
          </div>

          {/* 2. Target Endpoint */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Target API Endpoint
            </label>
            <select
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 font-mono"
            >
              <option value="/api/v1/data">GET /api/v1/data (Standard Query)</option>
              <option value="/api/v1/search">GET /api/v1/search (Search Query)</option>
              <option value="/api/v1/reports">GET /api/v1/reports (Heavy Analytics)</option>
              <option value="/api/v1/ping">GET /api/v1/ping (Fast Micro-check)</option>
            </select>
          </div>

          {/* 3. Concurrency Burst Count */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Concurrent Requests Burst
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 25].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setBurstCount(cnt)}
                  className={`py-2 text-sm font-semibold rounded-xl border transition-all ${
                    burstCount === cnt
                      ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/25'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {cnt} {cnt === 1 ? 'Req' : 'Reqs'}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Trigger Button */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Fires <span className="text-sky-400 font-bold">{burstCount}</span> simultaneous requests using <code className="text-slate-300 font-mono">Promise.all</code>
          </div>
          <button
            onClick={handleRunBurst}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-sky-500/25 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Executing Burst...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Fire Traffic Burst</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Burst Results Display */}
      {burstResult && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Burst Execution Summary</h3>
              <p className="text-xs text-slate-400">Completed in {burstResult.totalDuration}ms</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                <span>{burstResult.summary.allowed} Allowed (200 OK)</span>
              </span>
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                <XCircle className="h-4 w-4" />
                <span>{burstResult.summary.blocked} Rate Limited (429)</span>
              </span>
            </div>
          </div>

          {/* Grid of Results */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto pr-1">
            {burstResult.results.map((r) => {
              const is200 = r.status === 200;
              return (
                <div
                  key={r.id}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    is200
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                      : 'bg-rose-950/20 border-rose-500/30 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono mb-1">
                    <span className="text-slate-400">Req #{r.id}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        is200 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-[11px] text-slate-400 font-mono">
                    <div>Latency: {r.latency}ms</div>
                    <div>Remaining: {r.remaining}</div>
                    {r.retryAfter && (
                      <div className="text-rose-400 font-semibold">
                        Retry-After: {r.retryAfter}s
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
