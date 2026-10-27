import React, { useState, useEffect } from 'react';
import { Shield, Key, Plus, Check, Power, RefreshCw, Copy } from 'lucide-react';
import { api } from '../services/api';

export default function PolicyManager({ onUpdate }) {
  const [policies, setPolicies] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  // New Policy Form State
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    name: '',
    tier: 'custom',
    windowSec: 60,
    maxRequests: 50,
    burstLimit: 60,
    description: ''
  });

  // New Client Form State
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    tier: 'standard'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [policiesRes, clientsRes] = await Promise.all([
        api.getPolicies(),
        api.getClients()
      ]);
      setPolicies(policiesRes.data);
      setClients(clientsRes.data);
    } catch (err) {
      console.error('Failed to load policies/clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    try {
      await api.createPolicy(policyForm);
      setShowPolicyModal(false);
      setPolicyForm({
        name: '',
        tier: 'custom',
        windowSec: 60,
        maxRequests: 50,
        burstLimit: 60,
        description: ''
      });
      loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create policy');
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      await api.createClient(clientForm);
      setShowClientModal(false);
      setClientForm({ name: '', email: '', tier: 'standard' });
      loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create client');
    }
  };

  const handleToggleKey = async (keyId) => {
    try {
      await api.toggleKey(keyId);
      loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Failed to toggle API key');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* 1. Policies Section */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Shield className="h-5 w-5 text-sky-400" />
              <span>Configurable Rate Limit Policies</span>
            </h3>
            <p className="text-xs text-slate-400">Sliding window algorithms and request quotas</p>
          </div>
          <button
            onClick={() => setShowPolicyModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Policy</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {policies.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono">
                  {p.tier}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                  Sliding Window
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white mb-2">{p.name}</h4>
              <div className="space-y-1 text-xs text-slate-400 font-mono mb-3">
                <div className="flex justify-between">
                  <span>Max Requests:</span>
                  <span className="text-slate-200 font-bold">{p.maxRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Window:</span>
                  <span className="text-slate-200">{p.windowSec}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Burst Allowance:</span>
                  <span className="text-slate-200">{p.burstLimit || p.maxRequests}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic border-t border-slate-800/80 pt-2">
                {p.description || 'Configurable rate limiting threshold'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Registered Clients & API Keys */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Key className="h-5 w-5 text-indigo-400" />
              <span>Registered Clients & Active API Keys</span>
            </h3>
            <p className="text-xs text-slate-400">Manage client tiers and cryptographic API tokens</p>
          </div>
          <button
            onClick={() => setShowClientModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Client</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 uppercase tracking-wider text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Tier</th>
                <th className="py-3 px-4">API Key Token</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {clients.map((c) => {
                const primaryKey = c.apiKeys && c.apiKeys[0];
                return (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-sans font-medium text-white">{c.name}</td>
                    <td className="py-3 px-4 text-slate-400">{c.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-800 border border-slate-700 text-sky-300">
                        {c.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {primaryKey ? (
                        <div className="flex items-center space-x-2">
                          <code className="text-[11px] text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            {primaryKey.key}
                          </code>
                          <button
                            onClick={() => handleCopy(primaryKey.key)}
                            title="Copy API key"
                            className="p-1 text-slate-400 hover:text-white transition"
                          >
                            {copiedKey === primaryKey.key ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No Key</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {primaryKey?.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {primaryKey && (
                        <button
                          onClick={() => handleToggleKey(primaryKey.id)}
                          className={`p-1.5 rounded-lg border transition ${
                            primaryKey.isActive
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title={primaryKey.isActive ? 'Disable API Key' : 'Enable API Key'}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create New Rate Limit Policy</h3>
            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microservice Tier"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Max Requests</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={policyForm.maxRequests}
                    onChange={(e) => setPolicyForm({ ...policyForm, maxRequests: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Window (Seconds)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={policyForm.windowSec}
                    onChange={(e) => setPolicyForm({ ...policyForm, windowSec: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Policy description..."
                  value={policyForm.description}
                  onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Register New Client</h3>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Client / Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NextGen AI Corp"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  placeholder="dev@client.com"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Tier</label>
                <select
                  value={clientForm.tier}
                  onChange={(e) => setClientForm({ ...clientForm, tier: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="enterprise">Enterprise (200 req / min)</option>
                  <option value="standard">Standard (60 req / min)</option>
                  <option value="free">Free (20 req / min)</option>
                  <option value="custom">Strict Demo Burst (5 req / 10s)</option>
                </select>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                >
                  Create Client & Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

