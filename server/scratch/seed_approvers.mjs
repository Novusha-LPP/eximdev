import mongoose from 'mongoose';
import ProcurementApproverModel from '../model/accounts/procurementApproverModel.mjs';

const DEFAULT_APPROVERS = [
  { name: "MOHIT SINGH", designation: "CEO", role: "CHECKED_BY" },
  { name: "RAUF KHAN", designation: "HOD - MAINTENANCE & WORKSHOP", role: "CHECKED_BY" },
  { name: "MAINTENANCE MANAGER", designation: "MAINTENANCE & WORKSHOP", role: "CHECKED_BY" },
  { name: "FLEET MANAGER", designation: "FLEET & TRANSPORT OPERATIONS", role: "CHECKED_BY" },
  { name: "RAJAN SHAH", designation: "DIRECTOR", role: "CHECKED_BY" },
  { name: "CHIRAG SHAH", designation: "SR. MANAGER - ACCOUNTS", role: "APPROVED_BY" },
  { name: "AFTAB BELIM", designation: "PURCHASE OFFICER", role: "PREPARED_BY" },
  { name: "PUNIT SURAJ", designation: "MANAGING DIRECTOR", role: "CHECKED_BY" },
  { name: "AJAY SHARMA", designation: "FINANCE CONTROLLER", role: "CHECKED_BY" },
];

async function seedApprovers() {
  await mongoose.connect('mongodb://localhost:27017/eximNew');
  for (const app of DEFAULT_APPROVERS) {
    await ProcurementApproverModel.findOneAndUpdate(
      { name: app.name.toUpperCase(), designation: app.designation.toUpperCase() },
      { $setOnInsert: { name: app.name.toUpperCase(), designation: app.designation.toUpperCase(), role: app.role } },
      { upsert: true }
    );
  }
  const all = await ProcurementApproverModel.find().sort({ name: 1 }).lean();
  console.log(`Now ${all.length} approvers in DB:`);
  all.forEach(a => console.log(`- ${a.name} | ${a.designation} (${a.role})`));
  await mongoose.disconnect();
}

seedApprovers().catch(console.error);
