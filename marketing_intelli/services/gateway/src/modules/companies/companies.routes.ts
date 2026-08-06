// ─── Companies Routes ────────────────────────────────────────────
// services/gateway/src/modules/companies/companies.routes.ts

import { Router } from 'express';
import { CompaniesController } from './companies.controller.js';

const router = Router();

router.get('/', CompaniesController.getCompanies);
router.post('/', CompaniesController.createCompany);
router.post('/recalculate-scores', CompaniesController.recalculateScores);
router.get('/:id', CompaniesController.getCompanyById);
router.put('/:id', CompaniesController.updateCompany);
router.post('/:id/status', CompaniesController.updateStatus);
router.patch('/:id/status', CompaniesController.updateStatus);

export default router;
