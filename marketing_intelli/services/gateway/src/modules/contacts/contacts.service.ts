// ─── Contacts Service ────────────────────────────────────────────
// services/gateway/src/modules/contacts/contacts.service.ts
// Handles Contact CRUD, Job History updates, and Confidential Relationship Intelligence (PRD §5 & §5.4)

import { Contact } from '../../models/Contact.js';
import { RelationshipIntelligence } from '../../models/RelationshipIntelligence.js';
import { AuditLog } from '../../models/AuditLog.js';
import { LiveFederationService } from '../../services/liveFederation.service.js';
import mongoose from 'mongoose';

export class ContactsService {
  /**
   * Search and list all contacts across companies (PRD §5)
   */
  static async getAllContacts(query: any = {}) {
    // Run dynamic live database federation from exim & export
    await LiveFederationService.syncLiveDatabase();

    const filter: any = { status: { $ne: 'Inactive' } };

    if (query.company_id) {
      filter.company_id = query.company_id;
    }
    if (query.decision_authority) {
      filter.decision_authority = query.decision_authority;
    }
    if (query.search) {
      filter.$or = [
        { full_name: new RegExp(query.search, 'i') },
        { current_designation: new RegExp(query.search, 'i') },
        { mobile: new RegExp(query.search, 'i') },
        { email_work: new RegExp(query.search, 'i') },
      ];
    }

    const limit = Number(query.limit) || 100;
    return Contact.find(filter)
      .populate('company_id', 'company_name city primary_industry')
      .populate('relationship_intel_id')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get all contacts for a specific company
   */
  static async getContactsByCompany(companyId: string) {
    return Contact.find({ company_id: companyId, status: { $ne: 'Inactive' } })
      .populate('relationship_intel_id')
      .sort({ createdAt: -1 });
  }

  /**
   * Create a new contact
   */
  static async createContact(data: any) {
    const contact = new Contact({
      full_name: data.full_name,
      current_designation: data.current_designation,
      company_id: data.company_id,
      employment_history: data.employment_history || [],
      decision_authority: data.decision_authority || 'Influences',
      mobile: data.mobile,
      whatsapp_number: data.whatsapp_number || data.mobile,
      whatsapp_active: data.whatsapp_active ?? true,
      email_work: data.email_work,
      email_personal: data.email_personal,
      linkedin_url: data.linkedin_url,
      no_outreach_flag: data.no_outreach_flag ?? false,
      status: 'Active',
    });

    return await contact.save();
  }

  /**
   * Update contact job movement (§5.3 Job Change Tracking)
   */
  static async updateJobChange(
    contactId: string,
    newCompanyId: string,
    newCompanyName: string,
    newRole: string,
    user: { id: string; role: string }
  ) {
    const contact = await Contact.findById(contactId);
    if (!contact) throw new Error('Contact not found');

    // Archive current role into employment history
    contact.employment_history.push({
      company_name: newCompanyName,
      role: contact.current_designation,
      to_date: new Date(),
      left_on_good_terms: true,
    });

    contact.company_id = new mongoose.Types.ObjectId(newCompanyId);
    contact.current_designation = newRole;
    contact.status = 'Active';

    await contact.save();

    // Log job change audit entry
    await AuditLog.create({
      user_id: user.id,
      user_role: user.role,
      action: 'JOB_CHANGE_UPDATE',
      resource_type: 'Contact',
      resource_id: contact._id,
      details: { newCompanyId, newCompanyName, newRole },
    });

    return contact;
  }

  /**
   * Get Confidential Relationship Intelligence for a contact (PRD §5.4)
   * Enforces role security (CEO/Shipra) & logs immutable audit entry.
   */
  static async getRelationshipIntel(contactId: string, user: { id: string; role: string }) {
    // 1. Audit Log View Action
    await AuditLog.create({
      user_id: user.id,
      user_role: user.role,
      action: 'VIEW_RELATIONSHIP_INTEL',
      resource_type: 'RelationshipIntelligence',
      resource_id: new mongoose.Types.ObjectId(contactId),
      timestamp: new Date(),
    });

    // 2. Fetch Intel Document
    let intel = await RelationshipIntelligence.findOne({ contact_id: contactId });
    if (!intel) {
      // Return empty default state if not created yet
      return {
        contact_id: contactId,
        consent_recorded: false,
        relationship_quality_score: 3,
        exists: false,
      };
    }

    return intel;
  }

  /**
   * Upsert Relationship Intelligence document (PRD §5.4)
   * Enforces consent_recorded flag & audit logs modifications.
   */
  static async upsertRelationshipIntel(
    contactId: string,
    intelData: any,
    user: { id: string; role: string }
  ) {
    if (!intelData.consent_recorded) {
      throw new Error('PRD §5.4 Compliance: Consent must be recorded before saving personal relationship data.');
    }

    const updatedIntel = await RelationshipIntelligence.findOneAndUpdate(
      { contact_id: contactId },
      {
        $set: {
          dob: intelData.dob,
          hometown: intelData.hometown,
          religion_community: intelData.religion_community,
          dietary_pref: intelData.dietary_pref,
          interests_hobbies: intelData.interests_hobbies || [],
          best_time_to_call: intelData.best_time_to_call,
          communication_pref: intelData.communication_pref || [],
          language_pref: intelData.language_pref,
          personality_style: intelData.personality_style,
          known_dislikes_sensitivities: intelData.known_dislikes_sensitivities,
          relationship_quality_score: intelData.relationship_quality_score || 3,
          consent_recorded: true,
        },
      },
      { upsert: true, new: true }
    );

    // Link reference back to Contact
    await Contact.findByIdAndUpdate(contactId, {
      relationship_intel_id: updatedIntel._id,
    });

    // Audit log modification
    await AuditLog.create({
      user_id: user.id,
      user_role: user.role,
      action: 'UPDATE_RELATIONSHIP_INTEL',
      resource_type: 'RelationshipIntelligence',
      resource_id: updatedIntel._id,
      details: { consent: true },
    });

    return updatedIntel;
  }
}
