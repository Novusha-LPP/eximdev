import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';
await mongoose.connect(uri);

const collection = mongoose.connection.collection('tyreprocurementsops');
const prs = await collection.find({ prNumber: { $in: ['PR/SEP/06/26-27', 'PR/SEP/05/26-27', 'PR/SEP/02/26-27'] } }).toArray();

for (const pr of prs) {
  console.log('-------------------------------------------');
  console.log('PR:', pr.prNumber, 'Status:', pr.status);
  console.log('SelectedSuppliers:', JSON.stringify(pr.stage2?.selectedSuppliers));
  console.log('Suppliers:', JSON.stringify((pr.stage2?.suppliers || []).map(s => ({ name: s.supplierName, terms: s.paymentTerms, total: s.totalOrderValue }))));
  console.log('Stage3 signOff:', pr.stage3?.signOff);
  console.log('Stage4 supplierPayments:', JSON.stringify(pr.stage4?.supplierPayments));
  console.log('Stage5 dispatches:', JSON.stringify(pr.stage5?.supplierDispatches));
  console.log('Stage6 series/approvals:', pr.stage6?.grnSeriesNo, pr.stage6?.approvals?.length);
}
await mongoose.disconnect();
