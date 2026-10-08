/**
 * Shared Domain Service: Sales Tactics Validation & Operations
 * Enforces business rules R1–R5 from Sales_Tactic_Playbook_1.pdf across all deal lifecycle paths.
 */

import mongoose from 'mongoose';
import Tactic from '../../model/crm/Tactic.mjs';
import DealTactic from '../../model/crm/DealTactic.mjs';
import Partner from '../../model/crm/Partner.mjs';
import Opportunity from '../../model/crm/Opportunity.mjs';
import { isFeatureEnabled } from '../../config/featureFlags.mjs';

const T29_CODE = 'T29';
const VALID_RESULTS = ['worked', 'did_not_work', 'not_used'];

/**
 * Validates deal creation requirements (Rule R1, Rule R5)
 */
export async function validateDealCreation({ tactic_ids = [], partner_source_id = null }) {
  if (!isFeatureEnabled('SALES_TACTICS_ENABLED')) {
    return { valid: true };
  }

  const tacticsList = Array.isArray(tactic_ids) ? tactic_ids.filter(Boolean) : [];
  if (tacticsList.length === 0) {
    return {
      valid: false,
      message: 'Select at least one sales tactic.'
    };
  }

  // Resolve tactics to verify existence and check for T29
  const tactics = await Tactic.find({
    $or: [
      { _id: { $in: tacticsList.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
      { code: { $in: tacticsList } }
    ],
    is_active: true
  }).lean();

  if (tactics.length === 0) {
    return {
      valid: false,
      message: 'None of the provided sales tactics could be found.'
    };
  }

  const hasT29 = tactics.some(t => t.code === T29_CODE);
  if (hasT29) {
    if (!partner_source_id) {
      return {
        valid: false,
        message: 'Partner source is mandatory when T29 (Strategic Affiliates / Partners) is selected.'
      };
    }
    const partnerExists = await Partner.exists({ _id: partner_source_id, is_active: true });
    if (!partnerExists) {
      return {
        valid: false,
        message: 'Selected Partner source is invalid or inactive.'
      };
    }
  } else if (partner_source_id) {
    return {
      valid: false,
      message: 'Partner source can only be selected when T29 is used.'
    };
  }

  return {
    valid: true,
    resolvedTactics: tactics
  };
}

/**
 * Attaches tactics to a deal idempotently (Rule R1, R2).
 * If tactic already exists on deal, it is left untouched.
 */
export async function attachTacticsToDeal({
  dealId,
  tactic_ids = [],
  partner_source_id = null,
  userId,
  dealStatusWhenAdded = 'lead',
  results = []
}) {
  if (!dealId) throw new Error('dealId is required to attach tactics.');
  const tacticsList = Array.isArray(tactic_ids) ? tactic_ids.filter(Boolean) : [];
  if (tacticsList.length === 0) return [];

  // Find all matching tactics
  const tactics = await Tactic.find({
    $or: [
      { _id: { $in: tacticsList.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
      { code: { $in: tacticsList } }
    ]
  }).lean();

  const attached = [];
  const resultsMap = new Map();
  if (Array.isArray(results)) {
    results.forEach(r => {
      const key = (r.tactic_id || r.tactic_code || '').toString();
      if (key) resultsMap.set(key, r);
    });
  }

  for (const tactic of tactics) {
    const existing = await DealTactic.findOne({
      deal_id: dealId,
      tactic_id: tactic._id
    });

    if (existing) {
      attached.push(existing);
      continue;
    }

    const tacticResult = resultsMap.get(tactic._id.toString()) || resultsMap.get(tactic.code);
    const newRecordData = {
      deal_id: dealId,
      tactic_id: tactic._id,
      tactic_code: tactic.code,
      added_by: userId || new mongoose.Types.ObjectId('6a2bb38ff9c7a55975a46633'),
      added_at: new Date(),
      deal_status_when_added: dealStatusWhenAdded,
      result: tacticResult?.result || null,
      result_note: tacticResult?.result_note || null,
      result_set_by: tacticResult?.result ? userId : null,
      result_set_at: tacticResult?.result ? new Date() : null
    };

    const doc = await DealTactic.create(newRecordData);
    attached.push(doc);
  }

  // Update deal: clear tactics_legacy so deal participates in playbook analytics
  const oppUpdate = { tactics_legacy: false };
  const hasT29 = tactics.some(t => t.code === T29_CODE);
  if (hasT29 && partner_source_id) {
    oppUpdate.partner_source_id = partner_source_id;
  }
  await Opportunity.findByIdAndUpdate(dealId, oppUpdate);

  return attached;
}

/**
 * Validates deal close transition to 'won' or 'lost' (Rule R3, Rule R4).
 * Every attached tactic must have a non-null result and non-empty result_note.
 */
export async function validateDealCloseTransition({
  dealId,
  targetStage,
  tacticResults = []
}) {
  if (!isFeatureEnabled('SALES_TACTICS_ENABLED')) {
    return { valid: true };
  }

  if (targetStage !== 'won' && targetStage !== 'lost') {
    return { valid: true };
  }

  const deal = await Opportunity.findById(dealId).lean();
  if (!deal) {
    return { valid: false, message: 'Deal not found.' };
  }

  // Fetch all deal tactics
  let dealTactics = await DealTactic.find({ deal_id: dealId }).populate('tactic_id').lean();

  // If deal is legacy with 0 tactics attached
  if (dealTactics.length === 0) {
    const suppliedResults = Array.isArray(tacticResults) ? tacticResults : [];
    if (suppliedResults.length === 0) {
      return {
        valid: false,
        message: 'This deal requires at least one sales tactic and recorded results before it can be closed.'
      };
    }
  }

  // Build a lookup map of supplied results
  const suppliedMap = new Map();
  if (Array.isArray(tacticResults)) {
    tacticResults.forEach(r => {
      if (r.tactic_id) suppliedMap.set(r.tactic_id.toString(), r);
      if (r.tactic_code) suppliedMap.set(r.tactic_code.toString().toUpperCase(), r);
    });
  }

  const missingTactics = [];

  for (const dt of dealTactics) {
    const tacticCode = dt.tactic_code || dt.tactic_id?.code || 'Unknown';
    const tacticName = dt.tactic_id?.name || tacticCode;
    const supplied = suppliedMap.get(dt.tactic_id?._id?.toString()) || suppliedMap.get(tacticCode);

    const effectiveResult = supplied?.result !== undefined ? supplied.result : dt.result;
    const effectiveNote = supplied?.result_note !== undefined ? (supplied.result_note || '').trim() : (dt.result_note || '').trim();

    if (!effectiveResult || !VALID_RESULTS.includes(effectiveResult)) {
      missingTactics.push(`${tacticCode} (${tacticName}) - missing result ('Worked', 'Did not work', or 'Not used')`);
    } else if (!effectiveNote) {
      missingTactics.push(`${tacticCode} (${tacticName}) - missing result note`);
    }
  }

  if (missingTactics.length > 0) {
    return {
      valid: false,
      message: `Cannot close deal. The following tactics require outcomes and notes:\n${missingTactics.join('\n')}`,
      missingTactics
    };
  }

  return { valid: true };
}

/**
 * Updates results and notes on attached tactics when closing or modifying outcomes.
 */
export async function recordTacticResults({
  dealId,
  tacticResults = [],
  userId
}) {
  if (!dealId || !Array.isArray(tacticResults)) return [];

  const updatedRecords = [];
  const now = new Date();

  for (const r of tacticResults) {
    const query = { deal_id: dealId };
    if (r.tactic_id && mongoose.Types.ObjectId.isValid(r.tactic_id)) {
      query.tactic_id = r.tactic_id;
    } else if (r.tactic_code) {
      query.tactic_code = r.tactic_code.toUpperCase();
    } else {
      continue;
    }

    const updateFields = {
      result_set_at: now
    };
    if (r.result !== undefined) {
      if (VALID_RESULTS.includes(r.result)) {
        updateFields.result = r.result;
      }
    }
    if (r.result_note !== undefined) {
      updateFields.result_note = (r.result_note || '').trim();
    }
    if (userId) {
      updateFields.result_set_by = userId;
    }

    const doc = await DealTactic.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true }
    );
    if (doc) updatedRecords.push(doc);
  }

  return updatedRecords;
}

export default {
  validateDealCreation,
  attachTacticsToDeal,
  validateDealCloseTransition,
  recordTacticResults
};
