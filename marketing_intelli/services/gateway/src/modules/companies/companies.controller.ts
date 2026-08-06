// ─── Companies Controller ────────────────────────────────────────
// services/gateway/src/modules/companies/companies.controller.ts

import { Request, Response } from 'express';
import { CompaniesService } from './companies.service.js';

export class CompaniesController {
  static async getCompanies(req: Request, res: Response) {
    try {
      const companies = await CompaniesService.getCompanies(req.query);
      res.json({ success: true, count: companies.length, data: companies });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getCompanyById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const company = await CompaniesService.getCompanyById(id);
      res.json({ success: true, data: company });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  static async createCompany(req: Request, res: Response) {
    try {
      const company = await CompaniesService.createCompany(req.body);
      res.status(201).json({ success: true, message: 'Company created successfully', data: company });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateCompany(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const company = await CompaniesService.updateCompany(id, req.body);
      res.json({ success: true, message: 'Company updated successfully', data: company });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { status, reasonCode, note } = req.body;
      const updated = await CompaniesService.updateStatus(id, status, reasonCode, note);
      res.json({ success: true, message: `Status updated to ${status}`, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async recalculateScores(req: Request, res: Response) {
    try {
      const count = await CompaniesService.recalculateAllScores();
      res.json({ success: true, message: `Recalculated priority scores for ${count} companies.` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
