import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import AmcRenewalModel from '../model/amcRenewalModel.mjs';

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';
await mongoose.connect(uri);

const docs = await AmcRenewalModel.find({});
console.log(`Checking ${docs.length} docs...`);

for (const doc of docs) {
  if (doc.contactNo) {
    const digits = doc.contactNo.replace(/\D/g, "").slice(-10);
    if (digits.length === 10 && digits !== doc.contactNo) {
      doc.contactNo = digits;
      await doc.save();
      console.log(`Updated ${doc.equipmentServiceName} -> ${digits}`);
    }
  }
}

const updatedDocs = await AmcRenewalModel.find({});
updatedDocs.forEach((d, i) => {
  console.log(`${i + 1}. ${d.equipmentServiceName} | Contact: ${d.contactNo}`);
});

process.exit(0);
