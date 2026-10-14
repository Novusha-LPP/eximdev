/**
 * Sales Tactics Master Migration & Seed Script
 * - Sets up collections & indexes for Tactic, TacticLineFit, Partner, DealTactic
 * - Seeds 30 Playbook Tactics (T01-T30) idempotently
 * - Seeds TacticLineFit star ratings for both codes and familiar business line names
 * - Seeds default partner categories and office presets
 * - Flags existing deals as tactics_legacy = true
 * 
 * Usage:
 * node server/migrations/setupSalesTactics.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tactic from '../model/crm/Tactic.mjs';
import TacticLineFit from '../model/crm/TacticLineFit.mjs';
import Partner from '../model/crm/Partner.mjs';
import DealTactic from '../model/crm/DealTactic.mjs';
import Opportunity from '../model/crm/Opportunity.mjs';

dotenv.config();

export const TACTICS_SEED = [
  { code: 'T01', name: 'Money Model', stage: 'Foundations', sort_order: 1 },
  { code: 'T02', name: 'Problem-Solution Chain', stage: 'Foundations', sort_order: 2 },
  { code: 'T03', name: '30-Day Cash Rule', stage: 'Foundations', sort_order: 3 },
  { code: 'T04', name: '30-Day Payback Test', stage: 'Foundations', sort_order: 4 },
  { code: 'T05', name: 'Compounding Growth Math', stage: 'Foundations', sort_order: 5 },
  { code: 'T06', name: 'Four Offer Types', stage: 'Foundations', sort_order: 6 },
  { code: 'T07', name: 'Three-Stage Rollout', stage: 'Foundations', sort_order: 7 },
  { code: 'T08', name: 'One Offer at a Time', stage: 'Foundations', sort_order: 8 },
  { code: 'T09', name: 'Simplicity', stage: 'Foundations', sort_order: 9 },
  { code: 'T10', name: 'Win Your Money Back', stage: 'Attraction', sort_order: 10 },
  { code: 'T11', name: 'Giveaways', stage: 'Attraction', sort_order: 11 },
  { code: 'T12', name: 'Decoy', stage: 'Attraction', sort_order: 12 },
  { code: 'T13', name: 'Buy X Get Y Free', stage: 'Attraction', sort_order: 13 },
  { code: 'T14', name: 'Pay Less Now or Pay More Later', stage: 'Attraction', sort_order: 14 },
  { code: 'T15', name: 'Classic Upsell', stage: 'Upsell', sort_order: 15 },
  { code: 'T16', name: 'Menu Upsell', stage: 'Upsell', sort_order: 16 },
  { code: 'T17', name: 'Anchor Upsell', stage: 'Upsell', sort_order: 17 },
  { code: 'T18', name: 'Rollover Upsell', stage: 'Upsell', sort_order: 18 },
  { code: 'T19', name: 'Payment Plan', stage: 'Downsell', sort_order: 19 },
  { code: 'T20', name: 'Trial With Penalty', stage: 'Downsell', sort_order: 20 },
  { code: 'T21', name: 'Feature Downsell', stage: 'Downsell', sort_order: 21 },
  { code: 'T22', name: 'Continuity Bonus', stage: 'Continuity', sort_order: 22 },
  { code: 'T23', name: 'Continuity Discount', stage: 'Continuity', sort_order: 23 },
  { code: 'T24', name: 'Waived Fee', stage: 'Continuity', sort_order: 24 },
  { code: 'T25', name: 'Four-Week Billing', stage: 'Optimisation', sort_order: 25 },
  { code: 'T26', name: 'Payment-Method Processing Fee', stage: 'Optimisation', sort_order: 26 },
  { code: 'T27', name: 'Cancellation Fee = Discounts Received', stage: 'Optimisation', sort_order: 27 },
  { code: 'T28', name: 'Incremental Price Increases', stage: 'Optimisation', sort_order: 28 },
  { code: 'T29', name: 'Strategic Affiliates / Partners', stage: 'Optimisation', sort_order: 29 },
  { code: 'T30', name: 'Automated Renewals', stage: 'Optimisation', sort_order: 30 }
];

export const LINE_MAPPINGS = [
  { code: 'FF', familiar: 'freight forwarding', label: 'Freight Forwarding' },
  { code: 'CC', familiar: 'customs clearance', label: 'Customs Clearance' },
  { code: 'DG', familiar: 'dgft', label: 'DGFT' },
  { code: 'EL', familiar: 'e-lock', label: 'E-Lock' },
  { code: 'CR', familiar: 'paramount', label: 'Paramount' },
  { code: 'AM', familiar: 'autorack', label: 'Autorack' },
  { code: 'CT', familiar: 'transportation', label: 'Transportation' },
  { code: 'SW', familiar: 'client', label: 'AIVision / Client' },
  { code: 'MB', familiar: 'rabs', label: 'RABS' }
];

// Playbook star fits mapping per tactic code
const STAR_FITS = {
  T01: ['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB'],
  T02: ['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB'],
  T03: ['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB'],
  T04: ['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB'],
  T05: ['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB'],
  T06: ['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB'],
  T07: ['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB'],
  T08: ['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB'],
  T09: ['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB'],
  T10: ['EL', 'DG', 'CR', 'AM', 'SW'],
  T11: ['CC', 'FF', 'EL', 'DG'],
  T12: ['FF', 'CC', 'CT', 'CR', 'AM'],
  T13: ['CR', 'EL', 'CT', 'FF'],
  T14: ['FF', 'CC', 'DG', 'SW'],
  T15: ['FF', 'CC', 'DG', 'CT', 'CR'],
  T16: ['FF', 'CC', 'DG', 'CT', 'CR'],
  T17: ['SW', 'EL', 'FF', 'CC'],
  T18: ['CT', 'CR', 'AM', 'FF'],
  T19: ['DG', 'SW', 'CR', 'CT'],
  T20: ['EL', 'SW', 'AM'],
  T21: ['SW', 'FF', 'CC', 'DG'],
  T22: ['FF', 'CC', 'CT', 'EL'],
  T23: ['FF', 'CC', 'CT', 'CR', 'EL'],
  T24: ['CC', 'FF', 'DG'],
  T25: ['CT', 'FF', 'CC'],
  T26: ['FF', 'CC', 'CT'],
  T27: ['FF', 'CC', 'CT', 'EL'],
  T28: ['FF', 'CC', 'CT', 'CR', 'DG'],
  T29: ['CC', 'FF', 'EL', 'CR', 'AM', 'CT'],
  T30: ['EL', 'DG', 'SW', 'CT']
};

export const PARTNER_PRESETS = [
  { name: 'Adani Logistics CFS', partner_type: 'CFS', office: 'Gandhidham' },
  { name: 'Saurashtra CFS', partner_type: 'CFS', office: 'Gandhidham' },
  { name: 'Hazira CFS Terminal', partner_type: 'CFS', office: 'Hazira' },
  { name: 'Cochin Port CFS Trust', partner_type: 'CFS', office: 'Cochin' },
  { name: 'Ahmedabad Inland CFS', partner_type: 'CFS', office: 'Ahmedabad' },
  { name: 'Baroda Logistics CFS', partner_type: 'CFS', office: 'Baroda' },
  { name: 'Rajkot Cargo CFS', partner_type: 'CFS', office: 'Rajkot' },
  { name: 'Concor ICD/CFS Jaipur', partner_type: 'CFS', office: 'Jaipur' },
  { name: '3M Automotive Tape Partner', partner_type: 'Automotive tape brand', office: 'Ahmedabad' },
  { name: 'Gujarat Industrial Labour Services', partner_type: 'Labour contractor', office: 'Ahmedabad' },
  { name: 'SIS Security Solutions', partner_type: 'Security contractor', office: 'Gandhidham' },
  { name: 'Apex Palletisation Suppliers', partner_type: 'Palletisation supplier', office: 'Baroda' },
  { name: 'TimberCraft Wooden Pallets', partner_type: 'Wooden pallet supplier', office: 'Gandhidham' },
  { name: 'PestControl & Fumigation Direct', partner_type: 'Fumigation supplier', office: 'Hazira' },
  { name: 'New India Marine Insurance Desk', partner_type: 'Insurance dealer', office: 'Ahmedabad' },
  { name: 'Shah & Associates Export CAs', partner_type: 'CA', office: 'Ahmedabad' },
  { name: 'Tally / ERP Solutions Partner', partner_type: 'ERP reseller', office: 'Ahmedabad' },
  { name: 'Gujarat Chamber of Commerce & Industry', partner_type: 'Industry association', office: 'Ahmedabad' }
];

export async function runMigration() {
  const mongoUri = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/eximNew';
  console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:[^:]*@/, ':****@')}...`);
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.');

  // 1. Create Indexes
  console.log('\n--- Ensuring Collections & Indexes ---');
  await Tactic.syncIndexes();
  console.log('✓ Tactic indexes synced.');
  await TacticLineFit.syncIndexes();
  console.log('✓ TacticLineFit indexes synced.');
  await Partner.syncIndexes();
  console.log('✓ Partner indexes synced.');
  await DealTactic.syncIndexes();
  console.log('✓ DealTactic indexes synced.');
  await Opportunity.syncIndexes();
  console.log('✓ Opportunity indexes synced.');

  // 2. Seed Tactics
  console.log('\n--- Seeding 30 Playbook Tactics ---');
  const tacticDocs = {};
  for (const item of TACTICS_SEED) {
    const updated = await Tactic.findOneAndUpdate(
      { code: item.code },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    tacticDocs[item.code] = updated;
  }
  console.log(`✓ Successfully seeded ${Object.keys(tacticDocs).length} tactics (T01–T30).`);

  // 3. Seed TacticLineFit
  console.log('\n--- Seeding TacticLineFit (Star Ratings) ---');
  let lineFitCount = 0;
  for (const tactic of TACTICS_SEED) {
    const tacticDoc = tacticDocs[tactic.code];
    const starredCodes = STAR_FITS[tactic.code] || [];

    for (const line of LINE_MAPPINGS) {
      const isStarred = starredCodes.includes(line.code);

      // Seed with 2-letter code
      await TacticLineFit.findOneAndUpdate(
        { tactic_id: tacticDoc._id, business_line: line.code },
        {
          $set: {
            tactic_code: tactic.code,
            business_line: line.code,
            is_starred: isStarred
          }
        },
        { upsert: true }
      );
      lineFitCount++;

      // Also seed with familiar name for instant matching without code conversion
      await TacticLineFit.findOneAndUpdate(
        { tactic_id: tacticDoc._id, business_line: line.familiar },
        {
          $set: {
            tactic_code: tactic.code,
            business_line: line.familiar,
            is_starred: isStarred
          }
        },
        { upsert: true }
      );
      lineFitCount++;
    }
  }
  console.log(`✓ Successfully seeded ${lineFitCount} tactic line fit combinations.`);

  // 4. Seed Partners
  console.log('\n--- Seeding Partner Presets ---');
  let partnerCount = 0;
  for (const p of PARTNER_PRESETS) {
    await Partner.findOneAndUpdate(
      { name: p.name, office: p.office },
      { $set: { ...p, is_active: true } },
      { upsert: true }
    );
    partnerCount++;
  }
  console.log(`✓ Successfully seeded ${partnerCount} partner presets.`);

  // 5. Flag Legacy Deals
  console.log('\n--- Flagging Pre-Existing Deals as Legacy ---');
  const legacyUpdateResult = await Opportunity.updateMany(
    { tactics_legacy: { $ne: true } },
    { $set: { tactics_legacy: true } }
  );
  console.log(`✓ Marked ${legacyUpdateResult.modifiedCount} existing deals with tactics_legacy: true.`);

  console.log('\n=========================================');
  console.log('✅ Sales Tactics Migration & Seed Completed!');
  console.log('=========================================\n');
}

// Execute directly if run as main script
if (process.argv[1]?.endsWith('setupSalesTactics.mjs')) {
  runMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
