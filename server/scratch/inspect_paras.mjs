import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const policies = await mongoose.connection.db.collection('leavepolicies').find({}).toArray();
  console.log('--- ALL LEAVE POLICIES ---');
  policies.forEach(p => {
    console.log({
      _id: p._id,
      leave_type: p.leave_type,
      annual_quota: p.annual_quota,
      status: p.status
    });
  });

  // Also query the user record for Paras Makwana to see their policy assignments
  const user = await mongoose.connection.db.collection('users').findOne({
    _id: new mongoose.Types.ObjectId('6672a2501aa931b68b091fce')
  });
  console.log('--- PARAS MAKWANA USER RECORD ---');
  console.log(JSON.stringify(user?.leave_settings, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
