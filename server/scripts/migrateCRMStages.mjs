import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Since we are running ad-hoc, import the model explicitly
import CustomerKycModel from '../model/CustomerKyc/customerKycModel.mjs';

const runMigration = async () => {
  try {
    const uri = process.env.DEV_MONGODB_URI;
    console.log(`Connecting to MongoDB at: ${uri}`);
    await mongoose.connect(uri);
    console.log('Connected.');

    const records = await CustomerKycModel.find({});
    console.log(`Found ${records.length} total records to evaluate.`);

    let updatedCount = 0;

    for (const record of records) {
      if (!record.crm_stage || record.crm_stage === 'suspect') {
        let newStage = 'suspect';

        if (record.draft === 'false') {
          if (record.approval === 'Pending' || record.approval === 'Sent for revision') {
            newStage = 'prospect';
          } else if (record.approval === 'Approved' || record.approval === 'Approved by HOD') {
            newStage = 'customer';
          }
        }

        // Only save if it actually needs changing from the default
        if (newStage !== 'suspect') {
           await CustomerKycModel.updateOne({ _id: record._id }, { $set: { crm_stage: newStage } });
           updatedCount++;
           process.stdout.write('.'); // simple progress
        }
      }
    }

    console.log(`\nMigration complete. Updated ${updatedCount} records to new CRM stages.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

runMigration();
