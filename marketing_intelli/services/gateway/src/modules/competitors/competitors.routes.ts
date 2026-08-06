import { Router } from 'express';
import { CompetitorsController } from './competitors.controller.js';

export const competitorsRoutes = Router();

competitorsRoutes.get('/', CompetitorsController.getCompetitors);
competitorsRoutes.post('/', CompetitorsController.createCompetitor);
competitorsRoutes.get('/:id', CompetitorsController.getCompetitorById);
competitorsRoutes.put('/:id', CompetitorsController.updateCompetitor);
