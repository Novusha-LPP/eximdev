import { Request, Response } from 'express';
import { CompetitorsService } from './competitors.service.js';

export class CompetitorsController {
  static async getCompetitors(req: Request, res: Response) {
    try {
      const competitors = await CompetitorsService.getCompetitors();
      res.json({ success: true, count: competitors.length, data: competitors });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getCompetitorById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const competitor = await CompetitorsService.getCompetitorById(id);
      if (!competitor) {
        return res.status(404).json({ success: false, error: 'Competitor not found' });
      }
      res.json({ success: true, data: competitor });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  static async createCompetitor(req: Request, res: Response) {
    try {
      const competitor = await CompetitorsService.createCompetitor(req.body);
      res.status(201).json({ success: true, message: 'Competitor created successfully', data: competitor });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateCompetitor(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const competitor = await CompetitorsService.updateCompetitor(id, req.body);
      if (!competitor) {
        return res.status(404).json({ success: false, error: 'Competitor not found' });
      }
      res.json({ success: true, message: 'Competitor updated successfully', data: competitor });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
