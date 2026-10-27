const express = require('express');
const router = express.Router();
const { Client, Policy, ApiKey } = require('../models');
const { clearKeyCache } = require('../middleware/rateLimiter');

// --- POLICIES ---
router.get('/policies', async (req, res) => {
  try {
    const policies = await Policy.findAll({ order: [['maxRequests', 'ASC']] });
    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch policies', details: err.message });
  }
});

router.post('/policies', async (req, res) => {
  try {
    const { name, tier, windowSec, maxRequests, burstLimit, description } = req.body;
    if (!name || !windowSec || !maxRequests) {
      return res.status(400).json({ error: 'Missing required policy fields: name, windowSec, maxRequests' });
    }
    const policy = await Policy.create({
      name,
      tier: tier || 'custom',
      windowSec: parseInt(windowSec, 10),
      maxRequests: parseInt(maxRequests, 10),
      burstLimit: burstLimit ? parseInt(burstLimit, 10) : maxRequests,
      description
    });
    clearKeyCache();
    res.status(201).json(policy);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create policy', details: err.message });
  }
});

router.put('/policies/:id', async (req, res) => {
  try {
    const { name, tier, windowSec, maxRequests, burstLimit, description } = req.body;
    const policy = await Policy.findByPk(req.params.id);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    await policy.update({
      name: name ?? policy.name,
      tier: tier ?? policy.tier,
      windowSec: windowSec ? parseInt(windowSec, 10) : policy.windowSec,
      maxRequests: maxRequests ? parseInt(maxRequests, 10) : policy.maxRequests,
      burstLimit: burstLimit ? parseInt(burstLimit, 10) : policy.burstLimit,
      description: description ?? policy.description
    });
    clearKeyCache();
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update policy', details: err.message });
  }
});

// --- CLIENTS ---
router.get('/clients', async (req, res) => {
  try {
    const clients = await Client.findAll({
      include: [
        {
          model: ApiKey,
          as: 'apiKeys',
          include: [{ model: Policy, as: 'policy' }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients', details: err.message });
  }
});

router.post('/clients', async (req, res) => {
  try {
    const { name, email, tier = 'standard', policyId } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const client = await Client.create({ name, email, tier });

    // Auto-generate initial API key
    let selectedPolicyId = policyId;
    if (!selectedPolicyId) {
      const defaultPolicy = await Policy.findOne({ where: { tier } }) || await Policy.findOne();
      selectedPolicyId = defaultPolicy ? defaultPolicy.id : null;
    }

    const initialKey = await ApiKey.create({
      key: `key_${tier}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${name} Primary Key`,
      clientId: client.id,
      policyId: selectedPolicyId,
      isActive: true
    });

    clearKeyCache();
    res.status(201).json({ client, initialKey });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create client', details: err.message });
  }
});

// --- API KEYS ---
router.get('/keys', async (req, res) => {
  try {
    const keys = await ApiKey.findAll({
      include: [
        { model: Client, as: 'client' },
        { model: Policy, as: 'policy' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch keys', details: err.message });
  }
});

router.post('/keys', async (req, res) => {
  try {
    const { clientId, policyId, name } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const keyString = `key_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    const newKey = await ApiKey.create({
      key: keyString,
      clientId,
      policyId,
      name: name || 'API Key',
      isActive: true
    });

    clearKeyCache();
    res.status(201).json(newKey);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create API Key', details: err.message });
  }
});

router.put('/keys/:id/toggle', async (req, res) => {
  try {
    const keyRecord = await ApiKey.findByPk(req.params.id);
    if (!keyRecord) {
      return res.status(404).json({ error: 'API Key not found' });
    }
    keyRecord.isActive = !keyRecord.isActive;
    await keyRecord.save();
    clearKeyCache();
    res.json({ success: true, key: keyRecord });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle API Key status', details: err.message });
  }
});

module.exports = router;
