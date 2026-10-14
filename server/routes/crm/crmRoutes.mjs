import express from 'express';
import '../../model/crm/Notification.mjs';
import '../../model/crm/PricingRequest.mjs';
import leadsRouter from './leads.controller.mjs';
import accountsRouter from './accounts.controller.mjs';
import contactsRouter from './contacts.controller.mjs';
import opportunitiesRouter from './opportunities.controller.mjs';
import activitiesRouter from './activities.controller.mjs';
import tasksRouter from './tasks.controller.mjs';
import reportsRouter from './reports.controller.mjs';
import leadScoringRouter from './leadScoring.controller.mjs';
import territoriesRouter from './territories.controller.mjs';
import salesTeamsRouter from './salesTeams.controller.mjs';
import quotesRouter from './quotes.controller.mjs';
import automationRulesRouter from './automationRules.controller.mjs';
import forecastingRouter from './forecasting.controller.mjs';
import incentivesRouter from './incentives.controller.mjs';
import pricingRequestsRouter from './pricingRequests.controller.mjs';
import collateralsRouter from './collaterals.controller.mjs';

import quotationCompaniesRouter from './quotationCompanies.controller.mjs';
import quotationTemplatesRouter from './quotationTemplates.controller.mjs';
import tacticsRouter from './tactics.controller.mjs';
import UserModel from '../../model/userModel.mjs';

const router = express.Router();

// CRM User directory
router.get('/users', async (req, res) => {
  try {
    const users = await UserModel.find({ isActive: { $ne: false }, role: { $nin: ['driver', 'Driver'] } })
      .select('username role _id first_name last_name employee_code designation')
      .lean();
    res.json({ success: true, data: users, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ──────────────────────────────────────────────
// Multi-Tenant CRM Routes
// ──────────────────────────────────────────────
router.use('/leads', leadsRouter);
router.use('/accounts', accountsRouter);
router.use('/contacts', contactsRouter);
router.use('/opportunities', opportunitiesRouter);
router.use('/activities', activitiesRouter);
router.use('/tasks', tasksRouter);
router.use('/reports', reportsRouter);
router.use('/incentives', incentivesRouter);
router.use('/pricing-requests', pricingRequestsRouter);
router.use('/collaterals', collateralsRouter);
router.use('/brochures', collateralsRouter);
router.use('/tactics', tacticsRouter);


// Phase 1: Advanced Features
router.use('/lead-scoring', leadScoringRouter);
router.use('/territories', territoriesRouter);
router.use('/teams', salesTeamsRouter);
router.use('/quotes', quotesRouter);
router.use('/quotation-companies', quotationCompaniesRouter);
router.use('/quotation-templates', quotationTemplatesRouter);
router.use('/automation-rules', automationRulesRouter);
router.use('/forecasts', forecastingRouter);

export default router;
