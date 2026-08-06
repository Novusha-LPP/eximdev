// ─── Error Handler Middleware ────────────────────────────────────
// services/gateway/src/middleware/errorHandler.ts

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const reqId = (req.headers['x-request-id'] as string) || 'unknown';
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    reqId,
    method: req.method,
    url: req.originalUrl,
    status: statusCode,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
    },
    user: (req as any).user ? { id: (req as any).user.id, role: (req as any).user.role } : undefined,
  }, `🚨 [API Error] ${req.method} ${req.originalUrl} failed: ${message}`);

  res.status(statusCode).json({
    success: false,
    error: message,
    reqId,
    timestamp: new Date().toISOString(),
  });
}
