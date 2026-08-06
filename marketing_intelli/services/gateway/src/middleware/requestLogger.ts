// ─── Request Monitoring & Tracing Middleware ──────────────────────────────
// services/gateway/src/middleware/requestLogger.ts

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { randomUUID } from 'crypto';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Attach or generate Correlation / Request ID for distributed tracing
  const requestId = (req.headers['x-request-id'] as string) || `req-${randomUUID().slice(0, 8)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  const { method, originalUrl, ip } = req;
  const userAgent = req.get('user-agent') || 'unknown';

  // Log incoming request
  logger.info({
    reqId: requestId,
    method,
    url: originalUrl,
    ip,
    userAgent,
    query: Object.keys(req.query).length ? req.query : undefined,
  }, `📥 [HTTP IN] ${method} ${originalUrl}`);

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const contentLength = res.get('content-length') || 0;

    const logData = {
      reqId: requestId,
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: duration,
      contentLength,
      userId: (req as any).user?.id || undefined,
    };

    if (statusCode >= 500) {
      logger.error(logData, `❌ [HTTP OUT] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    } else if (statusCode >= 400) {
      logger.warn(logData, `⚠️ [HTTP OUT] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    } else {
      const slowTag = duration > 500 ? ' 🐢 SLOW' : '';
      logger.info(logData, `📤 [HTTP OUT] ${method} ${originalUrl} ${statusCode} - ${duration}ms${slowTag}`);
    }
  });

  next();
}
