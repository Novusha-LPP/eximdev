import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';
await mongoose.connect(uri);

const collections = await mongoose.connection.db.listCollections().toArray();
console.log('Collections in database:');
for (const col of collections) {
  const count = await mongoose.connection.db.collection(col.name).countDocuments();
  if (count > 0 && /scorecard|amc|equipment|checklist/i.test(col.name)) {
    console.log(`- ${col.name}: ${count} docs`);
  }
}

// Let's also check all collections matching scorecard, amc, equipment
const allMatching = collections.filter(c => /scorecard|amc|equipment|checklist/i.test(c.name));
console.log('All matching collections:', allMatching.map(c => c.name));

process.exit(0);
