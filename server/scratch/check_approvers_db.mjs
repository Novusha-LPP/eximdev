import mongoose from 'mongoose';
import ProcurementApproverModel from '../model/accounts/procurementApproverModel.mjs';

async function checkApprovers() {
  await mongoose.connect('mongodb://localhost:27017/eximNew');
  const approvers = await ProcurementApproverModel.find().lean();
  console.log(`Found ${approvers.length} approvers in DB:`);
  approvers.forEach(a => console.log(`- ${a.name} | ${a.designation} (${a.role})`));
  await mongoose.disconnect();
}

checkApprovers().catch(console.error);
