import axios from 'axios';

const API_BASE = '/api';

export const api = {
  // System Health
  getHealth: () => axios.get(`${API_BASE}/health`),

  // Analytics
  getOverview: (timeframe = 60) => axios.get(`${API_BASE}/analytics/overview?timeframe=${timeframe}`),
  getTraffic: (minutes = 30) => axios.get(`${API_BASE}/analytics/traffic?minutes=${minutes}`),
  getStatusDistribution: () => axios.get(`${API_BASE}/analytics/status-distribution`),
  getClientBreakdown: () => axios.get(`${API_BASE}/analytics/clients`),
  getEndpointBreakdown: () => axios.get(`${API_BASE}/analytics/endpoints`),
  getRecentLogs: (limit = 50, blocked = null) => {
    let url = `${API_BASE}/analytics/logs?limit=${limit}`;
    if (blocked !== null) url += `&blocked=${blocked}`;
    return axios.get(url);
  },

  // Policies
  getPolicies: () => axios.get(`${API_BASE}/policies`),
  createPolicy: (data) => axios.post(`${API_BASE}/policies`, data),
  updatePolicy: (id, data) => axios.put(`${API_BASE}/policies/${id}`, data),

  // Clients
  getClients: () => axios.get(`${API_BASE}/clients`),
  createClient: (data) => axios.post(`${API_BASE}/clients`, data),

  // API Keys
  getKeys: () => axios.get(`${API_BASE}/keys`),
  createKey: (data) => axios.post(`${API_BASE}/keys`, data),
  toggleKey: (id) => axios.put(`${API_BASE}/keys/${id}/toggle`),

  // Live Simulator: Send Single Request
  sendRequest: async (apiKey, endpoint, method = 'GET', body = null) => {
    const headers = {};
    if (apiKey) {
      headers['X-API-KEY'] = apiKey;
    }
    const startTime = performance.now();
    try {
      const response = await axios({
        url: endpoint,
        method,
        headers,
        data: body,
        validateStatus: () => true // Allow any status code without throwing axios error
      });
      const latency = Math.round(performance.now() - startTime);
      return {
        success: response.status < 400,
        status: response.status,
        headers: response.headers,
        data: response.data,
        latency
      };
    } catch (err) {
      return {
        success: false,
        status: 500,
        headers: {},
        data: { error: err.message },
        latency: Math.round(performance.now() - startTime)
      };
    }
  },

  // Live Simulator: Fire Concurrent Burst
  sendBurst: async (apiKey, endpoint, count = 10) => {
    const headers = {};
    if (apiKey) {
      headers['X-API-KEY'] = apiKey;
    }

    const startTotal = performance.now();
    const requests = Array.from({ length: count }, async (_, idx) => {
      const startReq = performance.now();
      try {
        const res = await axios({
          url: endpoint,
          method: 'GET',
          headers,
          validateStatus: () => true
        });
        return {
          id: idx + 1,
          status: res.status,
          latency: Math.round(performance.now() - startReq),
          remaining: res.headers['x-ratelimit-remaining'] || 0,
          limit: res.headers['x-ratelimit-limit'] || 0,
          retryAfter: res.headers['retry-after'] || null,
          data: res.data
        };
      } catch (err) {
        return {
          id: idx + 1,
          status: 500,
          latency: Math.round(performance.now() - startReq),
          remaining: 0,
          data: { error: err.message }
        };
      }
    });

    const results = await Promise.all(requests);
    const totalDuration = Math.round(performance.now() - startTotal);

    const allowed = results.filter(r => r.status === 200).length;
    const blocked = results.filter(r => r.status === 429).length;
    const errors = results.filter(r => r.status !== 200 && r.status !== 429).length;

    return {
      results,
      totalDuration,
      summary: {
        total: count,
        allowed,
        blocked,
        errors
      }
    };
  }
};
