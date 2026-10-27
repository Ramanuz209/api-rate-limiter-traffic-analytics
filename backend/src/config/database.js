const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let sequelize;

function initializeDatabase() {
  const dbDialect = process.env.DB_DIALECT || 'mysql';
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    console.log(`[Database] Connecting using DATABASE_URL (dialect: ${dbUrl.startsWith('postgres') ? 'postgres' : 'mysql'})...`);
    sequelize = new Sequelize(dbUrl, {
      logging: process.env.NODE_ENV === 'development' ? false : false,
      dialectOptions: dbUrl.includes('sslmode=require') || process.env.DB_SSL === 'true' ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {}
    });
  } else if (dbDialect === 'mysql') {
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'rate_limiter_db';

    console.log(`[Database] Connecting to MySQL at ${host}:${port}/${database}...`);
    sequelize = new Sequelize(database, user, password, {
      host,
      port,
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  } else if (dbDialect === 'postgres') {
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = parseInt(process.env.DB_PORT || '5432', 10);
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'postgres';
    const database = process.env.DB_NAME || 'rate_limiter_db';

    console.log(`[Database] Connecting to PostgreSQL at ${host}:${port}/${database}...`);
    sequelize = new Sequelize(database, user, password, {
      host,
      port,
      dialect: 'postgres',
      logging: false,
      dialectOptions: process.env.DB_SSL === 'true' ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {}
    });
  } else {
    // SQLite Fallback
    const dbDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const storagePath = path.join(dbDir, 'rate_limiter.sqlite');
    console.log(`[Database] Connecting to SQLite storage at ${storagePath}...`);
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: storagePath,
      logging: false
    });
  }

  return sequelize;
}

sequelize = initializeDatabase();

module.exports = {
  sequelize,
  initializeDatabase
};

