import express from 'express';
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

const router = express.Router();

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

// Phase 1: Advanced Features
router.use('/lead-scoring', leadScoringRouter);
router.use('/territories', territoriesRouter);
router.use('/teams', salesTeamsRouter);
router.use('/quotes', quotesRouter);
router.use('/automation-rules', automationRulesRouter);
router.use('/forecasts', forecastingRouter);

export default router;
