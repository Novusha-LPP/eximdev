import express from 'express';
import CustomerKycModel from '../../model/CustomerKyc/customerKycModel.mjs';
import suspectsRouter from './suspects.controller.mjs';
import prospectsRouter from './prospects.controller.mjs';
import customersRouter from './customers.controller.mjs';

const router = express.Router();

// ──────────────────────────────────────────────
// Stats endpoint
// GET /api/crm/stats
// ──────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [suspects, prospects, customers, stagnant] = await Promise.all([
      // Suspects = draft records
      CustomerKycModel.countDocuments({ draft: 'true' }),

      // Prospects = submitted, awaiting decision
      CustomerKycModel.countDocuments({
        draft: 'false',
        approval: { $in: ['Pending', 'Sent for revision'] }
      }),

      // Customers = approved records
      CustomerKycModel.countDocuments({
        draft: 'false',
        approval: { $in: ['Approved', 'Approved by HOD'] }
      }),

      // Stagnant = prospects untouched > 30 days
      CustomerKycModel.countDocuments({
        draft: 'false',
        approval: { $in: ['Pending', 'Sent for revision'] },
        updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({ suspects, prospects, customers, stagnant });
  } catch (err) {
    console.error('CRM stats error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// Mount sub-routers
// ──────────────────────────────────────────────
router.use('/', suspectsRouter);
router.use('/', prospectsRouter);
router.use('/', customersRouter);

export default router;
