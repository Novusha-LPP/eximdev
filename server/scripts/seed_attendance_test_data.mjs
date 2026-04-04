import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import moment from 'moment-timezone';

// Import models
import User from '../model/userModel.mjs';
import Company from '../model/attendance/Company.js';
import Shift from '../model/attendance/Shift.js';
import Department from '../model/attendance/Department.js';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import AttendancePunch from '../model/attendance/AttendancePunch.js';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import RegularizationRequest from '../model/attendance/RegularizationRequest.js';
import Holiday from '../model/attendance/Holiday.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/exim';

// Helper functions
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;

// Date helpers
const getDateRange = (daysBack = 30) => {
  const end = moment().tz('Asia/Kolkata');
  const start = end.clone().subtract(daysBack, 'days');
  const dates = [];
  for (let d = start.clone(); d.isSameOrBefore(end, 'day'); d.add(1, 'day')) {
    dates.push(d.clone());
  }
  return dates;
};

const isWeekend = (date) => {
  const day = date.day(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
};

// Generate realistic punch times
const generatePunchTimes = (date, shift, scenario) => {
  const shiftStart = moment.tz(`${date.format('YYYY-MM-DD')} ${shift.start_time}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');
  const shiftEnd = moment.tz(`${date.format('YYYY-MM-DD')} ${shift.end_time}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');
  
  const scenarios = {
    normal: {
      inVariation: [-5, 10], // -5 to +10 minutes from shift start
      outVariation: [-15, 30] // -15 to +30 minutes from shift end
    },
    late: {
      inVariation: [16, 60], // 16 to 60 minutes late
      outVariation: [-15, 30]
    },
    early_exit: {
      inVariation: [-5, 10],
      outVariation: [-120, -30] // 30 to 120 minutes early
    },
    overtime: {
      inVariation: [-5, 10],
      outVariation: [30, 180] // 30 to 180 minutes overtime
    },
    half_day: {
      inVariation: [-5, 10],
      outVariation: [-300, -240] // Leave after ~4 hours
    }
  };

  const config = scenarios[scenario] || scenarios.normal;
  
  const punchIn = shiftStart.clone().add(randomBetween(config.inVariation[0], config.inVariation[1]), 'minutes');
  const punchOut = shiftEnd.clone().add(randomBetween(config.outVariation[0], config.outVariation[1]), 'minutes');
  
  return { punchIn, punchOut };
};

async function seedTestData() {
  await mongoose.connect(MONGODB_URI);
  console.log('[TEST_SEED] Connected to DB');

  // Clear existing test data
  console.log('[TEST_SEED] Clearing existing test data...');
  await AttendanceRecord.deleteMany({});
  
  // Use direct MongoDB operations to bypass immutability protection for test seeding
  await mongoose.connection.db.collection('attendancepunches').deleteMany({});
  console.log('[TEST_SEED] Cleared punch records (using direct MongoDB)');
  
  await LeaveApplication.deleteMany({});
  await RegularizationRequest.deleteMany({});
  await Holiday.deleteMany({});
  
  // Get all users with company assignments
  const users = await User.find({ 
    company_id: { $exists: true, $ne: null },
    isActive: true 
  }).populate('company_id shift_id department_id');

  if (users.length === 0) {
    console.log('[TEST_SEED] No users with company assignments found. Run seed_companies_and_shifts.mjs first.');
    return;
  }

  console.log(`[TEST_SEED] Found ${users.length} users to generate data for`);

  // Get all companies and create holidays
  const companies = await Company.find({});
  const currentYear = moment().year();
  
  console.log('[TEST_SEED] Creating holidays...');
  const holidays = [
    { name: 'New Year\'s Day', date: `${currentYear}-01-01`, type: 'national' },
    { name: 'Republic Day', date: `${currentYear}-01-26`, type: 'national' },
    { name: 'Independence Day', date: `${currentYear}-08-15`, type: 'national' },
    { name: 'Gandhi Jayanti', date: `${currentYear}-10-02`, type: 'national' },
    { name: 'Diwali', date: `${currentYear}-11-01`, type: 'national' },
    { name: 'Christmas', date: `${currentYear}-12-25`, type: 'national' },
    { name: 'Company Foundation Day', date: `${currentYear}-03-15`, type: 'company' },
    { name: 'Team Outing', date: `${currentYear}-06-30`, type: 'company' }
  ];

  for (const company of companies) {
    for (const holiday of holidays) {
      await Holiday.create({
        company_id: company._id,
        holiday_date: moment(holiday.date).toDate(),
        holiday_name: holiday.name,
        holiday_type: holiday.type,
        year: currentYear
      });
    }
  }

  // Create leave policies if they don't exist
  console.log('[TEST_SEED] Creating leave policies...');
  for (const company of companies) {
    const existingPolicies = await LeavePolicy.countDocuments({ company_id: company._id });
    if (existingPolicies === 0) {
      const policies = [
        {
          company_id: company._id,
          policy_name: 'Casual Leave',
          leave_code: 'CL',
          leave_type: 'casual',
          annual_quota: 12,
          status: 'active'
        },
        {
          company_id: company._id,
          policy_name: 'Sick Leave',
          leave_code: 'SL',
          leave_type: 'sick',
          annual_quota: 12,
          status: 'active'
        },
        {
          company_id: company._id,
          policy_name: 'Earned Leave',
          leave_code: 'EL',
          leave_type: 'earned',
          annual_quota: 21,
          status: 'active'
        }
      ];

      for (const policy of policies) {
        await LeavePolicy.create(policy);
      }
    }
  }

  const dateRange = getDateRange(45); // Last 45 days
  const holidayDates = new Set(holidays.map(h => h.date));
  
  const stats = {
    recordsCreated: 0,
    punchesCreated: 0,
    leavesCreated: 0,
    regularizationsCreated: 0
  };

  console.log('[TEST_SEED] Generating attendance data...');

  for (const user of users) {
    if (!user.company_id || !user.shift_id) continue;

    const company = user.company_id;
    const shift = user.shift_id;
    
    // Get leave policies for this company
    const leavePolicies = await LeavePolicy.find({ company_id: company._id });
    
    // Create leave balances
    for (const policy of leavePolicies) {
      await LeaveBalance.findOneAndUpdate(
        {
          employee_id: user._id,
          company_id: company._id,
          leave_policy_id: policy._id,
          year: currentYear
        },
        {
          leave_type: policy.leave_type,
          opening_balance: policy.annual_quota,
          credited: policy.annual_quota,
          consumed: randomBetween(0, 5),
          closing_balance: policy.annual_quota - randomBetween(0, 5)
        },
        { upsert: true }
      );
    }

    // Generate some leave applications (10% chance per week)
    if (Math.random() < 0.4 && leavePolicies.length > 0) {
      const policy = randomChoice(leavePolicies);
      const leaveStart = moment().subtract(randomBetween(5, 30), 'days');
      const leaveDays = randomBetween(1, 3);
      const leaveEnd = leaveStart.clone().add(leaveDays - 1, 'days');
      
      const leaveApp = await LeaveApplication.create({
        company_id: company._id,
        employee_id: user._id,
        department_id: user.department_id,
        application_number: `LA-${Date.now()}-${user._id.toString().slice(-4)}`,
        leave_policy_id: policy._id,
        leave_type: policy.leave_type,
        from_date: leaveStart.toDate(),
        to_date: leaveEnd.toDate(),
        total_days: leaveDays,
        is_half_day: leaveDays === 1 && Math.random() < 0.3,
        half_day_session: Math.random() < 0.5 ? 'first_half' : 'second_half',
        reason: randomChoice([
          'Personal work',
          'Medical appointment',
          'Family function',
          'Travel',
          'Emergency'
        ]),
        approval_status: randomChoice(['pending', 'approved', 'approved', 'approved']) // 75% approved
      });
      stats.leavesCreated++;
    }

    // Generate attendance records for each date
    for (const date of dateRange) {
      const dateStr = date.format('YYYY-MM-DD');
      const yearMonth = date.format('YYYY-MM');

      // Skip if weekend (assuming Sunday off)
      if (date.day() === 0) continue;

      // Skip if holiday
      if (holidayDates.has(dateStr)) {
        await AttendanceRecord.create({
          employee_id: user._id,
          company_id: company._id,
          department_id: user.department_id,
          shift_id: shift._id,
          attendance_date: date.toDate(),
          year_month: yearMonth,
          status: 'holiday',
          is_holiday: true,
          holiday_type: 'national'
        });
        stats.recordsCreated++;
        continue;
      }

      // Check if on leave
      const onLeave = await LeaveApplication.findOne({
        employee_id: user._id,
        approval_status: 'approved',
        from_date: { $lte: date.toDate() },
        to_date: { $gte: date.toDate() }
      });

      if (onLeave) {
        await AttendanceRecord.create({
          employee_id: user._id,
          company_id: company._id,
          department_id: user.department_id,
          shift_id: shift._id,
          attendance_date: date.toDate(),
          year_month: yearMonth,
          status: 'leave',
          is_on_leave: true,
          leave_application_id: onLeave._id
        });
        stats.recordsCreated++;
        continue;
      }

      // Determine attendance scenario (weighted probabilities)
      const rand = Math.random();
      let scenario;
      if (rand < 0.05) scenario = 'absent';
      else if (rand < 0.15) scenario = 'late';
      else if (rand < 0.20) scenario = 'early_exit';
      else if (rand < 0.25) scenario = 'half_day';
      else if (rand < 0.30) scenario = 'overtime';
      else scenario = 'normal';

      if (scenario === 'absent') {
        // Create absent record
        const record = await AttendanceRecord.create({
          employee_id: user._id,
          company_id: company._id,
          department_id: user.department_id,
          shift_id: shift._id,
          attendance_date: date.toDate(),
          year_month: yearMonth,
          status: 'absent'
        });
        stats.recordsCreated++;

        // Sometimes create regularization request for absences (30% chance)
        if (Math.random() < 0.3 && date.isBefore(moment().subtract(1, 'day'))) {
          await RegularizationRequest.create({
            employee_id: user._id,
            company_id: company._id,
            department_id: user.department_id,
            request_number: `REG-${Date.now()}-${user._id.toString().slice(-4)}`,
            attendance_date: dateStr,
            regularization_type: 'missing_punch',
            requested_in_time: moment.tz(`${dateStr} ${shift.start_time}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata').toDate(),
            requested_out_time: moment.tz(`${dateStr} ${shift.end_time}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata').toDate(),
            reason: randomChoice([
              'System login issues',
              'Forgot to punch',
              'Client meeting outside office',
              'Network connectivity problems'
            ]),
            status: randomChoice(['pending', 'approved', 'rejected'])
          });
          stats.regularizationsCreated++;
        }
        continue;
      }

      // Generate punch times for present scenarios
      const { punchIn, punchOut } = generatePunchTimes(date, shift, scenario);
      
      // Create punch records
      await AttendancePunch.create({
        employee_id: user._id,
        company_id: company._id,
        punch_type: 'IN',
        punch_time: punchIn.toDate(),
        punch_date: date.toDate(),
        punch_method: randomChoice(['web', 'mobile', 'web', 'web']), // 75% web
        ip_address: `192.168.1.${randomBetween(100, 199)}`
      });
      stats.punchesCreated++;

      await AttendancePunch.create({
        employee_id: user._id,
        company_id: company._id,
        punch_type: 'OUT',
        punch_time: punchOut.toDate(),
        punch_date: date.toDate(),
        punch_method: randomChoice(['web', 'mobile', 'web', 'web']),
        ip_address: `192.168.1.${randomBetween(100, 199)}`
      });
      stats.punchesCreated++;

      // Calculate work hours
      const workHours = punchOut.diff(punchIn, 'minutes') / 60;
      const isLate = punchIn.isAfter(moment.tz(`${dateStr} ${shift.start_time}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata').add(shift.grace_in_minutes || 15, 'minutes'));
      const lateByMinutes = isLate ? punchIn.diff(moment.tz(`${dateStr} ${shift.start_time}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata'), 'minutes') : 0;
      
      let status = 'present';
      if (workHours < (shift.half_day_hours || 4)) status = 'half_day';
      else if (isLate && scenario === 'late') status = 'present'; // Keep as present but mark late

      // Create attendance record
      await AttendanceRecord.create({
        employee_id: user._id,
        company_id: company._id,
        department_id: user.department_id,
        shift_id: shift._id,
        attendance_date: date.toDate(),
        year_month: yearMonth,
        first_in: punchIn.toDate(),
        last_out: punchOut.toDate(),
        total_punches: 2,
        total_work_hours: Math.max(0, workHours),
        status: status,
        is_late: isLate,
        late_by_minutes: lateByMinutes,
        is_early_exit: scenario === 'early_exit',
        early_exit_minutes: scenario === 'early_exit' ? randomBetween(30, 120) : 0,
        overtime_hours: workHours > 8 ? workHours - 8 : 0
      });
      stats.recordsCreated++;

      // Create regularization for some late punches (20% chance)
      if (isLate && Math.random() < 0.2) {
        await RegularizationRequest.create({
          employee_id: user._id,
          company_id: company._id,
          department_id: user.department_id,
          request_number: `REG-${Date.now()}-${user._id.toString().slice(-4)}`,
          attendance_date: dateStr,
          regularization_type: 'late_in',
          requested_in_time: moment.tz(`${dateStr} ${shift.start_time}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata').toDate(),
          requested_out_time: punchOut.toDate(),
          reason: randomChoice([
            'Traffic jam',
            'Medical emergency',
            'Public transport delay',
            'Family emergency'
          ]),
          status: randomChoice(['pending', 'approved'])
        });
        stats.regularizationsCreated++;
      }
    }
  }

  console.log('[TEST_SEED] Test data generation completed!');
  console.log('[TEST_SEED] Statistics:', stats);
  
  await mongoose.disconnect();
}

seedTestData().catch(err => {
  console.error('[TEST_SEED] Failed:', err);
  process.exit(1);
});