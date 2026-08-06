// ─── Dashboard Service ─────────────────────────────────────────
// services/gateway/src/modules/dashboard/dashboard.service.ts

import { Company } from '../../models/Company.js';

export class DashboardService {
  async getStats() {
    const totalCompanies = await Company.countDocuments();
    const greenCount = await Company.countDocuments({ status: 'Green' });
    const yellowCount = await Company.countDocuments({ status: 'Yellow' });
    const redCount = await Company.countDocuments({ status: 'Red' });

    const highPriorityCount = await Company.countDocuments({
      status: 'Yellow',
      'priority_score.total_score': { $gte: 80 },
    });

    const recentPriorityAccounts = await Company.find({})
      .sort({ 'priority_score.total_score': -1, updatedAt: -1 })
      .limit(500)
      .lean();

    return {
      overview: {
        totalCompanies,
        greenCount,
        yellowCount,
        redCount,
        highPriorityCount,
      },
      recentPriorityAccounts,
    };
  }
}

export const dashboardService = new DashboardService();
