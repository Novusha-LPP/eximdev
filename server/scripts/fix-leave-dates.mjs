/**
 * Production Script: Fix Leave Date Range Off-by-One Errors
 * 
 * Issues being fixed:
 * 1. When applying for 9 days, system includes one day before the actual leave start
 * 2. When applying for 18 days, leave extends to day 19 (often a Sunday) instead of stopping at day 18
 * 
 * Root Cause:
 * - Incorrect date handling in normalizeLeaveRangeToTimezone() - using endOf('day') incorrectly
 * - Off-by-one error in date range calculation or boundary handling
 * 
 * Usage:
 *   node fix-leave-dates.mjs [--dry-run] [--employee-id <id>] [--from-date <YYYY-MM-DD>] [--to-date <YYYY-MM-DD>]
 * 
 * Options:
 *   --dry-run           : Preview changes without modifying database
 *   --employee-id <id>  : Fix only specific employee's leaves
 *   --from-date <date>  : Fix leaves starting from this date onwards
 *   --to-date <date>    : Fix leaves up to this date
 * 
 * Examples:
 *   node fix-leave-dates.mjs --dry-run
 *   node fix-leave-dates.mjs --employee-id 6672a2501aa931b68b091faf --dry-run
 *   node fix-leave-dates.mjs --from-date 2026-01-01 --to-date 2026-12-31
 */

import mongoose from 'mongoose';
import moment from 'moment-timezone';
import dotenv from 'dotenv';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import UserModel from '../model/userModel.mjs';
import WeekOffPolicy from '../model/attendance/WeekOffPolicy.js';
import HolidayPolicy from '../model/attendance/HolidayPolicy.js';
import WorkingDayEngine from '../services/attendance/WorkingDayEngine.js';

dotenv.config();

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const employeeIdIdx = args.indexOf('--employee-id');
const targetEmployeeId = employeeIdIdx !== -1 && args[employeeIdIdx + 1] ? args[employeeIdIdx + 1] : null;
const fromDateIdx = args.indexOf('--from-date');
const targetFromDate = fromDateIdx !== -1 && args[fromDateIdx + 1] ? args[fromDateIdx + 1] : null;
const toDateIdx = args.indexOf('--to-date');
const targetToDate = toDateIdx !== -1 && args[toDateIdx + 1] ? args[toDateIdx + 1] : null;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (color, ...msg) => console.log(`${colors[color]}${msg.join(' ')}${colors.reset}`);

/**
 * Detects if a leave has off-by-one error by checking:
 * 1. Does from_date come before the actual intended start?
 * 2. Does to_date come after the actual intended end (especially on non-working day)?
 */
async function checkForOffByOneError(leaveApp, user, weekOffPolicy, holidayPolicy) {
  try {
    const fromDate = moment(leaveApp.from_date).startOf('day');
    const toDate = moment(leaveApp.to_date).startOf('day');
    const totalDaysRequested = leaveApp.total_days;
    
    // Count actual working days in the range
    let workingDays = 0;
    let dayDetails = [];
    
    let current = fromDate.clone();
    while (current.isSameOrBefore(toDate, 'day')) {
      const isOff = WorkingDayEngine.isWeeklyOff(current, user.company_id || {}, weekOffPolicy);
      const holidayInfo = await WorkingDayEngine.getHolidayInfo(current, user.company_id, holidayPolicy);
      const isHoliday = holidayInfo.isHoliday || holidayInfo.isOptional;
      
      if (!isOff && !isHoliday) {
        workingDays++;
      }
      
      dayDetails.push({
        date: current.format('YYYY-MM-DD'),
        dayName: current.format('dddd'),
        isWeeklyOff: isOff,
        isHoliday: isHoliday,
        isWorking: !isOff && !isHoliday
      });
      
      current.add(1, 'day');
    }
    
    const rangeDays = toDate.diff(fromDate, 'days') + 1;
    
    // Detect errors
    const errors = [];
    
    if (workingDays !== totalDaysRequested && Math.abs(workingDays - totalDaysRequested) === 1) {
      errors.push(`Working days mismatch: ${workingDays} vs requested ${totalDaysRequested}`);
    }
    
    // Check if range spans one extra day for non-working end
    if (dayDetails.length > 0) {
      const lastDay = dayDetails[dayDetails.length - 1];
      if (!lastDay.isWorking && dayDetails.length === totalDaysRequested + 1) {
        errors.push(`Extra non-working day at end: ${lastDay.date} (${lastDay.dayName})`);
      }
      
      const firstDay = dayDetails[0];
      if (!firstDay.isWorking && dayDetails.length === totalDaysRequested + 1) {
        errors.push(`Extra non-working day at start: ${firstDay.date} (${firstDay.dayName})`);
      }
    }
    
    return {
      hasError: errors.length > 0,
      errors,
      workingDays,
      rangeDays,
      totalRequested: totalDaysRequested,
      dayDetails
    };
    
  } catch (error) {
    return {
      hasError: false,
      errors: ['Could not analyze: ' + error.message],
      workingDays: 0,
      rangeDays: 0,
      totalRequested: 0,
      dayDetails: []
    };
  }
}

/**
 * Fix the date range by removing extra days
 */
async function fixDateRange(leaveApp, analysis) {
  const fromDate = moment(leaveApp.from_date).startOf('day');
  const toDate = moment(leaveApp.to_date).startOf('day');
  const totalRequested = leaveApp.total_days;
  
  // If there's an extra day, try to determine which one to remove
  const firstDay = analysis.dayDetails[0];
  const lastDay = analysis.dayDetails[analysis.dayDetails.length - 1];
  
  let newFromDate = fromDate;
  let newToDate = toDate;
  
  // If last day is non-working and we have one extra day, remove it
  if (!lastDay.isWorking && analysis.rangeDays === totalRequested + 1) {
    newToDate = toDate.clone().subtract(1, 'day');
  }
  // If first day is non-working and we have one extra day, remove it
  else if (!firstDay.isWorking && analysis.rangeDays === totalRequested + 1) {
    newFromDate = fromDate.clone().add(1, 'day');
  }
  
  return {
    from_date: newFromDate.toDate(),
    to_date: newToDate.toDate(),
    wasFixed: !newFromDate.isSame(fromDate) || !newToDate.isSame(toDate)
  };
}

async function main() {
  try {
    log('blue', '🔗 Connecting to MongoDB...');
    const mongoUrl = process.env.PROD_MONGODB_URI || 'mongodb://exim:I9y5bcMUHkGHpgq2@ac-oqmvpdw-shard-00-00.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-01.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-02.xya3qh0.mongodb.net:27017/exim?ssl=true&replicaSet=atlas-103rb8-shard-0&authSource=admin&retryWrites=true&w=majority';
   
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    log('green', '✅ Connected\n');

    // Build query
    const query = {
      approval_status: { $in: ['pending', 'approved'] }
    };
    
    if (targetEmployeeId) {
      query.employee_id = new mongoose.Types.ObjectId(targetEmployeeId);
      log('blue', `🧑 Targeting employee: ${targetEmployeeId}\n`);
    }
    
    if (targetFromDate) {
      query.from_date = { $gte: moment(targetFromDate).startOf('day').toDate() };
      log('blue', `📅 From date: ${targetFromDate}`);
    }
    
    if (targetToDate) {
      if (!query.from_date) query.from_date = {};
      query.from_date.$lte = moment(targetToDate).endOf('day').toDate();
      log('blue', `📅 To date: ${targetToDate}\n`);
    }

    // Fetch affected leaves
    log('blue', '🔍 Searching for leaves with potential off-by-one errors...\n');
    const leaves = await LeaveApplication.find(query)
      .populate('employee_id', 'username first_name last_name company_id')
      .sort({ from_date: -1 });

    log('cyan', `Found ${leaves.length} leave applications to analyze\n`);

    if (leaves.length === 0) {
      log('green', '✅ No leaves found to process');
      process.exit(0);
    }

    // Get unique companies and their policies
    const companyIds = [...new Set(leaves.map(l => String(l.employee_id?.company_id || l.company_id)))];
    const policies = {};
    
    for (const compId of companyIds) {
      const weekOffPolicies = await WeekOffPolicy.find({}).lean();
      const holidayPolicies = await HolidayPolicy.find({ company_id: new mongoose.Types.ObjectId(compId) }).lean();
      policies[compId] = { weekOff: weekOffPolicies[0], holiday: holidayPolicies[0] };
    }

    // Analyze each leave
    const problemLeaves = [];
    log('yellow', '🔬 Analyzing leaves...\n');
    
    for (let i = 0; i < leaves.length; i++) {
      const leave = leaves[i];
      const compId = String(leave.employee_id?.company_id || leave.company_id);
      const pols = policies[compId] || {};
      
      const analysis = await checkForOffByOneError(
        leave,
        leave.employee_id,
        pols.weekOff,
        pols.holiday
      );
      
      if (analysis.hasError) {
        problemLeaves.push({ leave, analysis });
        if (problemLeaves.length <= 5) {
          const emp = leave.employee_id;
          const empName = `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim() || emp?.username;
          log('red', `   ❌ ${empName}: ${leave.from_date.toISOString().split('T')[0]} to ${leave.to_date.toISOString().split('T')[0]}`);
          analysis.errors.forEach(err => log('yellow', `      ⚠️  ${err}`));
        }
      }
      
      if ((i + 1) % 100 === 0) {
        log('cyan', `Analyzed ${i + 1}/${leaves.length}...`);
      }
    }

    log('green', `\n✅ Analysis complete\n`);
    log('bright', `📊 Results:`);
    log('cyan', `   Total analyzed: ${leaves.length}`);
    log('cyan', `   With errors: ${problemLeaves.length}`);
    log('cyan', `   Error rate: ${((problemLeaves.length / leaves.length) * 100).toFixed(2)}%\n`);

    if (problemLeaves.length === 0) {
      log('green', '✨ No off-by-one errors detected!');
      process.exit(0);
    }

    // Show sample errors
    if (problemLeaves.length > 0) {
      log('yellow', '📋 Sample problematic leaves (first 5):\n');
      problemLeaves.slice(0, 5).forEach(({ leave, analysis }) => {
        const emp = leave.employee_id;
        const empName = `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim() || emp?.username;
        console.log(`   ${empName}`);
        console.log(`     Current:  ${leave.from_date.toISOString().split('T')[0]} → ${leave.to_date.toISOString().split('T')[0]} (${leave.total_days} days requested)`);
        console.log(`     Range:    ${analysis.rangeDays} calendar days, ${analysis.workingDays} working days`);
        analysis.errors.forEach(err => console.log(`     Issue:    ${err}`));
        console.log();
      });
    }

    if (!isDryRun) {
      log('yellow', '\n⚠️  WARNING: This will fix ${problemLeaves.length} leave applications\n');
      log('bright', 'Proceeding with corrections...\n');

      let fixedCount = 0;
      const updates = [];

      for (const { leave, analysis } of problemLeaves) {
        const fix = await fixDateRange(leave, analysis);
        if (fix.wasFixed) {
          updates.push({
            id: leave._id,
            oldFrom: leave.from_date,
            oldTo: leave.to_date,
            newFrom: fix.from_date,
            newTo: fix.to_date
          });
          fixedCount++;
        }
      }

      // Apply fixes
      if (updates.length > 0) {
        log('blue', `🚀 Fixing ${updates.length} leaves...\n`);
        
        for (const update of updates) {
          await LeaveApplication.findByIdAndUpdate(
            update.id,
            {
              from_date: update.newFrom,
              to_date: update.newTo,
              updatedAt: new Date()
            }
          );
        }

        log('green', `✅ Fixed ${updates.length} leaves successfully\n`);
        
        // Show what was fixed
        log('yellow', 'Corrections applied:\n');
        updates.slice(0, 3).forEach(u => {
          console.log(`   ${moment(u.oldFrom).format('YYYY-MM-DD')} → ${moment(u.oldTo).format('YYYY-MM-DD')}`);
          console.log(`   ↓ Changed to:`);
          console.log(`   ${moment(u.newFrom).format('YYYY-MM-DD')} → ${moment(u.newTo).format('YYYY-MM-DD')}\n`);
        });

        if (updates.length > 3) {
          log('cyan', `   ... and ${updates.length - 3} more\n`);
        }
      }

      log('green', '✨ All corrections completed!');

    } else {
      log('yellow', '\n🏃 DRY RUN MODE - No changes will be made\n');
      log('bright', 'To apply these fixes, run without the --dry-run flag:');
      const cmd = `node fix-leave-dates.mjs${targetEmployeeId ? ` --employee-id ${targetEmployeeId}` : ''}${targetFromDate ? ` --from-date ${targetFromDate}` : ''}${targetToDate ? ` --to-date ${targetToDate}` : ''}`;
      log('yellow', `   ${cmd}\n`);
    }

  } catch (error) {
    log('red', '\n❌ Error occurred:');
    log('red', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('blue', '🔌 Database connection closed');
  }
}

main();
