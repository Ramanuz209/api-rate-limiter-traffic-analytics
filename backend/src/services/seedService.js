const { Client, Policy, ApiKey, RequestLog } = require('../models');

async function seedInitialData() {
  try {
    const policyCount = await Policy.count();
    if (policyCount > 0) {
      console.log('⚡ [Seed] Database already contains data. Skipping initial seeding.');
      return;
    }

    console.log('🌱 [Seed] Seeding initial rate limit policies, clients, and API keys...');

    // 1. Create Policies
    const freePolicy = await Policy.create({
      name: 'Free Tier Policy',
      tier: 'free',
      windowSec: 60,
      maxRequests: 20,
      burstLimit: 25,
      description: 'Default tier for trial and hobbyist accounts (20 req / min).'
    });

    const standardPolicy = await Policy.create({
      name: 'Standard Tier Policy',
      tier: 'standard',
      windowSec: 60,
      maxRequests: 60,
      burstLimit: 75,
      description: 'Standard production tier for web and mobile apps (60 req / min).'
    });

    const enterprisePolicy = await Policy.create({
      name: 'Enterprise Tier Policy',
      tier: 'enterprise',
      windowSec: 60,
      maxRequests: 200,
      burstLimit: 250,
      description: 'High capacity tier with dedicated throughput (200 req / min).'
    });

    const strictPolicy = await Policy.create({
      name: 'Strict Demo Burst Policy',
      tier: 'custom',
      windowSec: 10,
      maxRequests: 5,
      burstLimit: 5,
      description: 'Ultra fast limit (5 req / 10 sec) for testing 429 response enforcement.'
    });

    // 2. Create Clients
    const clientEnterprise = await Client.create({
      name: 'Acme Cloud Systems',
      email: 'dev@acmecloud.io',
      tier: 'enterprise'
    });

    const clientStandard = await Client.create({
      name: 'Fintech Payments Ltd',
      email: 'api@fintechpayments.com',
      tier: 'standard'
    });

    const clientFree = await Client.create({
      name: 'DevStudio Indie App',
      email: 'hello@devstudio.org',
      tier: 'free'
    });

    const clientStrict = await Client.create({
      name: 'Rapid Burst Tester Client',
      email: 'tester@rapidburst.internal',
      tier: 'custom'
    });

    // 3. Create API Keys
    await ApiKey.create({
      key: 'key_enterprise_live_9999',
      name: 'Acme Primary Prod Key',
      clientId: clientEnterprise.id,
      policyId: enterprisePolicy.id,
      isActive: true
    });

    await ApiKey.create({
      key: 'key_standard_live_5555',
      name: 'Fintech Backend API Key',
      clientId: clientStandard.id,
      policyId: standardPolicy.id,
      isActive: true
    });

    await ApiKey.create({
      key: 'key_free_live_1111',
      name: 'Indie Mobile App Key',
      clientId: clientFree.id,
      policyId: freePolicy.id,
      isActive: true
    });

    await ApiKey.create({
      key: 'key_strict_live_0005',
      name: 'Demo 5-Reqs-Burst Key',
      clientId: clientStrict.id,
      policyId: strictPolicy.id,
      isActive: true
    });

    // 4. Generate realistic historical request traffic for the last 30 minutes
    console.log('📊 [Seed] Generating baseline historical metrics for analytics charts...');
    const now = Date.now();
    const historicalLogs = [];
    const endpoints = [
      '/api/v1/data',
      '/api/v1/search',
      '/api/v1/users/profile',
      '/api/v1/transactions',
      '/api/v1/reports'
    ];

    const clientProfiles = [
      { key: 'key_enterprise_live_9999', id: clientEnterprise.id, name: 'Acme Cloud Systems', policy: 'Enterprise Tier Policy', weight: 40, maxReq: 200 },
      { key: 'key_standard_live_5555', id: clientStandard.id, name: 'Fintech Payments Ltd', policy: 'Standard Tier Policy', weight: 30, maxReq: 60 },
      { key: 'key_free_live_1111', id: clientFree.id, name: 'DevStudio Indie App', policy: 'Free Tier Policy', weight: 20, maxReq: 20 },
      { key: 'key_strict_live_0005', id: clientStrict.id, name: 'Rapid Burst Tester Client', policy: 'Strict Demo Burst Policy', weight: 10, maxReq: 5 }
    ];

    // Seed ~150 requests spread across the past 30 minutes
    for (let i = 0; i < 150; i++) {
      const timeOffsetMinutes = Math.floor(Math.random() * 30);
      const timeOffsetSec = Math.floor(Math.random() * 60);
      const reqTime = new Date(now - (timeOffsetMinutes * 60 + timeOffsetSec) * 1000);

      const profile = clientProfiles[Math.floor(Math.random() * clientProfiles.length)];
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      
      // Simulate 10% rate-limiting (429) especially for free & strict keys
      const isRateLimited = profile.policy.includes('Free') || profile.policy.includes('Strict')
        ? Math.random() < 0.25
        : Math.random() < 0.05;

      const statusCode = isRateLimited ? 429 : (Math.random() < 0.95 ? 200 : 500);
      const responseTimeMs = isRateLimited ? Math.floor(Math.random() * 8 + 2) : Math.floor(Math.random() * 95 + 15);

      historicalLogs.push({
        apiKey: profile.key,
        clientId: profile.id,
        clientName: profile.name,
        ip: `192.168.1.${Math.floor(Math.random() * 50 + 10)}`,
        endpoint,
        method: endpoint.includes('transactions') ? 'POST' : 'GET',
        statusCode,
        responseTimeMs,
        isBlocked: isRateLimited,
        policyName: profile.policy,
        blockedReason: isRateLimited ? `Rate limit exceeded for policy: ${profile.policy}` : null,
        createdAt: reqTime,
        updatedAt: reqTime
      });
    }

    await RequestLog.bulkCreate(historicalLogs);
    console.log(`✅ [Seed] Successfully seeded 4 policies, 4 clients, 4 API keys, and ${historicalLogs.length} historical request logs.`);
  } catch (error) {
    console.error('❌ [Seed] Error seeding initial data:', error);
  }
}

module.exports = {
  seedInitialData
};

