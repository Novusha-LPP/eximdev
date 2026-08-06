// ─── AIVision Market Intelligence — Gateway Server Entry ───────
// services/gateway/src/server.ts

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { connectDB } from './config/database.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { requestLogger } from './middleware/requestLogger.js';

// Route imports
import { authRoutes } from './modules/auth/auth.routes.js';
import companiesRoutes from './modules/companies/companies.routes.js';
import { contactsRoutes } from './modules/contacts/contacts.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import { salesCrmRoutes } from './modules/sales-crm/salesCrm.routes.js';
import { competitorsRoutes } from './modules/competitors/competitors.routes.js';
import { alertsRoutes } from './modules/alerts/alerts.routes.js';

// Job scheduler
import { initScheduler } from './jobs/scheduler.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: process.env.NEXT_PUBLIC_GATEWAY_URL || '*' },
});

// ─── Process Monitoring & Safety Handlers ───────────────────────
process.on('uncaughtException', (err) => {
  logger.fatal({ error: { name: err.name, message: err.message, stack: err.stack } }, '💥 Uncaught Exception in Gateway process!');
});

process.on('unhandledRejection', (reason: any) => {
  logger.error({ reason: reason?.stack || reason }, '⚠️ Unhandled Promise Rejection in Gateway!');
});

// ─── Global Middleware & Request Monitoring ────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ─── Health Check & Monitoring Status ───────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'mi-gateway',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
});

// ─── API Routes (all under /api/mi) ────────────────────────────
const api = express.Router();
api.use(authMiddleware);
api.use('/auth', authRoutes);

api.use('/companies', companiesRoutes);
api.use('/contacts', contactsRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/reports', reportsRoutes);
api.use('/sales-crm', salesCrmRoutes);
api.use('/competitors', competitorsRoutes);
api.use('/alerts', alertsRoutes);

// ─── Mystique Proxy (forwards to Python AI service) ────────────
api.use('/mystique', async (req, res, next) => {
  try {
    const { default: axios } = await import('axios');
    const mystiqueUrl = process.env.MYSTIQUE_INTERNAL_URL || 'http://localhost:8100';
    const response = await axios({
      method: req.method,
      url: `${mystiqueUrl}${req.path}`,
      data: req.body,
      headers: {
        'x-user-id': (req as any).user?.id,
        'x-user-role': (req as any).user?.role,
        'x-user-username': (req as any).user?.username,
        'x-request-id': req.headers['x-request-id'],
      },
      timeout: 120_000,
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    next(error);
  }
});

app.use('/api/mi', api);

// ─── Error Handler ──────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Gateway Server ───────────────────────────────────────
async function start() {
  const PORT = parseInt(process.env.GATEWAY_PORT || '3001');

  await connectDB();
  await initScheduler();

  // WebSocket namespace for dashboard live updates
  io.of('/dashboard').on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Dashboard Socket.IO client connected');
    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Dashboard Socket.IO client disconnected');
    });
  });

  httpServer.listen(PORT, () => {
    logger.info(`⚡ MI Gateway running on port ${PORT} [ENV: ${process.env.NODE_ENV || 'development'}]`);
    logger.info(`🔍 Health check available at http://localhost:${PORT}/health`);
  });
}

start().catch((err) => {
  logger.fatal({ error: err }, 'Failed to start Gateway server');
  process.exit(1);
});

export { app, io };
