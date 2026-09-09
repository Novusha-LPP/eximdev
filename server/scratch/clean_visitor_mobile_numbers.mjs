import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import AmcVisitorLogModel from '../model/amcVisitorLogModel.mjs';

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';
await mongoose.connect(uri);

const logs = await AmcVisitorLogModel.find({});
console.log(`Found ${logs.length} visitor logs...`);

for (const log of logs) {
  console.log(`Before: ${log.technicianName} | Mobile: ${log.mobileNo}`);
  if (log.mobileNo) {
    const digits = log.mobileNo.replace(/\D/g, "");
    let clean = digits.length >= 10 ? digits.slice(0, 10) : digits.padStart(10, "9");
    if (log.mobileNo !== clean) {
      log.mobileNo = clean;
      await log.save();
      console.log(`  -> Updated to: ${clean}`);
    }
  }
}

const updatedLogs = await AmcVisitorLogModel.find({});
console.log('--- Current Visitor Logs ---');
updatedLogs.forEach((l, i) => {
  console.log(`${i + 1}. Company: ${l.supplierCompany} | Tech: ${l.technicianName} | Mobile: ${l.mobileNo} | Status: ${l.status}`);
});

process.exit(0);
