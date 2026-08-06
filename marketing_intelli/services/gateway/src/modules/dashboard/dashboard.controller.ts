// ─── Dashboard Controller ──────────────────────────────────────
// services/gateway/src/modules/dashboard/dashboard.controller.ts

import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service.js';

export async function getDashboardStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await dashboardService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}
