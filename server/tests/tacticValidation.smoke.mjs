/**
 * Smoke & Domain Logic Test for Sales Tactics Service
 * Tests Rules R1, R2, R3, R4, R5 against MongoDB.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import assert from 'assert';
import Tactic from '../model/crm/Tactic.mjs';
import Partner from '../model/crm/Partner.mjs';
import Opportunity from '../model/crm/Opportunity.mjs';
import DealTactic from '../model/crm/DealTactic.mjs';
import {
  validateDealCreation,
  attachTacticsToDeal,
  validateDealCloseTransition,
  recordTacticResults
} from '../services/crm/tacticValidationService.mjs';

dotenv.config();

async function runTests() {
  const mongoUri = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';
  await mongoose.connect(mongoUri);
  console.log('Connected to DB for smoke test.');

  const testUser = new mongoose.Types.ObjectId('6a2bb38ff9c7a55975a46633');

  // Fetch test tactics and partner
  const t01 = await Tactic.findOne({ code: 'T01' });
  const t29 = await Tactic.findOne({ code: 'T29' });
  const partner = await Partner.findOne({ is_active: true });

  assert(t01, 'T01 must exist');
  assert(t29, 'T29 must exist');
  assert(partner, 'Partner must exist');

  console.log('\n--- Test 1: Rule R1 (Creation requires at least 1 tactic) ---');
  const emptyCheck = await validateDealCreation({ tactic_ids: [] });
  assert.strictEqual(emptyCheck.valid, false, 'Empty tactics must fail');
  console.log('✓ Empty tactics properly rejected:', emptyCheck.message);

  const validCreate = await validateDealCreation({ tactic_ids: [t01._id] });
  assert.strictEqual(validCreate.valid, true, 'Valid tactic must pass');
  console.log('✓ Valid tactic passed.');

  console.log('\n--- Test 2: Rule R5 (T29 requires partner source) ---');
  const t29WithoutPartner = await validateDealCreation({ tactic_ids: [t29._id], partner_source_id: null });
  assert.strictEqual(t29WithoutPartner.valid, false, 'T29 without partner must fail');
  console.log('✓ T29 without partner properly rejected:', t29WithoutPartner.message);

  const t29WithPartner = await validateDealCreation({ tactic_ids: [t29._id], partner_source_id: partner._id });
  assert.strictEqual(t29WithPartner.valid, true, 'T29 with partner must pass');
  console.log('✓ T29 with partner passed.');

  console.log('\n--- Test 3: Rule R2 (Immutability & Idempotent attach) ---');
  const testDeal = await Opportunity.create({
    name: 'Tactic Unit Test Deal',
    accountId: new mongoose.Types.ObjectId(),
    stage: 'opportunity',
    value: 50000,
    createdBy: testUser
  });

  // Attach T01
  const firstAttach = await attachTacticsToDeal({
    dealId: testDeal._id,
    tactic_ids: [t01._id],
    userId: testUser,
    dealStatusWhenAdded: 'opportunity'
  });
  assert.strictEqual(firstAttach.length, 1);

  // Attach T01 again (idempotent duplicate test)
  const secondAttach = await attachTacticsToDeal({
    dealId: testDeal._id,
    tactic_ids: [t01._id],
    userId: testUser,
    dealStatusWhenAdded: 'opportunity'
  });
  const totalAttached = await DealTactic.countDocuments({ deal_id: testDeal._id });
  assert.strictEqual(totalAttached, 1, 'Duplicate tactic must not create a duplicate row');
  console.log('✓ Idempotency verified: exactly 1 DealTactic document exists.');

  console.log('\n--- Test 4: Rule R3 & R4 (Close Won/Lost requires results & notes) ---');
  const closeWithoutResults = await validateDealCloseTransition({
    dealId: testDeal._id,
    targetStage: 'won',
    tacticResults: []
  });
  assert.strictEqual(closeWithoutResults.valid, false, 'Closing without results must fail');
  console.log('✓ Closing without outcome properly rejected:', closeWithoutResults.message);

  const closeWithPartial = await validateDealCloseTransition({
    dealId: testDeal._id,
    targetStage: 'won',
    tacticResults: [{ tactic_id: t01._id, result: 'worked', result_note: '' }]
  });
  assert.strictEqual(closeWithPartial.valid, false, 'Missing result note must fail');
  console.log('✓ Closing without result note properly rejected.');

  const closeComplete = await validateDealCloseTransition({
    dealId: testDeal._id,
    targetStage: 'won',
    tacticResults: [{ tactic_id: t01._id, result: 'worked', result_note: 'Client responded well to simple upfront pricing.' }]
  });
  assert.strictEqual(closeComplete.valid, true, 'Complete result & note must pass');
  console.log('✓ Closing with complete result & note passed.');

  // Clean up test deal and its tactics
  await DealTactic.deleteMany({ deal_id: testDeal._id });
  await Opportunity.findByIdAndDelete(testDeal._id);
  console.log('\n✓ Cleaned up test deal data.');

  console.log('\n=============================================');
  console.log('✅ ALL DOMAIN SERVICE TESTS PASSED PERFECTLY!');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
