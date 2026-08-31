import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));
  const companies = await Company.find({}, 'company_name company_code').lean();
  console.log('Companies:', companies);

  await mongoose.disconnect();
}

main().catch(console.error);
