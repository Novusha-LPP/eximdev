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

  const activeConfigs = await EmployeePayrollConfig.find({ status: 'ACTIVE' }).lean();
  console.log(`Active payroll configs: ${activeConfigs.length}`);

  for (const config of activeConfigs) {
    const user = await User.findById(config.employee_id).lean();
    const comp = await Company.findById(config.company_id).lean();
    console.log(`Employee: ${user ? (user.first_name + ' ' + user.last_name) : 'Unknown'} (${user?.username}) | Company: ${comp ? comp.company_name : 'Unknown'}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
