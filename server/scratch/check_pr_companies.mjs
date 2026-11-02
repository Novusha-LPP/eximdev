import mongoose from 'mongoose';
import TyreProcurementSopModel from '../model/accounts/tyreProcurementSop.mjs';

async function checkPrCompanies() {
  await mongoose.connect('mongodb://localhost:27017/eximNew');
  const docs = await TyreProcurementSopModel.find({}, { prNumber: 1, poNumber: 1, companyName: 1, companyKey: 1, companyShortName: 1, checkedBy: 1, checkedByDesignation: 1, 'stage1.companyKey': 1 }).lean();
  console.log(`Found ${docs.length} PRs in DB:`);
  docs.forEach(d => {
    console.log(`PR: ${d.prNumber} | Co: ${d.companyKey || d.stage1?.companyKey} / ${d.companyName} | Checked: ${d.checkedBy} (${d.checkedByDesignation})`);
  });
  await mongoose.disconnect();
}

checkPrCompanies().catch(console.error);
