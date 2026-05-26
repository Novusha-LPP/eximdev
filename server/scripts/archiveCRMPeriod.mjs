import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://127.0.0.1:27017/eximNew";

console.log('--- CRM MONTHLY ARCHIVE VERIFIER ---');
console.log('Date:', new Date().toISOString());

async function run() {
  await mongoose.connect(MONGODB_URI);

  const schemas = {
    Lead: new mongoose.Schema({}, { strict: false, collection: 'leads' }),
    Opportunity: new mongoose.Schema({}, { strict: false, collection: 'opportunities' }),
    Account: new mongoose.Schema({}, { strict: false, collection: 'accounts' }),
    Contact: new mongoose.Schema({}, { strict: false, collection: 'contacts' })
  };

  const models = {
    Lead: mongoose.model('LeadArchive', schemas.Lead),
    Opportunity: mongoose.model('OpportunityArchive', schemas.Opportunity),
    Account: mongoose.model('AccountArchive', schemas.Account),
    Contact: mongoose.model('ContactArchive', schemas.Contact)
  };

  for (const [name, Model] of Object.entries(models)) {
    const total = await Model.countDocuments();
    const withPeriod = await Model.countDocuments({ period: { $exists: true } });
    const missing = total - withPeriod;

    console.log(`\nCollection: ${name}`);
    console.log(`- Total Records: ${total}`);
    console.log(`- Stamped & Archived: ${withPeriod}`);
    console.log(`- Missing Period Stamp: ${missing}`);

    if (missing > 0) {
      console.log(`Fixing ${missing} missing period stamps...`);
      const records = await Model.find({ period: { $exists: false } });
      for (const doc of records) {
        const date = doc.createdAt || new Date();
        const period = date.toISOString().substring(0, 7);
        await Model.updateOne({ _id: doc._id }, { $set: { period } });
      }
      console.log(`Stamps successfully applied.`);
    }
  }

  console.log('\nLogical Archival Verification completed.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Archival Verification failed:', err);
  process.exit(1);
});
