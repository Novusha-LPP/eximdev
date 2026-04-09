import mongoose from "mongoose";
import moment from "moment";
import { User, AttendanceRecord, LeaveApplication, LeaveBalance, RegularizationRequest, ActiveSession, TeamModel } from "./model/index.mjs";
import { Company, LeavePolicy } from "./model/index.mjs"; 
import { PolicyResolver } from "./services/attendance/PolicyResolver.js";

const NON_FINAL_LEAVE_STATUSES = ['pending', 'pending_hod', 'in_review'];
const dateKeyLocal = (dateVal) => moment(dateVal).format('YYYY-MM-DD');

const findLeaveForDateLocal = (leaves, dayMomentLocal) => {
    return leaves.find((leave) => {
        const leaveStart = moment(leave.from_date).startOf('day');
        const leaveEnd = moment(leave.to_date).endOf('day');
        return dayMomentLocal.isSameOrAfter(leaveStart) && dayMomentLocal.isSameOrBefore(leaveEnd);
    });
};

const run = async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/exim', {useNewUrlParser: true, useUnifiedTopology: true});
    
    const id = "696f7ae5e2e6cdb81b34f7ce"; // Jeeya
    const startDate = "2026-03-31";
    const endDate = "2026-04-29";
    
    let start = moment(startDate).startOf('day').toDate();
    let end = moment(endDate).endOf('day').toDate();

    const employee = await User.findById(id).populate('department_id shift_id shift_ids hod_id company_id weekoff_policy_id holiday_policy_id').lean();
    if (!employee) throw new Error("no emp");

    const results = await Promise.all([
        AttendanceRecord.find({
            employee_id: id,
            attendance_date: { $gte: start, $lte: end }
        }).sort({ attendance_date: -1 }).lean(),

        LeaveBalance.find({ employee_id: id }).lean(),
        LeaveApplication.find({ employee_id: id }).lean(),
        LeaveApplication.find({ employee_id: id }).lean(),
        RegularizationRequest.find({ employee_id: id }).lean()
    ]);

    const [attendance, balances, leaves, pendingLeaves, pendingRegularizations] = results;

    const policyByYear = new Map();
    const getPoliciesForYear = async (year) => {
        if (!policyByYear.has(year)) {
            const [weekOffPolicy, holidayPolicy] = await Promise.all([
                PolicyResolver.resolveWeekOffPolicy(employee),
                PolicyResolver.resolveHolidayPolicy(employee, year)
            ]);
            policyByYear.set(year, { weekOffPolicy, holidayPolicy });
        }
        return policyByYear.get(year);
    };

    const attendanceByDay = new Map((attendance || []).map((record) => [dateKeyLocal(record.attendance_date), record]));
    const continuityAttendance = [...(attendance || [])];

    let dayCursor = moment(start).startOf('day');
    const dayEnd = moment(end).endOf('day');

    while (dayCursor.isSameOrBefore(dayEnd, 'day')) {
        const dayStr = dayCursor.format('YYYY-MM-DD');

        const { weekOffPolicy, holidayPolicy } = await getPoliciesForYear(dayCursor.year());
        const holidayStatus = PolicyResolver.resolveHolidayStatus(dayCursor.toDate(), holidayPolicy);
        const weekOffStatus = PolicyResolver.resolveWeeklyOffStatus(dayCursor.toDate(), weekOffPolicy);

        const existingRecord = attendanceByDay.get(dayStr);
        const shouldIgnoreAutoPresentOnPolicyOff =
            !!existingRecord &&
            String(existingRecord.status || '').toLowerCase() === 'present' &&
            String(existingRecord.processed_by || '').toLowerCase() === 'admin-full-month' &&
            (holidayStatus?.isHoliday || weekOffStatus?.isOff);

        if (shouldIgnoreAutoPresentOnPolicyOff) {
            attendanceByDay.delete(dayStr);
            const existingIndex = continuityAttendance.findIndex((item) => String(item._id) === String(existingRecord._id));
            if (existingIndex >= 0) continuityAttendance.splice(existingIndex, 1);
        }

        if (attendanceByDay.has(dayStr)) {
            dayCursor.add(1, 'day');
            continue;
        }

        const leave = findLeaveForDateLocal(leaves, dayCursor);
        if (leave) {
            continuityAttendance.push({
                _id: `virtual-leave-${dayStr}`,
                attendance_date: dayCursor.toDate(),
                status: leave.is_half_day ? 'half_day' : 'leave',
                half_day_session: leave.half_day_session || null,
                remarks: 'Policy continuity view',
                is_virtual: true
            });
            dayCursor.add(1, 'day');
            continue;
        }

        if (holidayStatus?.isHoliday) {
            continuityAttendance.push({
                _id: `virtual-holiday-${dayStr}`,
                attendance_date: dayCursor.toDate(),
                status: 'holiday',
                remarks: holidayStatus.name || 'Policy holiday',
                is_virtual: true
            });
        } else if (weekOffStatus?.isOff) {
            continuityAttendance.push({
                _id: `virtual-weekoff-${dayStr}`,
                attendance_date: dayCursor.toDate(),
                status: 'weekly_off',
                remarks: 'Policy week off',
                is_virtual: true
            });
        } else if (dayCursor.isSameOrBefore(moment(), 'day')) {
            continuityAttendance.push({
                _id: `virtual-absent-${dayStr}`,
                attendance_date: dayCursor.toDate(),
                status: 'absent',
                remarks: 'No record',
                is_virtual: true
            });
        }

        dayCursor.add(1, 'day');
    }

    continuityAttendance.sort((a, b) => new Date(b.attendance_date) - new Date(a.attendance_date));
    console.log('Resulting Dates:');
    continuityAttendance.map(a => console.log(a.attendance_date, a.status));
    
    process.exit(0);
};

run().catch(console.error);
