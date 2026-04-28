import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import WeekOffPolicy from '../model/attendance/WeekOffPolicy.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

async function main() {
  await mongoose.connect(process.env.DEV_MONGODB_URI);
  const policy = await WeekOffPolicy.findOne({ policy_name: /NOVUSHA WEEKOFF POLICY/i }).lean();
  console.log(JSON.stringify(policy || null, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
