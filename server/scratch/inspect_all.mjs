import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

const EMPLOYEES = [
  { id: '6672a2501aa931b68b091fce', name: 'paras_makwana' },
  { id: '6672a2501aa931b68b091fe1', name: 'rahul_vaghela' },
  { id: '69a5542d305fe7985ad33dd5', name: 'dipak_vaghela' },
  { id: '6672a2501aa931b68b091ff6', name: 'pratik_sakrecha' },
  { id: '6672a2501aa931b68b092000', name: 'prakash_darji' },
  { id: '68525317fecca8549389c9a0', name: 'kapil_goswami' }
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  for (const emp of EMPLOYEES) {
    console.log(`\n======================================================`);
    console.log(`EMPLOYEE: ${emp.name} (${emp.id})`);
    console.log(`======================================================`);

    const balances = await mongoose.connection.db.collection('leavebalances').find({
      employee_id: new mongoose.Types.ObjectId(emp.id),
      leave_type: 'privilege',
      year: 2026
    }).toArray();

    console.log('--- LEAVE BALANCES (privilege) ---');
    balances.forEach(b => {
      console.log({
        _id: b._id,
        leave_policy_id: b.leave_policy_id,
        opening_balance: b.opening_balance,
        used: b.used,
        pending_approval: b.pending_approval,
        closing_balance: b.closing_balance,
        updatedAt: b.updatedAt
      });
    });

    const applications = await mongoose.connection.db.collection('leaveapplications').find({
      employee_id: new mongoose.Types.ObjectId(emp.id),
      leave_type: 'privilege',
      from_date: { $gte: new Date('2026-01-01T00:00:00.000Z') },
      to_date: { $lte: new Date('2026-12-31T23:59:59.999Z') }
    }).toArray();

    console.log('--- LEAVE APPLICATIONS (privilege, 2026) ---');
    applications.forEach(app => {
      console.log({
        _id: app._id,
        from_date_str: app.from_date_str,
        to_date_str: app.to_date_str,
        total_days: app.total_days,
        approval_status: app.approval_status
      });
    });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
