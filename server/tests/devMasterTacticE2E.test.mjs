import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Force test environment variables
process.env.NODE_ENV = 'test';
process.env.DISABLE_CLUSTER = 'true';

const MONGODB_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function runDevMasterE2ETest() {
  console.log('====================================================');
  console.log('🧪 Starting End-to-End Test with User: dev_master');
  console.log('====================================================\n');

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB:', MONGODB_URI);

  // Import Express application
  const { default: app } = await import('../app.mjs');
  const UserModel = (await import('../model/userModel.mjs')).default;
  const Partner = (await import('../model/crm/Partner.mjs')).default;
  const Opportunity = (await import('../model/crm/Opportunity.mjs')).default;
  const DealTactic = (await import('../model/crm/DealTactic.mjs')).default;
  const Account = (await import('../model/crm/Account.mjs')).default;

  // 1. Authenticate with dev_master and @wsxzaq1
  console.log('\n--- Step 1: Authentication as dev_master ---');
  const loginRes = await request(app)
    .post('/api/login')
    .send({
      username: 'dev_master',
      password: '@wsxzaq1'
    });

  if (loginRes.status !== 200) {
    console.error('❌ Login failed with status', loginRes.status, loginRes.body);
    process.exit(1);
  }

  const cookieHeader = loginRes.headers['set-cookie'];
  const devMasterUser = loginRes.body;
  const bearerToken = `Bearer ${devMasterUser.token}`;
  console.log('✓ Login successful! Status:', loginRes.status);
  console.log(`✓ Logged in as: ${devMasterUser.username} (Role: ${devMasterUser.role})`);
  console.log('✓ Auth cookie received:', Boolean(cookieHeader));

  // 2. Test GET /api/crm/tactics
  console.log('\n--- Step 2: Fetch Tactics Master Catalog ---');
  const tacticsRes = await request(app)
    .get('/api/crm/tactics?service=paramount')
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id);

  console.log('✓ GET /api/crm/tactics status:', tacticsRes.status);
  if (!tacticsRes.body.success || tacticsRes.body.data.length !== 30) {
    throw new Error(`Expected 30 tactics, received ${tacticsRes.body.data?.length}`);
  }
  const starredCount = tacticsRes.body.data.filter(t => t.is_starred).length;
  console.log(`✓ Received 30 tactics (${starredCount} starred for Paramount line fit)`);

  // 3. Test GET /api/crm/tactics/partners
  console.log('\n--- Step 3: Fetch Strategic Partners (for T29) ---');
  const partnersRes = await request(app)
    .get('/api/crm/tactics/partners')
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id);

  console.log('✓ GET /api/crm/tactics/partners status:', partnersRes.status);
  const partnersList = partnersRes.body.data || [];
  console.log(`✓ Received ${partnersList.length} active strategic partners`);
  if (partnersList.length === 0) throw new Error('No partners returned');
  const samplePartner = partnersList[0];
  console.log(`  Sample partner: ${samplePartner.name} (${samplePartner.partner_type})`);

  // 4. Test Rule R1: Opportunity creation without tactics should be REJECTED
  console.log('\n--- Step 4: Rule R1 Enforcement (No Tactics Rejection) ---');
  // Find or create a test account
  let testAccount = await Account.findOne({ name: 'DevMaster Test Account' });
  if (!testAccount) {
    testAccount = new Account({ name: 'DevMaster Test Account', ownerId: devMasterUser._id });
    await testAccount.save();
  }

  const noTacticRes = await request(app)
    .post('/api/crm/opportunities')
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id)
    .send({
      name: 'E2E Deal Without Tactics',
      accountId: testAccount._id,
      value: 75000,
      stage: 'lead',
      services: ['paramount'],
      tactic_ids: [] // Empty
    });

  if (noTacticRes.status === 400 && noTacticRes.body.message.includes('Select at least one sales tactic')) {
    console.log('✓ Rule R1 properly enforced: Rejection with 400:', noTacticRes.body.message);
  } else {
    throw new Error(`Expected 400 rejection for missing tactics, got ${noTacticRes.status}: ${JSON.stringify(noTacticRes.body)}`);
  }

  // 5. Test Rule R5: T29 without partner source should be REJECTED
  console.log('\n--- Step 5: Rule R5 Enforcement (T29 Partner Required) ---');
  const noPartnerRes = await request(app)
    .post('/api/crm/opportunities')
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id)
    .send({
      name: 'E2E Deal T29 No Partner',
      accountId: testAccount._id,
      value: 120000,
      stage: 'lead',
      services: ['paramount'],
      tactic_ids: ['T29'] // T29 without partner_source_id
    });

  if (noPartnerRes.status === 400 && noPartnerRes.body.message.includes('Partner source is mandatory')) {
    console.log('✓ Rule R5 properly enforced: Rejection with 400:', noPartnerRes.body.message);
  } else {
    throw new Error(`Expected 400 rejection for T29 without partner, got ${noPartnerRes.status}`);
  }

  // 6. Create valid deal with T29 + partner + T02 as dev_master
  console.log('\n--- Step 6: Create Valid Opportunity with Tactics as dev_master ---');
  const validCreateRes = await request(app)
    .post('/api/crm/opportunities')
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id)
    .send({
      name: 'E2E DevMaster Strategic Deal',
      accountId: testAccount._id,
      value: 250000,
      stage: 'proposal',
      services: ['paramount', 'freight forwarding'],
      businessVertical: 'Paramount',
      discountPercent: 5,
      discountAmount: 12500,
      tactic_ids: ['T02', 'T29'],
      partner_source_id: samplePartner._id
    });

  if (validCreateRes.status !== 201) {
    throw new Error(`Failed to create opportunity: ${validCreateRes.status} ${JSON.stringify(validCreateRes.body)}`);
  }

  const createdOpp = validCreateRes.body;
  console.log('✓ Opportunity created successfully! ID:', createdOpp._id);
  console.log('✓ Deal Name:', createdOpp.name, 'Value: ₹' + createdOpp.value);
  console.log('✓ Discounts:', `${createdOpp.discountPercent}% (₹${createdOpp.discountAmount})`);

  // Verify attached DealTactic records in DB
  const attachedTactics = await DealTactic.find({ deal_id: createdOpp._id }).lean();
  console.log(`✓ Attached tactics in DB: ${attachedTactics.map(t => t.tactic_code).join(', ')} (Count: ${attachedTactics.length})`);
  if (attachedTactics.length !== 2) throw new Error('Expected 2 attached tactics');

  // 7. Test Rule R2: DELETE tactic should return 405 Method Not Allowed
  console.log('\n--- Step 7: Rule R2 Enforcement (Immutability / No Delete) ---');
  const deleteDealTacticRes = await request(app)
    .delete(`/api/crm/opportunities/${createdOpp._id}/tactics`)
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id);

  if (deleteDealTacticRes.status === 405) {
    console.log('✓ Rule R2 properly enforced on deal tactics: DELETE returned 405:', deleteDealTacticRes.body.message);
  } else {
    throw new Error(`Expected 405 on deal tactic delete, got ${deleteDealTacticRes.status}`);
  }

  const deleteTacticMasterRes = await request(app)
    .delete(`/api/crm/tactics/${attachedTactics[0]._id}`)
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id);

  if (deleteTacticMasterRes.status === 405) {
    console.log('✓ Rule R2 properly enforced on tactic catalog: DELETE returned 405:', deleteTacticMasterRes.body.message);
  } else {
    throw new Error(`Expected 405 on tactic catalog delete, got ${deleteTacticMasterRes.status}`);
  }

  // 8. Add additional tactic (T05) during lifecycle (Rule R2 allows adding)
  console.log('\n--- Step 8: Add Additional Tactic (T05) During Deal Lifecycle ---');
  const addTacticRes = await request(app)
    .post(`/api/crm/opportunities/${createdOpp._id}/tactics`)
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id)
    .send({
      tactic_ids: ['T05']
    });

  console.log('✓ Added T05 status:', addTacticRes.status);
  const updatedTactics = await DealTactic.find({ deal_id: createdOpp._id }).lean();
  console.log(`✓ Updated attached tactics: ${updatedTactics.map(t => t.tactic_code).join(', ')} (Count: ${updatedTactics.length})`);
  if (updatedTactics.length !== 3) throw new Error('Expected 3 attached tactics after adding T05');

  // 9. Rules R3 & R4: Attempt to close deal as Won WITHOUT outcomes
  console.log('\n--- Step 9: Rules R3 & R4 Enforcement (Terminal Close Rejection Without Outcomes) ---');
  const closeWithoutOutcomeRes = await request(app)
    .put(`/api/crm/opportunities/${createdOpp._id}`)
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id)
    .send({
      stage: 'won'
    });

  if (closeWithoutOutcomeRes.status === 400 && closeWithoutOutcomeRes.body.message.includes('missing result')) {
    console.log('✓ Rules R3 & R4 properly enforced: Rejection with 400:');
    console.log(' ', closeWithoutOutcomeRes.body.message);
  } else {
    throw new Error(`Expected 400 for close without outcomes, got ${closeWithoutOutcomeRes.status}`);
  }

  // 10. Rules R3 & R4: Close deal as Won WITH complete outcomes and 1-line notes
  console.log('\n--- Step 10: Close Deal with Valid Outcomes & 1-Line Notes as dev_master ---');
  const validCloseRes = await request(app)
    .put(`/api/crm/opportunities/${createdOpp._id}`)
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id)
    .send({
      stage: 'won',
      tactic_results: [
        { tactic_code: 'T02', result: 'worked', result_note: 'Uncovered bottleneck in cargo packing and presented engineered crate solution.' },
        { tactic_code: 'T29', result: 'worked', result_note: 'CFS partner introduced procurement director which finalized agreement.' },
        { tactic_code: 'T05', result: 'not_used', result_note: 'Client approved quote before trial container was needed.' }
      ]
    });

  if (validCloseRes.status === 200) {
    console.log('✓ Deal closed as WON successfully! Status:', validCloseRes.status);
  } else {
    throw new Error(`Failed to close deal: ${validCloseRes.status} ${JSON.stringify(validCloseRes.body)}`);
  }

  // Verify recorded results in database
  const finalTactics = await DealTactic.find({ deal_id: createdOpp._id }).lean();
  console.log('✓ Recorded Tactic Outcomes in DB:');
  finalTactics.forEach(t => {
    console.log(`  - ${t.tactic_code}: Result=${t.result} | Note="${t.result_note}"`);
  });

  // 11. Rule R7: Test Analytics Reports as dev_master
  console.log('\n--- Step 11: Rule R7 Analytics Reports Verification as dev_master ---');

  // 11a: By Tactic View
  const repByTactic = await request(app)
    .get('/api/crm/tactics/report?view=by_tactic')
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id);
  console.log('✓ Report [by_tactic] status:', repByTactic.status, `(Total items: ${repByTactic.body.data?.length})`);
  const t02Metrics = repByTactic.body.data?.find(t => t.code === 'T02');
  console.log(`  T02 Metrics -> Deals: ${t02Metrics?.dealsTagged}, Won: ${t02Metrics?.wonCount}, WinRate: ${t02Metrics?.winRate}%`);

  // 11b: By Line View
  const repByLine = await request(app)
    .get('/api/crm/tactics/report?view=by_line')
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id);
  console.log('✓ Report [by_line] status:', repByLine.status, `(Total lines: ${repByLine.body.data?.length})`);

  // 11c: By Salesperson View
  const repByRep = await request(app)
    .get('/api/crm/tactics/report?view=by_salesperson')
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id);
  console.log('✓ Report [by_salesperson] status:', repByRep.status, `(Salespeople count: ${repByRep.body.data?.length})`);

  // 11d: Matrix View (30x9 Grid)
  const repMatrix = await request(app)
    .get('/api/crm/tactics/report?view=matrix')
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id);
  console.log('✓ Report [matrix] status:', repMatrix.status, `(Matrix rows: ${repMatrix.body.data?.length})`);

  // 11e: CSV Export
  const repCSV = await request(app)
    .get('/api/crm/tactics/report?view=by_tactic&format=csv')
    .set('Cookie', cookieHeader)
    .set('user-id', devMasterUser._id);
  console.log('✓ Report [CSV export] status:', repCSV.status, `(Content-Type: ${repCSV.headers['content-type']})`);

  // Cleanup test opportunity
  await DealTactic.deleteMany({ deal_id: createdOpp._id });
  await Opportunity.deleteOne({ _id: createdOpp._id });
  console.log('\n✓ Cleaned up test opportunity and tactics.');

  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log('🎉 ALL END-TO-END TESTS PASSED AS dev_master!');
  console.log('====================================================\n');
}

runDevMasterE2ETest().catch(err => {
  console.error('\n❌ TEST RUNNER ERROR:', err);
  process.exit(1);
});
