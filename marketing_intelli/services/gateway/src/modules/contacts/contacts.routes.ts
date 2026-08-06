// ─── Contacts Routes ─────────────────────────────────────────────
// services/gateway/src/modules/contacts/contacts.routes.ts

import { Router } from 'express';
import { ContactsController } from './contacts.controller.js';

export const contactsRoutes = Router();

// GET search & list all contacts
contactsRoutes.get('/', ContactsController.getAllContacts);

// GET contacts for a company
contactsRoutes.get('/company/:companyId', ContactsController.getContactsByCompany);

// POST create contact
contactsRoutes.post('/', ContactsController.createContact);

// PUT update job change
contactsRoutes.put('/:id/job-change', ContactsController.updateJobChange);

// GET PRD §5.4 Relationship Intelligence (CEO/Shipra - Audit Logged)
contactsRoutes.get('/:id/relationship-intel', ContactsController.getRelationshipIntel);

// PUT PRD §5.4 Relationship Intelligence (Requires Consent)
contactsRoutes.put('/:id/relationship-intel', ContactsController.upsertRelationshipIntel);
