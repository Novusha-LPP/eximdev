import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
const MONGODB_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function query() {
  await mongoose.connect(MONGODB_URI);
  const EmployeePayrollConfig = mongoose.model('EmployeePayrollConfig');
  const config = await EmployeePayrollConfig.findById("6a30e8b93b5f5be1ac51df35");
  console.log(JSON.stringify(config, null, 2));
  await mongoose.disconnect();
}
query().catch(console.error);
