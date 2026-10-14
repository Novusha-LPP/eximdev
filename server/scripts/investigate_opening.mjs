import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI;

async function check() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const b1 = await db.collection('leavebalances').findOne({ _id: new mongoose.Types.ObjectId('69e20484a67e6af94f129db6') });
  console.log('Balance 69e20484a67e6af94f129db6:', JSON.stringify(b1, null, 2));

  const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId('69804d6fdb43a20e654eb45c') });
  console.log('User joining/createdAt/details:');
  console.log('joining_date:', user.joining_date);
  console.log('date_of_joining:', user.date_of_joining);
  console.log('createdAt:', user.createdAt);
  console.log('leave_settings:', user.leave_settings);

  // Check audit trails for this user or balance
  const audits = await db.collection('audittrails').find({
    $or: [
      { 'document_id': '69e20484a67e6af94f129db6' },
      { 'document_id': new mongoose.Types.ObjectId('69e20484a67e6af94f129db6') },
      { 'target_id': '69e20484a67e6af94f129db6' },
      { 'metadata.employee_id': '69804d6fdb43a20e654eb45c' },
      { 'target_id': '69804d6fdb43a20e654eb45c' }
    ]
  }).toArray();
  console.log('Audits found:', audits.length);
  audits.forEach(a => console.log('Audit:', a.action, a.description, a.timestamp || a.createdAt, JSON.stringify(a.changes || a.diff || a.metadata)));

  // Check if any other user has 29 opening balance
  const othersWith29 = await db.collection('leavebalances').find({ opening_balance: 29 }).toArray();
  console.log('Others with opening_balance 29:', othersWith29.length);
  othersWith29.forEach(o => console.log(o.employee_id, o.leave_type, o.opening_balance, o.year, o.createdAt));

  // Check other users' privilege leave balances in this company
  const compBalances = await db.collection('leavebalances').find({
    company_id: new mongoose.Types.ObjectId('69cd1e3c50e6c73acc73a928'),
    leave_type: 'privilege',
    year: 2026
  }).toArray();
  console.log('\nPrivilege balances in company 69cd1e3c50e6c73acc73a928 count:', compBalances.length);
  compBalances.forEach(c => console.log('Emp:', c.employee_id, 'Open:', c.opening_balance, 'Used:', c.used, 'Close:', c.closing_balance, 'Policy:', c.leave_policy_id));

  await mongoose.disconnect();
}

check().catch(console.error);
