// ─── Automated Data Federation Pipeline ────────────────────────
// services/gateway/src/jobs/federate-all-exim-data.ts

import mongoose from 'mongoose';
import { PriorityScoreService } from '../modules/companies/PriorityScoreService.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/market_intelligence';
const EXIM_URI = process.env.EXIM_MONGO_URI || 'mongodb://localhost:27017/eximNew';
const EXPORT_URI = process.env.EXPORT_MONGO_URI || 'mongodb://localhost:27017/export';

function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function federateAllEximData() {
  console.log('🔄 Starting Full Data Federation from eximNew & export databases...');
  
  const mainConn = await mongoose.createConnection(MONGO_URI).asPromise();
  const eximConn = await mongoose.createConnection(EXIM_URI).asPromise();
  const exportConn = await mongoose.createConnection(EXPORT_URI).asPromise();

  const miCompaniesCol = mainConn.db!.collection('mi_companies');
  const miContactsCol = mainConn.db!.collection('contacts');

  // 1. Fetch Contacts from eximNew
  console.log('👥 Reading contacts from eximNew.contacts...');
  const eximContacts = await eximConn.db!.collection('contacts').find({}).toArray();
  console.log(` Found ${eximContacts.length} contact records in eximNew.contacts.`);

  // 2. Fetch Leads from eximNew
  console.log('🎯 Reading leads from eximNew.leads...');
  const eximLeads = await eximConn.db!.collection('leads').find({}).toArray();
  console.log(` Found ${eximLeads.length} lead records in eximNew.`);

  // 3. Fetch Customers from eximNew
  console.log('📦 Reading customers from eximNew.customers...');
  const eximDb = eximConn.db!;
  const eximCustomers = await eximDb.collection('customers').find({}).toArray();
  const eximOrgs = await eximDb.collection('organisations').find({}).toArray();
  const eximCompanies = await eximDb.collection('companies').find({}).toArray();
  const eximAccounts = await eximDb.collection('accounts').find({}).toArray();

  // Build Contact Lookups
  const contactByLeadId = new Map<string, any>();
  const contactByCompName = new Map<string, any>();

  const leadIdToCompanyMap = new Map<string, string>();
  eximLeads.forEach(l => {
    if (l._id && l.company) {
      leadIdToCompanyMap.set(l._id.toString(), l.company.trim());
    }
  });

  eximContacts.forEach(cnt => {
    const fn = (cnt.firstName || '').trim();
    const ln = (cnt.lastName || '').trim();
    const full = `${fn} ${ln}`.trim();
    if (!full || full.toLowerCase() === 'suspa' || full.toLowerCase() === 'chennai' || full.toLowerCase() === 'club o7') return;

    const contactObj: any = {
      name: full,
    };
    if (cnt.title || cnt.designation) contactObj.designation = cnt.title || cnt.designation;
    if (cnt.phone || cnt.mobile) {
      contactObj.phone = cnt.phone || cnt.mobile;
      contactObj.whatsapp_number = cnt.phone || cnt.mobile;
    }
    if (cnt.email) contactObj.email = cnt.email;

    if (cnt.convertedFromLead) {
      contactByLeadId.set(cnt.convertedFromLead.toString(), contactObj);
      const matchedCompName = leadIdToCompanyMap.get(cnt.convertedFromLead.toString());
      if (matchedCompName) {
        contactByCompName.set(normalizeName(matchedCompName), contactObj);
      }
    }
  });

  const federatedCompanies: any[] = [];
  const processedNames = new Set<string>();
  const seenGstins = new Set<string>();

  // Helper to extract or resolve contact
  const resolveContact = (item: any) => {
    const leadIdStr = item._id ? item._id.toString() : '';
    let realContact = contactByLeadId.get(leadIdStr);

    const compName = item.company || item.company_name || item.name || '';
    if (!realContact && compName) {
      realContact = contactByCompName.get(normalizeName(compName));
    }

    if (realContact) return realContact;

    if (item.contactPerson && item.contactPerson.trim()) {
      const contactObj: any = {
        name: item.contactPerson.trim(),
      };
      if (item.designation) contactObj.designation = item.designation;
      if (item.phone || item.mobile) {
        contactObj.phone = item.phone || item.mobile;
        contactObj.whatsapp_number = item.phone || item.mobile;
      }
      if (item.email) contactObj.email = item.email;
      return contactObj;
    }

    return null;
  };

  // Helper to create company object without fallbacks
  const buildCompanyDoc = (item: any, tags: string[]) => {
    const rawName = item.name || item.company_name || item.company || item.organisation_name;
    if (!rawName || processedNames.has(rawName.trim().toLowerCase())) return null;
    processedNames.add(rawName.trim().toLowerCase());

    const companyDoc: any = {
      company_name: rawName.trim(),
      source_tags: tags,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: new Date(),
    };

    if (item.status) {
      companyDoc.status = item.status === "converted" ? "Green" : item.status;
    }

    if (item.gstin) {
      const gstinVal = String(item.gstin).trim();
      if (gstinVal.toUpperCase() !== "URP" && gstinVal.length > 5) {
        if (!seenGstins.has(gstinVal)) {
          seenGstins.add(gstinVal);
          companyDoc.gstin = gstinVal;
        }
      }
    }
    if (item.ie_code_no || item.iec_code || item.iec) companyDoc.iec_code = item.ie_code_no || item.iec_code || item.iec;
    if (item.pan_number || item.cin_pan) companyDoc.cin_pan = item.pan_number || item.cin_pan;
    if (item.city) companyDoc.city = item.city;
    if (item.area) companyDoc.area = item.area;
    if (item.state) companyDoc.state = item.state;
    if (item.turnover_band || item.turnover) companyDoc.turnover_band = item.turnover_band || item.turnover;
    if (item.primary_industry || item.industry) companyDoc.primary_industry = item.primary_industry || item.industry;

    const contactObj = resolveContact(item);
    if (contactObj) {
      companyDoc.contacts = [contactObj];
    }

    companyDoc.services = [
      { vertical: 'customs_clearance', engaged: false },
      { vertical: 'freight_forwarding', engaged: false },
      { vertical: 'transport_logistics', engaged: false },
      { vertical: 'packaging_crates', engaged: false },
      { vertical: 'gps_elocks', engaged: false },
      { vertical: 'rfid_autorack', engaged: false },
    ];

    const hasDecisionMaker = Boolean(companyDoc.contacts && companyDoc.contacts.some((c: any) => c.phone || c.whatsapp_number));
    
    let daysSinceLastInteraction = 999;
    if (item.updatedAt) {
      const updatedDate = new Date(item.updatedAt);
      const diffMs = new Date().getTime() - updatedDate.getTime();
      daysSinceLastInteraction = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } else if (item.createdAt) {
      const createdDate = new Date(item.createdAt);
      const diffMs = new Date().getTime() - createdDate.getTime();
      daysSinceLastInteraction = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    companyDoc.priority_score = PriorityScoreService.calculatePriorityScore(companyDoc, companyDoc.contacts ? companyDoc.contacts.length : 0, hasDecisionMaker, daysSinceLastInteraction);
    companyDoc.completeness_score = PriorityScoreService.calculateCompletenessScore(companyDoc, companyDoc.contacts ? companyDoc.contacts.length : 0);

    return companyDoc;
  };

  // A. Process eximNew Customers
  for (const cust of eximCustomers) {
    const doc = buildCompanyDoc(cust, ["eximNew", "customers_sync"]);
    if (doc) federatedCompanies.push(doc);
  }

  // A2. Process eximNew Accounts
  for (const acc of eximAccounts) {
    const doc = buildCompanyDoc(acc, ["eximNew", "accounts_sync"]);
    if (doc) federatedCompanies.push(doc);
  }

  // B. Process eximNew Leads
  for (const lead of eximLeads) {
    const doc = buildCompanyDoc(lead, ["eximNew", "leads_sync"]);
    if (doc) federatedCompanies.push(doc);
  }

  // C. Process eximNew Organisations
  for (const org of eximOrgs) {
    const doc = buildCompanyDoc(org, ["eximNew", "organisations_sync"]);
    if (doc) federatedCompanies.push(doc);
  }

  // D. Process eximNew Companies
  for (const comp of eximCompanies) {
    const doc = buildCompanyDoc(comp, ["eximNew", "companies_sync"]);
    if (doc) federatedCompanies.push(doc);
  }

  console.log(` Upserting ${federatedCompanies.length} total federated companies into mi_companies...`);
  
  if (federatedCompanies.length > 0) {
    await miCompaniesCol.deleteMany({});
    try {
      await miCompaniesCol.insertMany(federatedCompanies, { ordered: false });
    } catch (err: any) {
      if (err.code === 11000) {
        console.warn(" Some duplicate GSTINs were skipped during insertion.");
      } else {
        throw err;
      }
    }
  }

  // Populate contacts collection in market_intelligence
  const contactsListToInsert: any[] = [];
  federatedCompanies.forEach((c) => {
    if (c.contacts && c.contacts.length > 0) {
      c.contacts.forEach((cnt: any) => {
        contactsListToInsert.push({
          full_name: cnt.name,
          ...(cnt.designation ? { current_designation: cnt.designation } : {}),
          company_name: c.company_name,
          company_id: c._id,
          ...(cnt.phone ? { mobile: cnt.phone, whatsapp_number: cnt.whatsapp_number, whatsapp_active: true } : {}),
          ...(cnt.email ? { email_work: cnt.email } : {}),
          employment_history: [],
          no_outreach_flag: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    }
  });

  if (contactsListToInsert.length > 0) {
    await miContactsCol.deleteMany({});
    await miContactsCol.insertMany(contactsListToInsert);
    console.log(` Upserted ${contactsListToInsert.length} contacts into market_intelligence.contacts.`);
  }

  await mainConn.close();
  await eximConn.close();
  await exportConn.close();

  console.log(`✅ Data Federation Complete! ${federatedCompanies.length} PRD-compliant companies and ${contactsListToInsert.length} contacts live in Market Intelligence DB.`);
  return federatedCompanies.length;
}

if (process.argv[1]?.endsWith('federate-all-exim-data.ts')) {
  federateAllEximData().catch(console.error);
}
