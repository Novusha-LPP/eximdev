import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.PROD_MONGODB_URI;

(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ modules: { $exists: true, $ne: [] } }).limit(5).toArray();
  users.forEach((u) => {
    console.log(u.username, JSON.stringify(u.modules));
  });
  await mongoose.disconnect();
})();
