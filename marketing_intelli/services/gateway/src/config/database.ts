// ─── MongoDB Connection & Database Health Monitoring ─────────────────────
// services/gateway/src/config/database.ts

import mongoose from 'mongoose';
import { logger } from './logger.js';

// Primary MI database connection
export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/market_intelligence';

  mongoose.connection.on('connected', () => {
    logger.info('✅ Primary MongoDB connected: market_intelligence');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ error: err }, '❌ Primary MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️ Primary MongoDB disconnected');
  });

  await mongoose.connect(uri);
}

// Read-only connections to live external databases for federation
export const eximConnection = mongoose.createConnection(
  process.env.EXIM_MONGO_URI || 'mongodb://localhost:27017/eximNew'
);

export const exportConnection = mongoose.createConnection(
  process.env.EXPORT_MONGO_URI || 'mongodb://localhost:27017/export'
);

eximConnection.on('connected', () => logger.info('✅ EXIM DB connected (read-only live federation)'));
eximConnection.on('error', (err) => logger.error({ error: err }, '❌ EXIM DB connection error'));
eximConnection.on('disconnected', () => logger.warn('⚠️ EXIM DB disconnected'));

exportConnection.on('connected', () => logger.info('✅ Export DB connected (read-only live federation)'));
exportConnection.on('error', (err) => logger.error({ error: err }, '❌ Export DB connection error'));
exportConnection.on('disconnected', () => logger.warn('⚠️ Export DB disconnected'));
