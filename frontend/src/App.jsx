import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MetricCards from './components/MetricCards';
import TrafficChart from './components/TrafficChart';
import LatencyChart from './components/LatencyChart';
import StatusPieChart from './components/StatusPieChart';
import EndpointBreakdown from './components/EndpointBreakdown';
import ApiSimulator from './components/ApiSimulator';
import PolicyManager from './components/PolicyManager';
import RecentLogsTable from './components/RecentLogsTable';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Data states
  const [health, setHealth] = useState(null);
  const [overview, setOverview] = useState(null);
  const [trafficData, setTrafficData] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [clientBreakdown, setClientBreakdown] = useState([]);
  const [endpointBreakdown, setEndpointBreakdown] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAllData = useCallback(async () => {
    try {
      const [
        healthRes,
        overviewRes,
        trafficRes,
        statusRes,
        clientsRes,
        endpointsRes,
        logsRes
      ] = await Promise.all([
        api.getHealth(),
        api.getOverview(60),
        api.getTraffic(30),
        api.getStatusDistribution(),
        api.getClientBreakdown(),
        api.getEndpointBreakdown(),
        api.getRecentLogs(50)
      ]);

      setHealth(healthRes.data);
      setOverview(overviewRes.data);
      setTrafficData(trafficRes.data);
      setStatusDistribution(statusRes.data);
      setClientBreakdown(clientsRes.data);
      setEndpointBreakdown(endpointsRes.data);
      setRecentLogs(logsRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh loop
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAllData, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllData]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        health={health}
        onRefreshNow={fetchAllData}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB 1: MAIN DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <MetricCards overview={overview} />

            {/* Time-series charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrafficChart data={trafficData} />
              <LatencyChart data={trafficData} />
            </div>

            {/* Status distribution & Endpoints */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <StatusPieChart data={statusDistribution} />
              </div>
              <div className="lg:col-span-2">
                <EndpointBreakdown endpoints={endpointBreakdown} clients={clientBreakdown} />
              </div>
            </div>

            {/* Live Audit Log Preview */}
            <RecentLogsTable logs={recentLogs} />
          </div>
        )}

        {/* TAB 2: LIVE API SIMULATOR */}
        {activeTab === 'simulator' && (
          <ApiSimulator onTrafficTriggered={fetchAllData} />
        )}

        {/* TAB 3: POLICIES & KEYS */}
        {activeTab === 'policies' && (
          <PolicyManager onUpdate={fetchAllData} />
        )}

        {/* TAB 4: AUDIT LOGS FULL VIEW */}
        {activeTab === 'logs' && (
          <RecentLogsTable logs={recentLogs} />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            API Rate Limiting & Traffic Analytics Platform · MystartupTV Technical Assignment
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <span>Database: {health?.database || 'MySQL'}</span>
            <span>Limiter: {health?.rateLimitingEngine || 'Sliding Window'}</span>
            <span>Last Sync: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
