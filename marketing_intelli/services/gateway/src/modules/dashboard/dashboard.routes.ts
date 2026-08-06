// ─── Dashboard Routes ──────────────────────────────────────────
// services/gateway/src/modules/dashboard/dashboard.routes.ts

import { Router } from 'express';
import { getDashboardStats } from './dashboard.controller.js';

export const dashboardRoutes = Router();

dashboardRoutes.get('/stats', getDashboardStats);
dashboardRoutes.get('/', getDashboardStats);
