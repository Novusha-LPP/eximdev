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

  const EmployeePayrollConfig = mongoose.model('EmployeePayrollConfig', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));

  const activeUsers = await User.find({ isActive: true }).lean();
  console.log(`Active Users: ${activeUsers.length}`);

  let configuredCount = 0;
  let unconfiguredCount = 0;
  const unconfiguredUsers = [];

  for (const user of activeUsers) {
    const config = await EmployeePayrollConfig.findOne({ employee_id: user._id, status: 'ACTIVE' }).lean();
    if (config) {
      configuredCount++;
    } else {
      unconfiguredCount++;
      unconfiguredUsers.push({
        _id: user._id,
        username: user.username,
        company: user.company,
        company_id: user.company_id
      });
    }
  }

  console.log(`Configured active users: ${configuredCount}`);
  console.log(`Unconfigured active users: ${unconfiguredCount}`);
  console.log('Sample unconfigured users:', unconfiguredUsers.slice(0, 10));

  await mongoose.disconnect();
}

main().catch(console.error);
