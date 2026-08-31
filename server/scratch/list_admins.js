import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

const userSchema = new mongoose.Schema({
  username: String,
  role: String,
  isActive: Boolean,
  isAttendanceAllowedAdmin: Boolean
});
const User = mongoose.model('User', userSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const admins = await User.find({
    isActive: true,
    $or: [{ role: 'Admin' }, { isAttendanceAllowedAdmin: true }]
  }, 'username role isAttendanceAllowedAdmin').lean();

  console.log('Admins found:', admins);
  await mongoose.disconnect();
}

main().catch(console.error);
