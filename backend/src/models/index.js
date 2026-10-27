const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Client Model
const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tier: {
    type: DataTypes.ENUM('free', 'standard', 'enterprise', 'custom'),
    defaultValue: 'free'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'clients',
  timestamps: true
});

// Policy Model
const Policy = sequelize.define('Policy', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tier: {
    type: DataTypes.STRING,
    allowNull: false
  },
  windowSec: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60
  },
  maxRequests: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60
  },
  burstLimit: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'policies',
  timestamps: true
});

// ApiKey Model
const ApiKey = sequelize.define('ApiKey', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    defaultValue: 'Default Key'
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  policyId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'api_keys',
  timestamps: true
});

// RequestLog Model
const RequestLog = sequelize.define('RequestLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  apiKey: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: false
  },
  endpoint: {
    type: DataTypes.STRING,
    allowNull: false
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  responseTimeMs: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  isBlocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  policyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  blockedReason: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'request_logs',
  timestamps: true,
  indexes: [
    { fields: ['createdAt'] },
    { fields: ['apiKey'] },
    { fields: ['statusCode'] },
    { fields: ['isBlocked'] }
  ]
});

// Associations
Client.hasMany(ApiKey, { foreignKey: 'clientId', as: 'apiKeys', onDelete: 'CASCADE' });
ApiKey.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Policy.hasMany(ApiKey, { foreignKey: 'policyId', as: 'apiKeys' });
ApiKey.belongsTo(Policy, { foreignKey: 'policyId', as: 'policy' });

Client.hasMany(RequestLog, { foreignKey: 'clientId', as: 'logs' });
RequestLog.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

module.exports = {
  sequelize,
  Client,
  Policy,
  ApiKey,
  RequestLog
};

