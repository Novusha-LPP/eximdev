import express from 'express';
import leadsRouter from './leads.controller.mjs';
import accountsRouter from './accounts.controller.mjs';
import contactsRouter from './contacts.controller.mjs';
import opportunitiesRouter from './opportunities.controller.mjs';
import activitiesRouter from './activities.controller.mjs';
import tasksRouter from './tasks.controller.mjs';
import reportsRouter from './reports.controller.mjs';

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

export default router;
