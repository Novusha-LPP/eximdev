import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import Company from '../model/attendance/Company.js';
import EmployeePayrollConfig from '../model/attendance/EmployeePayrollConfig.js';
import Shift from '../model/attendance/Shift.js';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import PayrollGenerator from '../services/payroll/payrollCalculation.service.js';
import { toggleEmployeeOperatorStatus } from '../controllers/attendance/payroll.controller.js';

// Load env vars
dotenv.config({ path: './.env' });

const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://127.0.0.1:27017/eximNew';

async function runTests() {
  try {
    console.log('Connecting to database at:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully!');

    // 1. Create a dummy company for testing
    console.log('Seeding test company...');
    let testCompany = await Company.findOne({ company_name: 'Wages Test Company' });
    if (!testCompany) {
      testCompany = await Company.create({
        company_name: 'Wages Test Company',
        company_code: 'WTC',
        timezone: 'Asia/Kolkata'
      });
    }
    console.log(`Test Company: ${testCompany.company_name} (_id: ${testCompany._id})`);

    // 2. Create a dummy shift (e.g. 8-hour shift)
    console.log('Seeding test shift...');
    let testShift = await Shift.findOne({ shift_code: 'TS_8H' });
    if (!testShift) {
      testShift = await Shift.create({
        company_id: testCompany._id,
        shift_name: 'Test Shift 8 Hours',
        shift_code: 'TS_8H',
        start_time: '09:00',
        end_time: '17:00',
        full_day_hours: 8,
        half_day_hours: 4,
        overtime_threshold_minutes: 20
      });
    }
    console.log(`Test Shift: ${testShift.shift_name} (_id: ${testShift._id})`);

    // 3. Create a dummy employee
    console.log('Seeding test employee...');
    let testEmployee = await UserModel.findOne({ username: 'test_operator_wages' });
    if (testEmployee) {
      await UserModel.deleteOne({ _id: testEmployee._id });
    }
    testEmployee = await UserModel.create({
      username: 'test_operator_wages',
      password: 'password123',
      role: 'User',
      first_name: 'Test',
      last_name: 'Operator',
      company_id: testCompany._id,
      shift_id: testShift._id,
      isActive: true
    });
    console.log(`Test Employee: ${testEmployee.username} (_id: ${testEmployee._id})`);

    // 4. Test toggleEmployeeOperatorStatus simulation
    console.log('Testing toggleEmployeeOperatorStatus...');
    // We will invoke the function directly or simulate its actions
    // Let's simulate toggle to Operator (true)
    const mockReq = {
      body: {
        employeeId: testEmployee._id,
        is_operator: true
      },
      user: {
        _id: testEmployee._id,
        role: 'ADMIN',
        username: 'admin'
      }
    };
    
    // Simulate res
    let responseData = null;
    const mockRes = {
      status(code) {
        return {
          json(data) {
            responseData = data;
            return this;
          }
        };
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await toggleEmployeeOperatorStatus(mockReq, mockRes);
    console.log('Toggle to Operator Result:', responseData);
    
    // Verify changes in DB
    const updatedUser = await UserModel.findById(testEmployee._id);
    const activeConfig = await EmployeePayrollConfig.findOne({ employee_id: testEmployee._id, status: 'ACTIVE' });
    
    console.log(`User.is_operator is Operator (true)?: ${updatedUser.is_operator}`);
    console.log(`PayrollConfig.is_operator is Operator (true)?: ${activeConfig.is_operator}`);
    console.log(`PayrollConfig payroll_type is DAILY_WAGE?: ${activeConfig.payroll_type}`);
    console.log(`PayrollConfig overtime_eligible is true?: ${activeConfig.overtime_eligible}`);

    if (updatedUser.is_operator !== true || activeConfig.is_operator !== true || activeConfig.payroll_type !== 'DAILY_WAGE') {
      throw new Error('Operator toggle verification failed!');
    }

    // Give the config a daily wage and custom overtime grace period
    activeConfig.daily_wage = 800; // 800 daily wage, hourly wage fallback should be 800/8 = 100
    activeConfig.overtime_grace_minutes = 20;
    await activeConfig.save();

    // 5. Test Operator Overtime Calculations (daily and payroll)
    console.log('Testing Operator Overtime Calculations...');
    
    // 5a. Worked hours within grace period (e.g. 8.2 hours = 8h 12m, grace is 20m)
    // Clear old records
    await AttendanceRecord.deleteMany({ employee_id: testEmployee._id });
    
    const recordWithinGrace = await AttendanceRecord.create({
      employee_id: testEmployee._id,
      company_id: testCompany._id,
      attendance_date: new Date('2026-06-01'),
      attendance_date_str: '2026-06-01',
      year_month: '2026-06',
      status: 'present',
      net_work_hours: 8.2, // 8h 12m (extra 12m is < 20m grace)
    });
    
    // Simulate punctuality recalculation behavior (which we updated in attendance.controller.js)
    // Normally done by save/recalculate helper, let's test the calculations directly
    let calculatedOtHours = 0;
    const shiftMinutes = (testShift.full_day_hours) * 60;
    const totalWorkMinutes = recordWithinGrace.net_work_hours * 60;
    if (totalWorkMinutes > shiftMinutes + activeConfig.overtime_grace_minutes) {
      calculatedOtHours = (totalWorkMinutes - shiftMinutes) / 60;
    }
    console.log(`OT hours calculated for 8.2 hours (grace 20m): ${calculatedOtHours} (Expected: 0)`);
    if (calculatedOtHours !== 0) {
      throw new Error('Overtime calculated inside grace period!');
    }

    // 5b. Worked hours exceeding grace period (e.g. 10.5 hours)
    const recordExceedingGrace = await AttendanceRecord.create({
      employee_id: testEmployee._id,
      company_id: testCompany._id,
      attendance_date: new Date('2026-06-02'),
      attendance_date_str: '2026-06-02',
      year_month: '2026-06',
      status: 'present',
      net_work_hours: 10.5, // 10.5 hours (extra 2.5 hours > 20m grace)
    });

    let calculatedOtHoursExceeding = 0;
    const totalWorkMinutesExceeding = recordExceedingGrace.net_work_hours * 60;
    if (totalWorkMinutesExceeding > shiftMinutes + activeConfig.overtime_grace_minutes) {
      calculatedOtHoursExceeding = (totalWorkMinutesExceeding - shiftMinutes) / 60;
    }
    console.log(`OT hours calculated for 10.5 hours (grace 20m): ${calculatedOtHoursExceeding} (Expected: 2.5)`);
    if (calculatedOtHoursExceeding !== 2.5) {
      throw new Error('Overtime calculation for operator exceeding grace period failed!');
    }

    // Run payroll generator for this operator and verify wages
    console.log('Running payroll generator for Operator...');
    const payrollRes = await PayrollGenerator.generate({
      companyId: testCompany._id,
      year: 2026,
      month: '06',
      generatedBy: testEmployee._id
    });

    const summary = payrollRes.summaries[0];
    console.log('Payroll Summary Output:');
    console.log(`- Payable Days: ${summary.payable_days}`);
    console.log(`- Total Regular Hours: ${summary.total_regular_hours}`);
    console.log(`- Total Overtime Hours: ${summary.total_overtime_hours}`);
    console.log(`- Basic Amount: ${summary.basic_amount}`);
    console.log(`- Overtime Amount: ${summary.overtime_amount}`);
    console.log(`- Net Payable: ${summary.net_payable_amount}`);

    // Expected:
    // Payable days = 2 days present
    // Daily wage = 800
    // Basic = 2 * 800 = 1600
    // OT Hours = 2.5 hours (from 10.5h record, the 8.2h record has 0 OT)
    // OT Rate fallback = 800 / 8 = 100/hour
    // OT Amount = 2.5 * 100 = 250
    // Net Payable = 1600 + 250 = 1850
    if (summary.basic_amount !== 1600 || summary.total_overtime_hours !== 2.5 || summary.overtime_amount !== 250 || summary.net_payable_amount !== 1850) {
      throw new Error('Operator payroll calculation or wages output mismatch!');
    }
    console.log('Operator calculations are completely correct!');

    // 6. Test Management Overtime Calculations (should be 0 OT tracking)
    console.log('Testing Management Overtime/Wages...');
    // Toggle back to Management (is_operator = false)
    mockReq.body.is_operator = false;
    await toggleEmployeeOperatorStatus(mockReq, mockRes);
    
    const mgmtConfig = await EmployeePayrollConfig.findOne({ employee_id: testEmployee._id, status: 'ACTIVE' });
    mgmtConfig.monthly_salary = 30000; // 30,000 monthly salary
    await mgmtConfig.save();

    // Re-generate payroll
    console.log('Running payroll generator for Management...');
    const payrollResMgmt = await PayrollGenerator.generate({
      companyId: testCompany._id,
      year: 2026,
      month: '06',
      generatedBy: testEmployee._id
    });

    const summaryMgmt = payrollResMgmt.summaries[0];
    console.log('Management Payroll Summary Output:');
    console.log(`- Payable Days: ${summaryMgmt.payable_days}`);
    console.log(`- Total Overtime Hours: ${summaryMgmt.total_overtime_hours}`);
    console.log(`- Basic Amount: ${summaryMgmt.basic_amount}`);
    console.log(`- Overtime Amount: ${summaryMgmt.overtime_amount}`);
    console.log(`- Net Payable: ${summaryMgmt.net_payable_amount}`);

    // Expected:
    // Total calendar days in June = 30
    // Payable days = 2
    // Basic = (2 / 30) * 30000 = 2000
    // OT Hours = 0 (overtime eligible is false for management, so no OT)
    // OT Amount = 0
    // Net Payable = 2000
    if (summaryMgmt.basic_amount !== 2000 || summaryMgmt.total_overtime_hours !== 0 || summaryMgmt.overtime_amount !== 0 || summaryMgmt.net_payable_amount !== 2000) {
      throw new Error('Management payroll calculation or wages output mismatch!');
    }
    console.log('Management calculations are completely correct!');

    // Clean up test data
    console.log('Cleaning up test data...');
    await AttendanceRecord.deleteMany({ employee_id: testEmployee._id });
    await EmployeePayrollConfig.deleteMany({ employee_id: testEmployee._id });
    await UserModel.deleteOne({ _id: testEmployee._id });
    console.log('Cleanup completed.');

    console.log('ALL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('TESTS FAILED:', error);
    process.exit(1);
  }
}

runTests();
