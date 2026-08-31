import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const LeaveApplication = mongoose.model('LeaveApplication', new mongoose.Schema({}, { strict: false }));
  
  const leaves = await LeaveApplication.find({}).lean();
  console.log(`Total leave applications: ${leaves.length}`);

  const leaveTypes = new Set();
  const lopCount = { true: 0, false: 0, undefined: 0 };

  leaves.forEach(l => {
    leaveTypes.add(l.leave_type);
    const lopStr = String(l.is_lop);
    lopCount[lopStr] = (lopCount[lopStr] || 0) + 1;
  });

  console.log('\nLeave Types found:');
  console.log(Array.from(leaveTypes));

  console.log('\nLoss of Pay (is_lop) stats:');
  console.log(lopCount);

  // Print a few sample applications
  console.log('\nSample leave applications:');
  leaves.slice(0, 10).forEach(l => {
    console.log(`Type: ${l.leave_type} | Is LOP: ${l.is_lop} | Days: ${l.total_days} | Status: ${l.approval_status}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
