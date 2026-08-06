// ─── Contacts Controller ─────────────────────────────────────────
// services/gateway/src/modules/contacts/contacts.controller.ts

import { Request, Response } from 'express';
import { ContactsService } from './contacts.service.js';

export class ContactsController {
  static async getAllContacts(req: Request, res: Response) {
    try {
      const contacts = await ContactsService.getAllContacts(req.query);
      res.json({ success: true, count: contacts.length, data: contacts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getContactsByCompany(req: Request, res: Response) {
    try {
      const companyId = req.params.companyId as string;
      const contacts = await ContactsService.getContactsByCompany(companyId);
      res.json({ success: true, count: contacts.length, data: contacts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createContact(req: Request, res: Response) {
    try {
      const contact = await ContactsService.createContact(req.body);
      res.status(201).json({ success: true, data: contact });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateJobChange(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { newCompanyId, newCompanyName, newRole } = req.body;
      const user = (req as any).user || { id: 'user_shipra', role: 'Outreach_Lead' };

      const updated = await ContactsService.updateJobChange(id, newCompanyId, newCompanyName, newRole, user);
      res.json({ success: true, message: 'Job movement updated', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async getRelationshipIntel(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const user = (req as any).user || { id: 'user_shipra', role: 'Outreach_Lead' };

      const intel = await ContactsService.getRelationshipIntel(id, user);
      res.json({ success: true, data: intel });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async upsertRelationshipIntel(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const user = (req as any).user || { id: 'user_shipra', role: 'Outreach_Lead' };

      const intel = await ContactsService.upsertRelationshipIntel(id, req.body, user);
      res.json({ success: true, message: 'Relationship intelligence updated', data: intel });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
