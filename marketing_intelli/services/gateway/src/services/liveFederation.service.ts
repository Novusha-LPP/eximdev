// ─── Live Data Federation Service ──────────────────────────────
// services/gateway/src/services/liveFederation.service.ts
// Automatically syncs live data from exim & export databases in real-time

import { eximConnection, exportConnection } from '../config/database.js';
import { Company } from '../models/Company.js';
import { Contact } from '../models/Contact.js';
import { logger } from '../config/logger.js';
import { PriorityScoreService } from '../modules/companies/PriorityScoreService.js';

let lastFederationTime = 0;
const SYNC_INTERVAL_MS = 30_000; // 30 seconds debounce

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class LiveFederationService {
  /**
   * Run live federation from exim and export databases dynamically
   */
  static async syncLiveDatabase(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - lastFederationTime < SYNC_INTERVAL_MS) {
      return;
    }
    lastFederationTime = now;

    try {
      logger.info('⚡ Live Federation: Synchronizing exim and export database records...');

      const eximDb = eximConnection.db;
      const exportDb = exportConnection.db;

      if (!eximDb || !exportDb) {
        logger.warn('Live Federation skipped: exim or export connection not fully established');
        return;
      }

      // 1. Sync Companies from exim accounts & customers
      const eximAccounts = await eximDb.collection('accounts').find({}).toArray();
      const eximCustomers = await eximDb.collection('customers').find({}).toArray();
      const eximLeads = await eximDb.collection('leads').find({}).toArray();

      const accountMap = new Map<string, any>();
      for (const acc of eximAccounts) {
        accountMap.set(acc._id.toString(), acc);
        const name = acc.name?.trim();
        if (name) {
          const insertDoc: any = {
            company_name: name,
            source_tags: ["exim_live_db"]
          };
          if (acc.city) insertDoc.city = acc.city;
          if (acc.gstin) insertDoc.gstin = acc.gstin;
          if (acc.turnover_band || acc.turnover) insertDoc.turnover_band = acc.turnover_band || acc.turnover;
          if (acc.primary_industry || acc.industry) insertDoc.primary_industry = acc.primary_industry || acc.industry;

          insertDoc.services = [
            { vertical: 'customs_clearance', engaged: false },
            { vertical: 'freight_forwarding', engaged: false },
            { vertical: 'transport_logistics', engaged: false },
            { vertical: 'packaging_crates', engaged: false },
            { vertical: 'gps_elocks', engaged: false },
            { vertical: 'rfid_autorack', engaged: false },
          ];
          insertDoc.priority_score = PriorityScoreService.calculatePriorityScore(insertDoc, 0, false);
          insertDoc.completeness_score = PriorityScoreService.calculateCompletenessScore(insertDoc, 0);

          let existingCompany = await Company.findOne({ company_name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
          const exactName = existingCompany ? existingCompany.company_name : name;
          insertDoc.company_name = exactName;

          await Company.updateOne(
            { company_name: exactName },
            { $setOnInsert: insertDoc },
            { upsert: true }
          );
        }
      }

      for (const cust of eximCustomers) {
        const name = cust.name?.trim();
        if (name) {
          const insertDoc: any = {
            company_name: name,
            source_tags: ["exim_live_db"]
          };
          if (cust.city) insertDoc.city = cust.city;
          if (cust.gstin) insertDoc.gstin = cust.gstin;
          if (cust.turnover_band || cust.turnover) insertDoc.turnover_band = cust.turnover_band || cust.turnover;
          if (cust.primary_industry || cust.industry) insertDoc.primary_industry = cust.primary_industry || cust.industry;
          if (cust.status) insertDoc.status = cust.status === "converted" ? "Green" : cust.status;

          insertDoc.services = [
            { vertical: 'customs_clearance', engaged: false },
            { vertical: 'freight_forwarding', engaged: false },
            { vertical: 'transport_logistics', engaged: false },
            { vertical: 'packaging_crates', engaged: false },
            { vertical: 'gps_elocks', engaged: false },
            { vertical: 'rfid_autorack', engaged: false },
          ];
          insertDoc.priority_score = PriorityScoreService.calculatePriorityScore(insertDoc, 0, false);
          insertDoc.completeness_score = PriorityScoreService.calculateCompletenessScore(insertDoc, 0);

          let existingCompany = await Company.findOne({ company_name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
          const exactName = existingCompany ? existingCompany.company_name : name;
          insertDoc.company_name = exactName;

          await Company.updateOne(
            { company_name: exactName },
            { $setOnInsert: insertDoc },
            { upsert: true }
          );
        }
      }

      // 2. Sync Contacts from exim.contacts
      const eximContacts = await eximDb.collection('contacts').find({}).toArray();
      let eximContactCount = 0;

      for (const c of eximContacts) {
        let rawName = `${c.firstName || ''} ${c.lastName || ''}`.trim();
        if (!rawName) continue; // skip if no name

        const acc = accountMap.get(c.accountId?.toString());
        const companyName = acc?.name?.trim();
        if (!companyName) continue; // skip if no company

        let companyDoc = await Company.findOne({ company_name: new RegExp(`^${escapeRegex(companyName)}$`, 'i') });
        if (!companyDoc) {
          const createDoc: any = { company_name: companyName };
          if (acc && acc.city) createDoc.city = acc.city;
          if (acc && acc.gstin) createDoc.gstin = acc.gstin;
          if (acc && (acc.turnover_band || acc.turnover)) createDoc.turnover_band = acc.turnover_band || acc.turnover;
          if (acc && (acc.primary_industry || acc.industry)) createDoc.primary_industry = acc.primary_industry || acc.industry;
          companyDoc = await Company.create(createDoc);
        }

        const setFields: any = {
          full_name: rawName,
          company_id: companyDoc._id,
        };
        if (c.title || c.designation) setFields.current_designation = c.title || c.designation;
        if (c.status) setFields.status = c.status;
        
        const phone = c.phone?.trim() || c.mobile?.trim();
        if (phone) {
          setFields.mobile = phone;
          setFields.whatsapp_number = phone;
        }
        if (c.email) {
          setFields.email_work = c.email;
        }

        const setOnInsert: any = {};
        if (setFields.current_designation) {
          setOnInsert.employment_history = [{ company_name: companyName, role: setFields.current_designation }];
        } else {
          setOnInsert.employment_history = [{ company_name: companyName }];
        }

        await Contact.updateOne(
          { full_name: rawName, company_id: companyDoc._id },
          {
            $set: setFields,
            $setOnInsert: setOnInsert
          },
          { upsert: true }
        );
        eximContactCount++;
      }

      // 3. Sync Users/Contacts from export.users
      const exportUsers = await exportDb.collection('users').find({}).toArray();
      let exportUserCount = 0;

      for (const u of exportUsers) {
        if (!u.first_name) continue;
        const name = `${u.first_name} ${u.last_name || ''}`.trim();
        const compName = u.company?.trim();
        if (!compName) continue;

        let companyDoc = await Company.findOne({ company_name: new RegExp(`^${escapeRegex(compName)}$`, 'i') });
        if (!companyDoc) {
          companyDoc = await Company.create({
            company_name: compName,
          });
        }

        const setFields: any = {
          full_name: name,
          company_id: companyDoc._id,
        };
        if (u.role) setFields.current_designation = u.role;
        if (u.isActive !== undefined) setFields.status = u.isActive ? 'Active' : 'Inactive';
        if (u.phone) {
          setFields.mobile = u.phone;
          setFields.whatsapp_number = u.phone;
        }
        if (u.email) {
          setFields.email_work = u.email;
        }

        const setOnInsert: any = {};
        if (u.role) {
          setOnInsert.employment_history = [{ company_name: compName, role: u.role }];
        } else {
          setOnInsert.employment_history = [{ company_name: compName }];
        }

        await Contact.updateOne(
          { full_name: name, company_id: companyDoc._id },
          {
            $set: setFields,
            $setOnInsert: setOnInsert
          },
          { upsert: true }
        );
        exportUserCount++;
      }

      logger.info(`✅ Live Federation complete: ${eximContactCount} EXIM contacts & ${exportUserCount} Export users synchronized.`);
    } catch (error) {
      logger.error(error, 'Error during Live Data Federation');
    }
  }
}
