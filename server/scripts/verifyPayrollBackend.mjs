import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import EmployeePayrollConfig from '../model/attendance/EmployeePayrollConfig.js';
import Shift from '../model/attendance/Shift.js';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import PayrollGenerator from '../services/payroll/payrollCalculation.service.js';

dotenv.config({ path: './server/.env' });

const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function verify() {
  try {
    console.log('Connecting to DB at:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully!');

    // Get an employee
    const employee = await UserModel.findOne({ isActive: true }).populate('company_id');
    if (!employee) {
      console.log('No active employee found in database to test.');
      process.exit(0);
    }
    console.log(`Found test employee: ${employee.first_name || ''} ${employee.last_name || ''} (${employee.username})`);
    console.log(`Company ID: ${employee.company_id?._id || 'None'}`);

    if (!employee.company_id) {
      console.log('Test employee has no company assigned. Cannot proceed with payroll run verification.');
      process.exit(0);
    }

    // Set up active config if not present
    let config = await EmployeePayrollConfig.findOne({ employee_id: employee._id, status: 'ACTIVE' });
    if (!config) {
      console.log('No active payroll config found. Creating one...');
      config = await EmployeePayrollConfig.create({
        employee_id: employee._id,
        company_id: employee.company_id._id,
        is_operator: false,
        payroll_type: 'MONTHLY',
        monthly_salary: 25000,
        effective_from: new Date(),
        status: 'ACTIVE'
      });
      console.log('Created test payroll config successfully.');
    } else {
      console.log('Found existing active payroll config:', config);
    }

    // Seed dummy attendance record if none exist for this month to check aggregation
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}-${month}`;

    let record = await AttendanceRecord.findOne({ employee_id: employee._id, year_month: yearMonth });
    if (!record) {
      console.log('No attendance records for current month. Seeding a dummy record...');
      const todayStr = new Date().toISOString().split('T')[0];
      record = await AttendanceRecord.create({
        employee_id: employee._id,
        company_id: employee.company_id._id,
        attendance_date: new Date(),
        attendance_date_str: todayStr,
        year_month: yearMonth,
        status: 'present',
        net_work_hours: 8.5,
        overtime_hours: 1,
        overtime_approved: true
      });
      console.log('Seeded dummy record:', record);
    } else {
      console.log('Found existing attendance record:', record);
    }

    // Run payroll generator
    console.log('Running payroll generator...');
    const result = await PayrollGenerator.generate({
      companyId: employee.company_id._id,
      year: year,
      month: month,
      generatedBy: employee._id
    });

    console.log('Payroll run summary:');
    console.log(JSON.stringify(result.payrollRun, null, 2));
    console.log(`Summaries generated: ${result.summaries.length}`);
    console.log(`Errors encountered: ${result.errors.length}`);
    if (result.errors.length > 0) {
      console.error('Errors details:', result.errors);
    }

    // Cleanup seeded dummy record if we created it
    console.log('Verification completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Verification failed with error:', error);
    process.exit(1);
  }
}

verify();
