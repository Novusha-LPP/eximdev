// ─── Companies Service (Company 360 Intelligence) ────────────────
// services/gateway/src/modules/companies/companies.service.ts
// Implements PRD §4 — Company Intelligence Full Data Model

import mongoose from 'mongoose';
import { Company } from '../../models/Company.js';
import { Contact } from '../../models/Contact.js';
import { PriorityScoreService } from './PriorityScoreService.js';
import { LiveFederationService } from '../../services/liveFederation.service.js';

export const RED_REASON_CODES = [
  'Competitor',
  'Financial Risk',
  'Policy Conflict',
  'Too Small',
  'Bad Experience',
  'Out of Geography',
  'Duplicate Record'
] as const;

export class CompaniesService {

  /**
   * Search & List Companies with PRD Filters
   */
  static async getCompanies(query: any = {}) {
    await LiveFederationService.syncLiveDatabase();
    const filter: any = {};

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    if (query.city) {
      filter.city = new RegExp(query.city, 'i');
    }
    if (query.industry) {
      filter.primary_industry = new RegExp(query.industry, 'i');
    }
    if (query.owner) {
      filter.account_owner = query.owner;
    }
    if (query.vertical) {
      filter.services = {
        $elemMatch: { vertical: query.vertical, engaged: false }
      };
    }
    if (query.search) {
      filter.$or = [
        { company_name: new RegExp(query.search, 'i') },
        { city: new RegExp(query.search, 'i') },
        { primary_industry: new RegExp(query.search, 'i') },
        { gstin: new RegExp(query.search, 'i') },
        { iec_code: new RegExp(query.search, 'i') },
      ];
    }
    if (query.min_score) {
      filter['priority_score.total_score'] = { $gte: Number(query.min_score) };
    }

    const limit = Number(query.limit) || 100;
    const docs = await Company.find(filter)
      .sort({ 'priority_score.total_score': -1, updatedAt: -1 })
      .limit(limit)
      .exec();

    return docs.map(d => d.toObject());
  }

  /**
   * Fetch 360 Company Profile with Contacts and Score Recalculation
   */
  static async getCompanyById(companyId: string) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error('Invalid Company ID');
    }

    const company = await Company.findById(companyId).exec();
    if (!company) {
      throw new Error('Company not found');
    }

    // Fetch decision maker contacts
    const contacts = await Contact.find({ current_company_id: company._id }).exec();
    const hasDecisionMakerMobile = contacts.some(
      c => (c.decision_authority === 'Final decision' || c.decision_authority === 'Recommends') && Boolean(c.mobile)
    );

    // Recalculate priority score and completeness score
    const updatedScore = PriorityScoreService.calculatePriorityScore(
      company.toObject(),
      contacts.length,
      hasDecisionMakerMobile
    );
    const updatedCompleteness = PriorityScoreService.calculateCompletenessScore(
      company.toObject(),
      contacts.length
    );

    company.priority_score = updatedScore;
    company.completeness_score = updatedCompleteness;
    await company.save();

    return {
      ...company.toObject(),
      contacts: contacts.map(c => c.toObject()),
    };
  }

  /**
   * Create New Company with Deduplication & Default Owner
   */
  static async createCompany(data: any) {
    if (!data.company_name || !data.city) {
      throw new Error('PRD Rule: Company Name and City are required.');
    }

    // Deduplication check on GSTIN or Name + City
    if (data.gstin) {
      const existingGstin = await Company.findOne({ gstin: data.gstin }).exec();
      if (existingGstin) {
        throw new Error(`Duplicate Company: GSTIN ${data.gstin} already exists under ${existingGstin.company_name}`);
      }
    }

    const existingNameCity = await Company.findOne({
      company_name: new RegExp(`^${data.company_name.trim()}$`, 'i'),
      city: new RegExp(`^${data.city.trim()}$`, 'i'),
    }).exec();

    if (existingNameCity) {
      throw new Error(`Duplicate Company: ${data.company_name} in ${data.city} already exists in database.`);
    }

    // Enforce default owner (Shipra per PRD §4.5)
    const companyData = {
      ...data,
      account_owner: data.account_owner || 'Shipra',
      status: data.status || 'Yellow',
      services: data.services || [
        { vertical: 'customs_clearance', engaged: false },
        { vertical: 'freight_forwarding', engaged: false },
        { vertical: 'transport_logistics', engaged: false },
        { vertical: 'packaging_crates', engaged: false },
        { vertical: 'gps_elocks', engaged: false },
        { vertical: 'rfid_autorack', engaged: false },
      ],
    };

    const initialScore = PriorityScoreService.calculatePriorityScore(companyData, 0, false);
    const initialCompleteness = PriorityScoreService.calculateCompletenessScore(companyData, 0);

    companyData.priority_score = initialScore;
    companyData.completeness_score = initialCompleteness;

    const company = new Company(companyData);
    await company.save();
    return company.toObject();
  }

  /**
   * Update Company 360 Attributes
   */
  static async updateCompany(companyId: string, updates: any) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error('Invalid Company ID');
    }

    const company = await Company.findById(companyId).exec();
    if (!company) {
      throw new Error('Company not found');
    }

    // Apply updates
    Object.assign(company, updates);

    // Recalculate scores
    const contactsCount = await Contact.countDocuments({ current_company_id: company._id });
    const hasDecisionMaker = await Contact.exists({
      current_company_id: company._id,
      decision_authority: { $in: ['Final decision', 'Recommends'] },
      mobile: { $exists: true, $ne: '' }
    });

    company.priority_score = PriorityScoreService.calculatePriorityScore(
      company.toObject(),
      contactsCount,
      Boolean(hasDecisionMaker)
    );
    company.completeness_score = PriorityScoreService.calculateCompletenessScore(
      company.toObject(),
      contactsCount
    );

    await company.save();
    return company.toObject();
  }

  /**
   * Enforced Status Transition Rules (PRD §4.5)
   */
  static async updateStatus(companyId: string, status: string, reasonCode?: string, note?: string) {
    if (!['Green', 'Yellow', 'Red'].includes(status)) {
      throw new Error('Invalid status value. Allowed: Green, Yellow, Red');
    }

    if (status === 'Red') {
      if (!reasonCode || !RED_REASON_CODES.includes(reasonCode as any)) {
        throw new Error(`PRD Rule Violation: Red status requires a mandatory reason code from [${RED_REASON_CODES.join(', ')}]`);
      }
    }

    const company = await Company.findById(companyId).exec();
    if (!company) {
      throw new Error('Company not found');
    }

    company.status = status as any;
    if (status === 'Red') {
      company.status_reason_code = reasonCode;
    } else {
      company.status_reason_code = undefined;
    }

    await company.save();
    return company.toObject();
  }

  /**
   * Recalculate Priority Scores Across All Companies
   */
  static async recalculateAllScores() {
    const companies = await Company.find({}).exec();
    let updatedCount = 0;

    for (const c of companies) {
      const contacts = await Contact.find({ current_company_id: c._id }).exec();
      const hasDecisionMaker = contacts.some(
        cnt => (cnt.decision_authority === 'Final decision' || cnt.decision_authority === 'Recommends') && Boolean(cnt.mobile)
      );

      c.priority_score = PriorityScoreService.calculatePriorityScore(
        c.toObject(),
        contacts.length,
        hasDecisionMaker
      );
      c.completeness_score = PriorityScoreService.calculateCompletenessScore(
        c.toObject(),
        contacts.length
      );
      await c.save();
      updatedCount++;
    }

    return updatedCount;
  }
}
