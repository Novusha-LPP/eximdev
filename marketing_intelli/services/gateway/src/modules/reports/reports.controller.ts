// ─── Reports Controller ──────────────────────────────────────────
// services/gateway/src/modules/reports/reports.controller.ts

import { Request, Response } from 'express';
import { ReportsService } from './reports.service.js';

export class ReportsController {
  static async getCurrentReport(req: Request, res: Response) {
    try {
      const report = await ReportsService.generateMonthlyReport();
      res.json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async approveReport(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await ReportsService.approveAndPushToSales(id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
