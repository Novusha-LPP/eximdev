// ─── Reports Routes ──────────────────────────────────────────────
// services/gateway/src/modules/reports/reports.routes.ts

import { Router } from 'express';
import { ReportsController } from './reports.controller.js';

const router = Router();

router.get('/current', ReportsController.getCurrentReport);
router.post('/:id/approve', ReportsController.approveReport);

export default router;
