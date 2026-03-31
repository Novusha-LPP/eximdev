/**
 * Diagnostic script to check company and user data state
 * Run: node scripts/check_data_state.mjs
 */
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/exim';

async function diagnose() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB\n');

  const db = mongoose.connection.db;

  // 1. Check companies collection
  console.log('=== COMPANIES ===');
  const companies = await db.collection('companies').find({}).toArray();
  console.log(`Total companies: ${companies.length}`);
  companies.forEach(c => {
    console.log(`  - ${c.company_name} (${c._id})`);
  });

  // 2. Check users with company_id
  console.log('\n=== USERS BY COMPANY_ID ===');
  const usersWithCompanyId = await db.collection('users').aggregate([
    { $match: { company_id: { $exists: true, $ne: null } } },
    { $group: { _id: '$company_id', count: { $sum: 1 } } }
  ]).toArray();
  
  console.log(`Users with company_id: ${usersWithCompanyId.reduce((s, g) => s + g.count, 0)}`);
  for (const g of usersWithCompanyId) {
    const company = companies.find(c => c._id.toString() === g._id.toString());
    console.log(`  - ${company?.company_name || g._id}: ${g.count} users`);
  }

  // 3. Check users WITHOUT company_id but WITH company string
  console.log('\n=== USERS WITHOUT company_id (but have company string) ===');
  const usersWithoutCompanyId = await db.collection('users').find({
    company: { $exists: true, $ne: '' },
    $or: [{ company_id: { $exists: false } }, { company_id: null }]
  }).limit(20).toArray();
  
  console.log(`Found: ${usersWithoutCompanyId.length} (showing max 20)`);
  usersWithoutCompanyId.forEach(u => {
    console.log(`  - ${u.username}: "${u.company}"`);
  });

  // 4. Check attendance records
  console.log('\n=== ATTENDANCE RECORDS ===');
  const recordCount = await db.collection('attendancerecords').countDocuments({});
  console.log(`Total attendance records: ${recordCount}`);
  
  const recentRecords = await db.collection('attendancerecords').find({})
    .sort({ attendance_date: -1 })
    .limit(5)
    .toArray();
  
  if (recentRecords.length > 0) {
    console.log('Recent records:');
    recentRecords.forEach(r => {
      console.log(`  - ${r.attendance_date}: employee ${r.employee_id}, status ${r.status}`);
    });
  }

  // 5. Check a specific company_id query (like the report does)
  if (companies.length > 0) {
    console.log('\n=== SIMULATING ADMIN REPORT QUERY ===');
    for (const company of companies.slice(0, 3)) {
      const usersForCompany = await db.collection('users').countDocuments({ 
        company_id: company._id, 
        isActive: true 
      });
      console.log(`Company "${company.company_name}": ${usersForCompany} active users with company_id`);
    }
  }

  // 6. NEW: Check if attendance records match users in the company
  console.log('\n=== ATTENDANCE RECORDS BY COMPANY (via user lookup) ===');
  const surajCompany = companies.find(c => c.company_name === 'Suraj Forwarders Private Limited');
  const eximCompany = companies.find(c => c.company_name === 'EXIM Global');
  
  if (surajCompany) {
    const surajUsers = await db.collection('users').find({ company_id: surajCompany._id, isActive: true }).toArray();
    const surajUserIds = surajUsers.map(u => u._id);
    const surajRecords = await db.collection('attendancerecords').countDocuments({
      employee_id: { $in: surajUserIds }
    });
    console.log(`Suraj Forwarders: ${surajUsers.length} active users, ${surajRecords} attendance records`);
  }
  
  if (eximCompany) {
    const eximUsers = await db.collection('users').find({ company_id: eximCompany._id, isActive: true }).toArray();
    const eximUserIds = eximUsers.map(u => u._id);
    const eximRecords = await db.collection('attendancerecords').countDocuments({
      employee_id: { $in: eximUserIds }
    });
    console.log(`EXIM Global: ${eximUsers.length} active users, ${eximRecords} attendance records`);
  }

  // 7. Check date range of attendance records
  console.log('\n=== DATE RANGE OF ATTENDANCE RECORDS ===');
  const dateRange = await db.collection('attendancerecords').aggregate([
    { $group: { _id: null, minDate: { $min: '$attendance_date' }, maxDate: { $max: '$attendance_date' } } }
  ]).toArray();
  if (dateRange.length > 0) {
    console.log(`Earliest record: ${dateRange[0].minDate}`);
    console.log(`Latest record: ${dateRange[0].maxDate}`);
  }

  // 8. Check records in the date range 2026-02-28 to 2026-03-31
  console.log('\n=== RECORDS IN REQUESTED DATE RANGE (Feb 28 - Mar 31, 2026) ===');
  const rangeRecords = await db.collection('attendancerecords').countDocuments({
    attendance_date: { 
      $gte: new Date('2026-02-28'), 
      $lte: new Date('2026-03-31T23:59:59') 
    }
  });
  console.log(`Records in range: ${rangeRecords}`);

  await mongoose.disconnect();
  console.log('\nDiagnosis complete.');
}

diagnose().catch(err => {
  console.error('Diagnosis failed:', err);
  process.exit(1);
});
