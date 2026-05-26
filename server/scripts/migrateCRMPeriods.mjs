import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://127.0.0.1:27017/eximNew";

console.log('Connecting to database:', MONGODB_URI);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB!');

  const schemas = {
    Lead: new mongoose.Schema({}, { strict: false, collection: 'leads' }),
    Opportunity: new mongoose.Schema({}, { strict: false, collection: 'opportunities' }),
    Account: new mongoose.Schema({}, { strict: false, collection: 'accounts' }),
    Contact: new mongoose.Schema({}, { strict: false, collection: 'contacts' })
  };

  const models = {
    Lead: mongoose.model('LeadMigration', schemas.Lead),
    Opportunity: mongoose.model('OpportunityMigration', schemas.Opportunity),
    Account: mongoose.model('AccountMigration', schemas.Account),
    Contact: mongoose.model('ContactMigration', schemas.Contact)
  };

  for (const [name, Model] of Object.entries(models)) {
    console.log(`\nProcessing ${name} collection...`);
    const records = await Model.find({ period: { $exists: false } });
    console.log(`Found ${records.length} records needing period stamps.`);

    let updatedCount = 0;
    for (const doc of records) {
      const date = doc.createdAt || new Date();
      const period = date.toISOString().substring(0, 7); // format YYYY-MM
      doc.period = period;
      await Model.updateOne({ _id: doc._id }, { $set: { period } });
      updatedCount++;
    }
    console.log(`Successfully updated ${updatedCount} ${name} records.`);
  }

  console.log('\nMigration completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
