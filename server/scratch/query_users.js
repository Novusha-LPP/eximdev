import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

// Inline schema definitions to avoid ESM path issues
const userSchema = new mongoose.Schema({
  username: String,
  first_name: String,
  last_name: String,
  company_id: mongoose.Schema.Types.ObjectId,
  shift_id: mongoose.Schema.Types.ObjectId,
  department_id: mongoose.Schema.Types.ObjectId,
  role: String,
  isActive: Boolean
});
const User = mongoose.model('User', userSchema);

const companySchema = new mongoose.Schema({
  company_name: String,
  company_code: String
});
const Company = mongoose.model('Company', companySchema);

const employeePayrollConfigSchema = new mongoose.Schema({
  employee_id: mongoose.Schema.Types.ObjectId,
  company_id: mongoose.Schema.Types.ObjectId,
  is_operator: Boolean,
  payroll_type: String,
  monthly_salary: Number,
  daily_wage: Number,
  overtime_rate_per_hour: Number,
  overtime_eligible: Boolean,
  status: String
});
const EmployeePayrollConfig = mongoose.model('EmployeePayrollConfig', employeePayrollConfigSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const users = await User.find({
    $or: [
      { first_name: /ajith/i },
      { last_name: /ajith/i },
      { first_name: /afzal/i },
      { last_name: /afzal/i },
      { username: /ajith/i },
      { username: /afzal/i }
    ]
  });

  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    const comp = await Company.findById(u.company_id);
    const configs = await EmployeePayrollConfig.find({ employee_id: u._id });
    console.log({
      id: u._id,
      username: u.username,
      first_name: u.first_name,
      last_name: u.last_name,
      company: comp ? comp.company_name : 'None',
      company_id: u.company_id,
      shift_id: u.shift_id,
      department_id: u.department_id,
      role: u.role,
      isActive: u.isActive,
      configs: configs.map(c => ({
        id: c._id,
        is_operator: c.is_operator,
        payroll_type: c.payroll_type,
        monthly_salary: c.monthly_salary,
        daily_wage: c.daily_wage,
        overtime_eligible: c.overtime_eligible,
        status: c.status
      }))
    });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
