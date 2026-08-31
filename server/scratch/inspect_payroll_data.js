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
  const PayrollSummary = mongoose.model('PayrollSummary', new mongoose.Schema({}, { strict: false }));
  const PayrollRun = mongoose.model('PayrollRun', new mongoose.Schema({}, { strict: false }));
  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const companyCount = await Company.countDocuments();
  const userCount = await User.countDocuments();
  const payrollConfigCount = await EmployeePayrollConfig.countDocuments();
  const payrollSummaryCount = await PayrollSummary.countDocuments();
  const payrollRunCount = await PayrollRun.countDocuments();

  console.log('--- DB Collection Counts ---');
  console.log(`Companies: ${companyCount}`);
  console.log(`Users: ${userCount}`);
  console.log(`EmployeePayrollConfig: ${payrollConfigCount}`);
  console.log(`PayrollSummary: ${payrollSummaryCount}`);
  console.log(`PayrollRun: ${payrollRunCount}`);

  if (payrollConfigCount > 0) {
    console.log('\n--- Sample EmployeePayrollConfig ---');
    const configs = await EmployeePayrollConfig.find().limit(3).lean();
    console.log(JSON.stringify(configs, null, 2));
  }

  if (payrollSummaryCount > 0) {
    console.log('\n--- Sample PayrollSummary ---');
    const summaries = await PayrollSummary.find().limit(3).lean();
    console.log(JSON.stringify(summaries, null, 2));
  }

  if (payrollRunCount > 0) {
    console.log('\n--- Sample PayrollRun ---');
    const runs = await PayrollRun.find().limit(3).lean();
    console.log(JSON.stringify(runs, null, 2));
  }

  // Check if any active user lacks EmployeePayrollConfig
  const activeUsersCount = await User.countDocuments({ isActive: true });
  console.log(`\nActive users: ${activeUsersCount}`);

  await mongoose.disconnect();
}

main().catch(console.error);
