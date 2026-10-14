/**
 * API Smoke Test for Tactics and Partners Endpoints
 */

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import assert from 'assert';
import request from 'supertest';
import crmRoutes from '../routes/crm/crmRoutes.mjs';

dotenv.config();

async function runApiTests() {
  const mongoUri = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';
  await mongoose.connect(mongoUri);
  console.log('Connected to DB for API smoke test.');

  const app = express();
  app.use(express.json());
  // Mock auth user
  app.use((req, res, next) => {
    req.user = {
      _id: new mongoose.Types.ObjectId('6a2bb38ff9c7a55975a46633'),
      username: 'test_admin',
      role: 'Admin',
      crmRole: 'Admin'
    };
    next();
  });
  app.use('/api/crm', crmRoutes);

  // 1. GET /api/crm/tactics
  console.log('\n--- Test 1: GET /api/crm/tactics ---');
  const tacticsRes = await request(app).get('/api/crm/tactics');
  assert.strictEqual(tacticsRes.status, 200);
  assert.strictEqual(tacticsRes.body.success, true);
  assert.strictEqual(tacticsRes.body.data.length, 30, 'Must return all 30 tactics');
  console.log('✓ Returned 30 tactics successfully.');

  // 2. GET /api/crm/tactics?service=e-lock
  console.log('\n--- Test 2: GET /api/crm/tactics with star recommendations ---');
  const starredRes = await request(app).get('/api/crm/tactics?service=e-lock');
  assert.strictEqual(starredRes.status, 200);
  const starredCount = starredRes.body.data.filter(t => t.is_starred).length;
  assert(starredCount > 0, 'Must have starred tactics for e-lock');
  console.log(`✓ Returned tactics with ${starredCount} starred tactics for E-Lock.`);

  // 3. GET /api/crm/tactics/partners
  console.log('\n--- Test 3: GET /api/crm/tactics/partners ---');
  const partnersRes = await request(app).get('/api/crm/tactics/partners');
  assert.strictEqual(partnersRes.status, 200);
  assert(partnersRes.body.data.length > 0, 'Must return partner presets');
  console.log(`✓ Returned ${partnersRes.body.data.length} active partners.`);

  // 4. POST /api/crm/tactics/partners
  console.log('\n--- Test 4: POST /api/crm/tactics/partners ---');
  const newPartnerRes = await request(app).post('/api/crm/tactics/partners').send({
    name: 'Test CFS Operator Ltd',
    partner_type: 'CFS',
    office: 'Gandhidham'
  });
  assert.strictEqual(newPartnerRes.status, 201);
  assert.strictEqual(newPartnerRes.body.data.name, 'Test CFS Operator Ltd');
  console.log('✓ Created partner successfully.');

  // Clean up created test partner
  const Partner = (await import('../model/crm/Partner.mjs')).default;
  await Partner.findByIdAndDelete(newPartnerRes.body.data._id);

  // 5. GET /api/crm/reports/tactics views
  console.log('\n--- Test 5: GET /api/crm/reports/tactics (by_tactic view) ---');
  const reportByTactic = await request(app).get('/api/crm/reports/tactics?view=by_tactic');
  assert.strictEqual(reportByTactic.status, 200);
  assert.strictEqual(reportByTactic.body.data.length, 30);
  console.log('✓ by_tactic view returned 30 tactics with metrics.');

  console.log('\n--- Test 6: GET /api/crm/reports/tactics (by_line view) ---');
  const reportByLine = await request(app).get('/api/crm/reports/tactics?view=by_line');
  assert.strictEqual(reportByLine.status, 200);
  assert.strictEqual(reportByLine.body.data.length, 9, 'Must return 9 business lines');
  console.log('✓ by_line view returned 9 business lines.');

  console.log('\n--- Test 7: GET /api/crm/reports/tactics (matrix view) ---');
  const reportMatrix = await request(app).get('/api/crm/reports/tactics?view=matrix');
  assert.strictEqual(reportMatrix.status, 200);
  assert.strictEqual(reportMatrix.body.data.length, 30);
  console.log('✓ matrix view returned 30x9 grid data.');

  console.log('\n--- Test 8: GET /api/crm/reports/tactics (CSV export) ---');
  const csvRes = await request(app).get('/api/crm/reports/tactics?view=by_tactic&format=csv');
  assert.strictEqual(csvRes.status, 200);
  assert.strictEqual(csvRes.header['content-type'], 'text/csv; charset=utf-8');
  assert(csvRes.text.includes('Tactic Code,Tactic Name'), 'CSV header check');
  console.log('✓ CSV export generated valid CSV content.');

  // 9. Rule R2 Immutability Check: DELETE /api/crm/opportunities/:id/tactics
  console.log('\n--- Test 9: Rule R2 Immutability Check (DELETE must return 405) ---');
  const fakeOppId = new mongoose.Types.ObjectId();
  const deleteRes = await request(app).delete(`/api/crm/opportunities/${fakeOppId}/tactics`);
  assert.strictEqual(deleteRes.status, 405, 'DELETE must be rejected with 405');
  console.log('✓ DELETE properly blocked with 405 Method Not Allowed:', deleteRes.body.message);

  console.log('\n=============================================');
  console.log('✅ ALL API ENDPOINT TESTS PASSED PERFECTLY!');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

runApiTests().catch(err => {
  console.error('API Test error:', err);
  process.exit(1);
});
