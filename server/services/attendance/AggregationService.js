import AttendanceRecord from '../../model/attendance/AttendanceRecord.js';
import LeaveApplication from '../../model/attendance/LeaveApplication.js';
import Holiday from '../../model/attendance/Holiday.js';
import User from '../../model/userModel.mjs';
import TeamModel from '../../model/teamModel.mjs';
import RegularizationRequest from '../../model/attendance/RegularizationRequest.js';
import mongoose from 'mongoose';
import moment from 'moment';
import PolicyResolver from './PolicyResolver.js';

/**
 * ENTERPRISE AGGREGATION SERVICE
 * Unified data aggregation for CEO/Admin-level dashboards
 * Supports global + org-scoped + hierarchical drilling
 */
class AggregationService {
    static cache = new Map();

    static cacheTtl = {
        globalSummary: 5 * 60 * 1000,
        monthlySummary: 60 * 60 * 1000,
        leaveRequests: 5 * 60 * 1000,
        regularizationRequests: 5 * 60 * 1000,
        hierarchy: 5 * 60 * 1000,
        dailySummary: 5 * 60 * 1000
    };

    static normalizeFilterIds(ids = []) {
        return (Array.isArray(ids) ? ids : [ids])
            .map(value => String(value || '').trim())
            .filter(Boolean)
            .sort();
    }

    static createCacheKey(prefix, parts = []) {
        const normalizedParts = parts.map(part => {
            if (Array.isArray(part)) {
                return `[${part.map(item => String(item)).join(',')}]`;
            }
            if (part && typeof part === 'object') {
                return JSON.stringify(part);
            }
            return String(part ?? '');
        });

        return `${prefix}:${normalizedParts.join('|')}`;
    }

    static getCachedValue(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (entry.expiresAt <= Date.now()) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    static setCachedValue(key, value, ttlMs) {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
        });
        return value;
    }

    static clearCache(prefix = null) {
        if (!prefix) {
            this.cache.clear();
            return;
        }

        for (const key of this.cache.keys()) {
            if (key.startsWith(`${prefix}:`)) {
                this.cache.delete(key);
            }
        }
    }
    /**
     * Build company filter for MongoDB queries
     * Rules:
     *  - No filter/empty array → ALL companies (global aggregation)
     *  - Single org → Filter by company_id
     *  - Multiple orgs → Filter by company_id IN [...]
     */
    static buildCompanyFilter(organizationIds) {
        if (!organizationIds || organizationIds.length === 0) {
            return {}; // No filter = aggregate all companies
        }

        const ids = Array.isArray(organizationIds)
            ? organizationIds.filter(Boolean).map(id => {
                try {
                    return new mongoose.Types.ObjectId(id);
                } catch {
                    return id;
                }
            })
            : [organizationIds];

        if (ids.length === 0) {
            return {};
        }

        return { company_id: { $in: ids } };
    }

    /**
     * Get global dashboard summary for a specific date
     * Supports optional org/dept/team filtering
     * Returns: { global_summary, org_breakdown, pending_requests }
     */
    static async getGlobalDashboardSummary(date, organizationIds = [], departmentIds = [], teamIds = []) {
        try {
            const cacheKey = this.createCacheKey('globalSummary', [
                moment.utc(date).startOf('day').format('YYYY-MM-DD'),
                this.normalizeFilterIds(organizationIds),
                this.normalizeFilterIds(departmentIds),
                this.normalizeFilterIds(teamIds)
            ]);

            const cachedValue = this.getCachedValue(cacheKey);
            if (cachedValue) {
                return cachedValue;
            }

            const targetDate = moment.utc(date).startOf('day').toDate();
            const companyFilter = this.buildCompanyFilter(organizationIds);

            // 1. Build employee scope based on org/dept/team filters
            let employeeScope = null;

            if (teamIds.length > 0) {
                // Team-level drilling
                const teams = await TeamModel.find({
                    _id: { $in: teamIds.map(id => new mongoose.Types.ObjectId(id)) },
                    isActive: { $ne: false }
                }).lean();

                const memberIds = new Set();
                teams.forEach(team => {
                    (team.members || []).forEach(member => {
                        if (member.userId) memberIds.add(member.userId.toString());
                    });
                });

                employeeScope = Array.from(memberIds).map(id => new mongoose.Types.ObjectId(id));
            } else if (departmentIds.length > 0) {
                // Department-level drilling
                const employees = await User.find({
                    department_id: { $in: departmentIds.map(id => new mongoose.Types.ObjectId(id)) },
                    isActive: { $ne: false },
                    ...companyFilter
                }).select('_id').lean();

                employeeScope = employees.map(e => e._id);
            } else if (organizationIds.length > 0) {
                // Organization-level drilling
                const employees = await User.find({
                    ...companyFilter,
                    isActive: { $ne: false }
                }).select('_id').lean();

                employeeScope = employees.map(e => e._id);
            }
            // If no org/dept/team specified → no employee scope filter (global)

            // 2. Build attendance query
            const attendanceMatch = {
                attendance_date: targetDate,
                ...companyFilter
            };

            if (employeeScope) {
                attendanceMatch.employee_id = { $in: employeeScope };
            }

            // 3. Fetch attendance records
            const attendanceRecords = await AttendanceRecord.find(attendanceMatch)
                .populate('employee_id', '_id first_name last_name username company_id')
                .lean();

            // 4. Fetch approved leaves for the date
            const leaveMatch = {
                approval_status: 'approved',
                from_date: { $lte: targetDate },
                to_date: { $gte: targetDate },
                ...companyFilter
            };

            if (employeeScope) {
                leaveMatch.employee_id = { $in: employeeScope };
            }

            const approvedLeaves = await LeaveApplication.find(leaveMatch)
                .populate('employee_id', '_id first_name last_name company_id')
                .populate('leave_policy_id', 'leave_type policy_name')
                .lean();

            // 5. Calculate global summary
            const presentSet = new Set();
            const absentSet = new Set();
            const lateSet = new Set();
            const halfDaySet = new Set();
            const onLeaveSet = new Set(); // Will contain FULL day leaves
            const earlyExitSet = new Set();
            const missedPunchSet = new Set();

            // 5a. Identify half-day leaves for the target date
            const onHalfDayLeaveSet = new Set();
            const targetStr = moment.utc(targetDate).format('YYYY-MM-DD');

            approvedLeaves.forEach(leave => {
                const empId = leave.employee_id._id.toString();
                const fromStr = leave.from_date_str;
                const toStr = leave.to_date_str;

                let isHalf = false;
                if (leave.is_half_day && fromStr === targetStr) isHalf = true;
                else if (leave.is_start_half_day && fromStr === targetStr) isHalf = true;
                else if (leave.is_end_half_day && toStr === targetStr) isHalf = true;

                if (isHalf) {
                    onHalfDayLeaveSet.add(empId);
                    halfDaySet.add(empId);
                } else {
                    onLeaveSet.add(empId);
                }
            });

            // 5b. Process attendance records
            attendanceRecords.forEach(record => {
                const empId = record.employee_id._id.toString();

                if (['present', 'late', 'half_day'].includes(record.status)) {
                    if (record.status === 'half_day' || onHalfDayLeaveSet.has(empId)) {
                        halfDaySet.add(empId);
                    } else {
                        presentSet.add(empId);
                        if (record.is_late) lateSet.add(empId);
                    }
                    if (record.is_early_exit) earlyExitSet.add(empId);
                } else if (record.status === 'absent') {
                    if (onHalfDayLeaveSet.has(empId)) {
                        halfDaySet.add(empId);
                    } else {
                        absentSet.add(empId);
                    }
                } else if (record.status === 'incomplete') {
                    missedPunchSet.add(empId);
                }
            });

            // 5c. Resolve mutual exclusivity for full-day leaves
            // (Exclude anyone already counted as present or half-day)
            const effectiveOnLeaveIds = new Set(
                Array.from(onLeaveSet).filter(empId => !presentSet.has(empId) && !halfDaySet.has(empId))
            );

            const absentOnLeaveOverlap = new Set(
                Array.from(absentSet).filter(empId => effectiveOnLeaveIds.has(empId))
            );

            // Get total active employees
            const totalEmployeesQuery = {
                isActive: { $ne: false },
                ...companyFilter
            };

            if (employeeScope) {
                totalEmployeesQuery._id = { $in: employeeScope };
            }

            const totalEmployees = await User.countDocuments(totalEmployeesQuery);

            const globalSummary = {
                date: moment.utc(targetDate).format('YYYY-MM-DD'),
                total_employees: totalEmployees,
                present_today: presentSet.size,
                absent_today: Math.max(0, absentSet.size - absentOnLeaveOverlap.size),
                on_leave_today: effectiveOnLeaveIds.size,
                late_arrivals: lateSet.size,
                early_exits: earlyExitSet.size,
                half_day: halfDaySet.size,
                missed_punch: missedPunchSet.size,
                pending_approvals: await this.getPendingApprovalsCount(companyFilter, employeeScope)
            };

            // 6. Organization breakdown (if not already filtered to single org)
            let orgBreakdown = [];

            if (organizationIds.length === 0 || organizationIds.length > 1) {
                // Get all orgs and breakdown stats
                const orgs = await User.distinct('company_id', {
                    isActive: { $ne: false },
                    ...companyFilter,
                    ...(employeeScope ? { _id: { $in: employeeScope } } : {})
                });

                for (const orgId of orgs) {
                    if (!orgId) continue;

                    const orgAttendance = attendanceRecords.filter(
                        r => r.employee_id.company_id.toString() === orgId.toString()
                    );
                    const orgLeaves = approvedLeaves.filter(
                        l => l.employee_id.company_id.toString() === orgId.toString()
                    );

                    const orgPresentSet = new Set();
                    const orgAbsentSet = new Set();
                    const orgLateSet = new Set();
                    const orgHalfDaySet = new Set();
                    const orgOnLeaveSet = new Set();
                    const orgMissedPunchSet = new Set();

                    // Org half-day leaves
                    orgLeaves.forEach(leave => {
                        const empId = leave.employee_id._id.toString();
                        const fromStr = leave.from_date_str;
                        const toStr = leave.to_date_str;

                        let isHalf = false;
                        if (leave.is_half_day && fromStr === targetStr) isHalf = true;
                        else if (leave.is_start_half_day && fromStr === targetStr) isHalf = true;
                        else if (leave.is_end_half_day && toStr === targetStr) isHalf = true;

                        if (isHalf) orgHalfDaySet.add(empId);
                        else orgOnLeaveSet.add(empId);
                    });

                    orgAttendance.forEach(record => {
                        const empId = record.employee_id._id.toString();
                        if (['present', 'late', 'half_day'].includes(record.status)) {
                            if (record.status === 'half_day' || orgHalfDaySet.has(empId)) {
                                orgHalfDaySet.add(empId);
                            } else {
                                orgPresentSet.add(empId);
                                if (record.is_late) orgLateSet.add(empId);
                            }
                        } else if (record.status === 'absent') {
                            if (orgHalfDaySet.has(empId)) {
                                orgHalfDaySet.add(empId);
                            } else {
                                orgAbsentSet.add(empId);
                            }
                        } else if (record.status === 'incomplete') {
                            orgMissedPunchSet.add(empId);
                        }
                    });

                    const orgEffectiveOnLeaveIds = new Set(
                        Array.from(orgOnLeaveSet).filter(empId => !orgPresentSet.has(empId) && !orgHalfDaySet.has(empId))
                    );

                    const orgAbsentOnLeaveOverlap = new Set(
                        Array.from(orgAbsentSet).filter(empId => orgEffectiveOnLeaveIds.has(empId))
                    );

                    const orgTotalEmps = await User.countDocuments({
                        company_id: orgId,
                            isActive: { $ne: false },
                        ...(employeeScope ? { _id: { $in: employeeScope } } : {})
                    });

                    const orgDoc = await User.findOne({ company_id: orgId, isActive: { $ne: false } }).select('company_id').populate('company_id', 'company_name').lean();

                    orgBreakdown.push({
                        org_id: orgId.toString(),
                        org_name: orgDoc?.company_id?.company_name || 'Unknown',
                        total_employees: orgTotalEmps,
                        present: orgPresentSet.size,
                        absent: Math.max(0, orgAbsentSet.size - orgAbsentOnLeaveOverlap.size),
                        on_leave: orgEffectiveOnLeaveIds.size,
                        half_day: orgHalfDaySet.size,
                        missed_punch: orgMissedPunchSet.size,
                        late: orgLateSet.size
                    });
                }
            }

            // 7. Detailed employee lists
            const presentList = Array.from(presentSet).map(empId => {
                const r = attendanceRecords.find(rec => rec.employee_id._id.toString() === empId);
                const emp = r ? r.employee_id : approvedLeaves.find(l => l.employee_id._id.toString() === empId)?.employee_id;
                return {
                    emp_id: empId,
                    emp_name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.username : 'Unknown',
                    in_time: r?.first_in,
                    out_time: r?.last_out,
                    work_hours: (r?.total_work_hours || 0).toFixed(2),
                    is_late: r?.is_late,
                    late_by: r?.late_by_minutes || 0
                };
            });

            const absentList = Array.from(absentSet).map(empId => {
                const r = attendanceRecords.find(rec => rec.employee_id._id.toString() === empId);
                const emp = r ? r.employee_id : approvedLeaves.find(l => l.employee_id._id.toString() === empId)?.employee_id;
                return {
                    emp_id: empId,
                    emp_name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.username : 'Unknown',
                    reason: 'No punch recorded',
                    on_leave: false
                };
            });

            // Add employees on full-day leave to absent list (if not present)
            Array.from(effectiveOnLeaveIds).forEach(empId => {
                if (!absentList.some(a => a.emp_id === empId)) {
                    const leave = approvedLeaves.find(l => l.employee_id._id.toString() === empId);
                    const emp = leave?.employee_id;
                    absentList.push({
                        emp_id: empId,
                        emp_name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
                        reason: 'On approved leave',
                        on_leave: true,
                        leave_type: leave?.leave_policy_id?.leave_type || 'Leave'
                    });
                }
            });

            const lateList = attendanceRecords
                .filter(r => r.is_late)
                .map(r => ({
                    emp_id: r.employee_id._id.toString(),
                    emp_name: `${r.employee_id.first_name || ''} ${r.employee_id.last_name || ''}`.trim() || r.employee_id.username,
                    in_time: r.first_in,
                    late_by: r.late_by_minutes || 0
                }));

            const onLeaveList = approvedLeaves
                .filter(l => !presentSet.has(l.employee_id._id.toString()))
                .map(l => ({
                emp_id: l.employee_id._id.toString(),
                emp_name: `${l.employee_id.first_name || ''} ${l.employee_id.last_name || ''}`.trim() || 'Unknown',
                leave_type: l.leave_policy_id?.leave_type || 'Leave',
                from_date: l.from_date,
                to_date: l.to_date
            }));

            const missedPunchList = attendanceRecords
                .filter(r => r.status === 'incomplete' || r.missed_punch)
                .map(r => ({
                    emp_id: r.employee_id._id.toString(),
                    emp_name: `${r.employee_id.first_name || ''} ${r.employee_id.last_name || ''}`.trim() || r.employee_id.username,
                    in_time: r.first_in,
                    out_time: r.last_out,
                    reason: r.missed_punch_reason || 'Incomplete Session'
                }));

            const halfDayList = Array.from(halfDaySet).map(empId => {
                const r = attendanceRecords.find(rec => rec.employee_id._id.toString() === empId);
                const leave = approvedLeaves.find(l => l.employee_id._id.toString() === empId);
                const emp = r ? r.employee_id : leave?.employee_id;
                return {
                    emp_id: empId,
                    emp_name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.username : 'Unknown',
                    in_time: r?.first_in,
                    out_time: r?.last_out,
                    work_hours: (r?.total_work_hours || 0).toFixed(2),
                    on_leave: !!leave,
                    leave_type: leave?.leave_policy_id?.leave_type
                };
            });

            return this.setCachedValue(cacheKey, {
                success: true,
                summary: globalSummary,
                organizations: orgBreakdown,
                daily_details: {
                    present: presentList,
                    absent: absentList,
                    late: lateList,
                    on_leave: onLeaveList,
                    missed_punch: missedPunchList,
                    half_day: halfDayList
                }
            }, this.cacheTtl.globalSummary);
        } catch (error) {
            console.error('Error in getGlobalDashboardSummary:', error);
            throw error;
        }
    }

    /**
     * Get daily summary with employee-level details
     */
    static async getDailyEmployeeSummary(date, organizationIds = [], departmentIds = [], teamIds = [], pagination = {}) {
        try {
            const targetDate = moment.utc(date).startOf('day').toDate();
            const companyFilter = this.buildCompanyFilter(organizationIds);
            const page = pagination.page || 1;
            const limit = pagination.limit || 50;
            const skip = (page - 1) * limit;

            // Build employee scope
            let employeeScope = null;

            if (teamIds.length > 0) {
                const teams = await TeamModel.find({
                    _id: { $in: teamIds.map(id => new mongoose.Types.ObjectId(id)) },
                    isActive: { $ne: false }
                }).lean();

                const memberIds = new Set();
                teams.forEach(team => {
                    (team.members || []).forEach(member => {
                        if (member.userId) memberIds.add(member.userId.toString());
                    });
                });

                employeeScope = Array.from(memberIds).map(id => new mongoose.Types.ObjectId(id));
            } else if (departmentIds.length > 0) {
                const employees = await User.find({
                    department_id: { $in: departmentIds.map(id => new mongoose.Types.ObjectId(id)) },
                    isActive: { $ne: false },
                    ...companyFilter
                }).select('_id').lean();

                employeeScope = employees.map(e => e._id);
            }

            // Fetch attendance records
            const attendanceQuery = {
                attendance_date: targetDate,
                ...companyFilter
            };

            if (employeeScope) {
                attendanceQuery.employee_id = { $in: employeeScope };
            }

            const totalRecords = await AttendanceRecord.countDocuments(attendanceQuery);

            const records = await AttendanceRecord.find(attendanceQuery)
                .populate('employee_id', '_id first_name last_name username company_id')
                .sort({ 'employee_id.first_name': 1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // Fetch leaves for context
            const leaveQuery = {
                approval_status: 'approved',
                from_date: { $lte: targetDate },
                to_date: { $gte: targetDate },
                ...companyFilter
            };

            if (employeeScope) {
                leaveQuery.employee_id = { $in: employeeScope };
            }

            const leaves = await LeaveApplication.find(leaveQuery)
                .populate('leave_policy_id', 'leave_type')
                .lean();

            const leavesMap = new Map(leaves.map(l => [l.employee_id.toString(), l]));
            
            // Fetch teams for context
            const activeTeams = await TeamModel.find({
                'members.userId': { $in: records.map(r => r.employee_id._id) },
                isActive: { $ne: false }
            }).select('name members.userId').lean();

            const teamMap = new Map();
            activeTeams.forEach(t => {
                t.members.forEach(m => {
                    if (m.userId) {
                        const uid = m.userId.toString();
                        if (!teamMap.has(uid)) teamMap.set(uid, []);
                        teamMap.get(uid).push(t.name);
                    }
                });
            });

            const dailySummary = records.map(record => {
                const leave = leavesMap.get(record.employee_id._id.toString());

                return {
                    emp_id: record.employee_id._id.toString(),
                    emp_name: `${record.employee_id.first_name || ''} ${record.employee_id.last_name || ''}`.trim() || record.employee_id.username,
                    status: record.status,
                    in_time: record.first_in,
                    out_time: record.last_out,
                    work_hours: (record.total_work_hours || 0).toFixed(2),
                    is_late: record.is_late,
                    late_by: record.late_by_minutes || 0,
                    is_half_day: record.status === 'half_day',
                    on_leave: !!leave,
                    leave_type: leave?.leave_policy_id?.leave_type || null,
                    team: (teamMap.get(record.employee_id._id.toString()) || []).join(', ') || 'Unassigned'
                };
            });

            return {
                success: true,
                data: dailySummary,
                pagination: {
                    page,
                    limit,
                    total: totalRecords,
                    pages: Math.ceil(totalRecords / limit)
                }
            };
        } catch (error) {
            console.error('Error in getDailyEmployeeSummary:', error);
            throw error;
        }
    }

    /**
     * Get monthly summary with trends and employee stats
     */
    static async getMonthlySummary(year, month, organizationIds = [], departmentIds = [], teamIds = []) {
        try {
            const cacheKey = this.createCacheKey('monthlySummary', [
                `${year}-${String(month).padStart(2, '0')}`,
                this.normalizeFilterIds(organizationIds),
                this.normalizeFilterIds(departmentIds),
                this.normalizeFilterIds(teamIds)
            ]);

            const cachedValue = this.getCachedValue(cacheKey);
            if (cachedValue) {
                return cachedValue;
            }

            const startDate = moment.utc(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').toDate();
            const endDate = moment.utc(startDate).endOf('month').toDate();
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;

            const companyFilter = this.buildCompanyFilter(organizationIds);

            // Build employee scope
            let employeeScope = null;

            if (teamIds.length > 0) {
                const teams = await TeamModel.find({
                    _id: { $in: teamIds.map(id => new mongoose.Types.ObjectId(id)) },
                    isActive: { $ne: false }
                }).lean();

                const memberIds = new Set();
                teams.forEach(team => {
                    (team.members || []).forEach(member => {
                        if (member.userId) memberIds.add(member.userId.toString());
                    });
                });

                employeeScope = Array.from(memberIds).map(id => new mongoose.Types.ObjectId(id));
            } else if (departmentIds.length > 0) {
                const employees = await User.find({
                    department_id: { $in: departmentIds.map(id => new mongoose.Types.ObjectId(id)) },
                    isActive: { $ne: false },
                    ...companyFilter
                }).select('_id').lean();

                employeeScope = employees.map(e => e._id);
            }

            const attendanceQuery = {
                year_month: monthStr,
                ...companyFilter
            };

            if (employeeScope) {
                attendanceQuery.employee_id = { $in: employeeScope };
            }

            const attendanceRecords = await AttendanceRecord.find(attendanceQuery).lean();

            // Calculate daily breakdown
            const dailyStats = {};

            for (let day = 1; day <= moment(endDate).date(); day++) {
                const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
                const dayDate = moment.utc(dateStr).toDate();

                const dayRecords = attendanceRecords.filter(r => {
                    const rDateStr = moment(r.attendance_date).format('YYYY-MM-DD');
                    return rDateStr === dateStr;
                });

                const present = dayRecords.filter(r => ['present', 'late', 'half_day'].includes(r.status)).length;
                const absent = dayRecords.filter(r => r.status === 'absent').length;
                const late = dayRecords.filter(r => r.is_late).length;

                dailyStats[dateStr] = {
                    date: dateStr,
                    total_records: dayRecords.length,
                    present,
                    absent,
                    late
                };
            }

            // Calculate monthly summary
            const presentDays = attendanceRecords.filter(r => ['present', 'late', 'half_day'].includes(r.status)).length;
            const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
            const lateDays = attendanceRecords.filter(r => r.is_late).length;
            const halfDays = attendanceRecords.filter(r => r.status === 'half_day').length;
            const totalRecords = attendanceRecords.length;

            const workingDays = moment(endDate).date(); // Days in month

            const monthlySummary = {
                month: monthStr,
                total_working_days: workingDays,
                total_records: totalRecords,
                avg_present_percent: totalRecords > 0 ? ((presentDays / totalRecords) * 100).toFixed(1) : 0,
                avg_absent_percent: totalRecords > 0 ? ((absentDays / totalRecords) * 100).toFixed(1) : 0,
                total_late_arrivals: lateDays,
                total_half_days: halfDays,
                total_work_hours: attendanceRecords.reduce((sum, r) => sum + (r.total_work_hours || 0), 0).toFixed(2)
            };

            // Get employee-wise monthly stats
            const employeeStats = [];
            const employeeMap = new Map();

            attendanceRecords.forEach(record => {
                const empId = record.employee_id.toString();

                if (!employeeMap.has(empId)) {
                    employeeMap.set(empId, {
                        emp_id: empId,
                        emp_name: '',
                        present_days: 0,
                        absent_days: 0,
                        late_days: 0,
                        half_days: 0,
                        total_work_hours: 0
                    });
                }

                const stats = employeeMap.get(empId);

                if (['present', 'late', 'half_day'].includes(record.status)) {
                    stats.present_days++;
                    if (record.is_late) stats.late_days++;
                    if (record.status === 'half_day') stats.half_days++;
                } else if (record.status === 'absent') {
                    stats.absent_days++;
                }

                stats.total_work_hours += record.total_work_hours || 0;
            });

            // Fetch employee names
            const empIds = Array.from(employeeMap.keys()).map(id => new mongoose.Types.ObjectId(id));

            const employees = await User.find({
                _id: { $in: empIds }
            }).select('_id first_name last_name username').lean();

            const empNameMap = new Map(
                employees.map(e => [e._id.toString(), `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.username])
            );

            // Fetch teams for context
            const activeTeams = await TeamModel.find({
                'members.userId': { $in: empIds },
                isActive: { $ne: false }
            }).select('name members.userId').lean();

            const teamMap = new Map();
            activeTeams.forEach(t => {
                t.members.forEach(m => {
                    if (m.userId) {
                        const uid = m.userId.toString();
                        if (!teamMap.has(uid)) teamMap.set(uid, []);
                        teamMap.get(uid).push(t.name);
                    }
                });
            });

            employeeMap.forEach((stats, empId) => {
                stats.emp_name = empNameMap.get(empId) || 'Unknown';
                stats.team = (teamMap.get(empId) || []).join(', ') || 'Unassigned';
                stats.avg_daily_hours = stats.present_days > 0 ? (stats.total_work_hours / stats.present_days).toFixed(2) : 0;
                employeeStats.push(stats);
            });

            return this.setCachedValue(cacheKey, {
                success: true,
                summary: monthlySummary,
                daily_breakdown: Object.values(dailyStats),
                employee_monthly: employeeStats
            }, this.cacheTtl.monthlySummary);
        } catch (error) {
            console.error('Error in getMonthlySummary:', error);
            throw error;
        }
    }

    /**
     * Get leave requests with approval chain
     */
    static async getLeaveRequests(organizationIds = [], status = 'pending', pagination = {}) {
        try {
            const cacheKey = this.createCacheKey('leaveRequests', [
                this.normalizeFilterIds(organizationIds),
                status,
                {
                    page: pagination.page || 1,
                    limit: pagination.limit || 50
                }
            ]);

            const cachedValue = this.getCachedValue(cacheKey);
            if (cachedValue) {
                return cachedValue;
            }

            const companyFilter = this.buildCompanyFilter(organizationIds);
            const page = pagination.page || 1;
            const limit = pagination.limit || 50;
            const skip = (page - 1) * limit;

            const query = {
                ...companyFilter
            };

            if (status === 'pending') {
                query.approval_status = { $in: ['pending', 'pending_hod', 'pending_shalini', 'pending_final'] };
            } else if (['approved', 'rejected'].includes(status)) {
                query.approval_status = status;
            }

            const total = await LeaveApplication.countDocuments(query);

            const leaves = await LeaveApplication.find(query)
                .populate('employee_id', '_id first_name last_name username company_id')
                .populate('leave_policy_id', 'leave_type policy_name')
                .populate('current_approver_id', 'first_name last_name username role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const formatted = leaves.map(leave => ({
                id: leave._id,
                employee_id: leave.employee_id._id,
                employee_name: `${leave.employee_id.first_name || ''} ${leave.employee_id.last_name || ''}`.trim() || leave.employee_id.username,
                leave_type: leave.leave_policy_id?.leave_type || 'Leave',
                from_date: leave.from_date,
                to_date: leave.to_date,
                total_days: leave.total_days,
                status: leave.approval_status,
                approval_stage: leave.approval_stage || 'stage_1_hod',
                current_approver: leave.current_approver_id
                    ? `${leave.current_approver_id.first_name || ''} ${leave.current_approver_id.last_name || ''}`.trim() || leave.current_approver_id.username
                    : 'Unassigned',
                applied_on: leave.createdAt,
                reason: leave.reason
            }));

            return this.setCachedValue(cacheKey, {
                success: true,
                data: formatted,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }, this.cacheTtl.leaveRequests);
        } catch (error) {
            console.error('Error in getLeaveRequests:', error);
            throw error;
        }
    }

    /**
     * Get regularization requests
     */
    static async getRegularizationRequests(organizationIds = [], pagination = {}) {
        try {
            const cacheKey = this.createCacheKey('regularizationRequests', [
                this.normalizeFilterIds(organizationIds),
                {
                    page: pagination.page || 1,
                    limit: pagination.limit || 50
                }
            ]);

            const cachedValue = this.getCachedValue(cacheKey);
            if (cachedValue) {
                return cachedValue;
            }

            const companyFilter = this.buildCompanyFilter(organizationIds);
            const page = pagination.page || 1;
            const limit = pagination.limit || 50;
            const skip = (page - 1) * limit;

            const query = {
                status: 'pending',
                ...companyFilter
            };

            const total = await RegularizationRequest.countDocuments(query);

            const records = await RegularizationRequest.find(query)
                .populate('employee_id', '_id first_name last_name username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const formatted = records.map(rec => ({
                id: rec._id,
                employee_id: rec.employee_id._id,
                employee_name: `${rec.employee_id.first_name || ''} ${rec.employee_id.last_name || ''}`.trim() || rec.employee_id.username,
                attendance_date: rec.attendance_date,
                regularization_type: rec.regularization_type,
                reason: rec.reason,
                requested_in_time: rec.requested_in_time,
                requested_out_time: rec.requested_out_time,
                created_on: rec.createdAt
            }));

            return this.setCachedValue(cacheKey, {
                success: true,
                data: formatted,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }, this.cacheTtl.regularizationRequests);
        } catch (error) {
            console.error('Error in getRegularizationRequests:', error);
            throw error;
        }
    }

    /**
     * Get organization/department/team hierarchy for filters
     */
    static async getHierarchy(organizationIds = []) {
        try {
            const cacheKey = this.createCacheKey('hierarchy', [this.normalizeFilterIds(organizationIds)]);

            const cachedValue = this.getCachedValue(cacheKey);
            if (cachedValue) {
                return cachedValue;
            }

            const companyFilter = this.buildCompanyFilter(organizationIds);

            // Get all companies
            const companies = await User.distinct('company_id', {
                isActive: { $ne: false },
                ...companyFilter
            });

            const companyDocs = await User.find({ company_id: { $in: companies }, isActive: { $ne: false } })
                .populate('company_id', '_id company_name')
                .select('company_id')
                .lean();

            const companyMap = new Map();
            companyDocs.forEach(doc => {
                if (doc.company_id && !companyMap.has(doc.company_id._id.toString())) {
                    companyMap.set(doc.company_id._id.toString(), doc.company_id);
                }
            });

            const organizations = Array.from(companyMap.values()).map(comp => ({
                id: comp._id,
                name: comp.company_name,
                employee_count: 0 // To be filled below
            }));

            // Count employees per org
            for (const org of organizations) {
                const count = await User.countDocuments({
                    company_id: org.id,
                    isActive: { $ne: false },
                    ...companyFilter
                });
                org.employee_count = count;
            }

            // Get departments
            const departments = await User.distinct('department_id', {
                isActive: { $ne: false },
                ...companyFilter,
                department_id: { $ne: null }
            });

            // Get teams
            const teams = await TeamModel.find({
                isActive: { $ne: false },
                ...(organizationIds.length > 0 ? {} : {}) // Can add company filter if needed
            }).select('_id name members').lean();

            return this.setCachedValue(cacheKey, {
                success: true,
                organizations: organizations.map(org => ({
                    id: org.id.toString(),
                    name: org.name,
                    employee_count: org.employee_count
                })),
                departments: departments.map(d => ({
                    id: d?.toString(),
                    name: d?.toString() || 'Unassigned'
                })).filter(d => d.id),
                teams: teams.map(t => ({
                    id: t._id.toString(),
                    name: t.name,
                    member_count: (t.members || []).length
                }))
            }, this.cacheTtl.hierarchy);
        } catch (error) {
            console.error('Error in getHierarchy:', error);
            throw error;
        }
    }

    /**
     * Helper: Get count of pending approvals
     */
    static async getPendingApprovalsCount(companyFilter, employeeScope) {
        try {
            const leaveQuery = {
                approval_status: { $in: ['pending', 'pending_hod', 'pending_shalini', 'pending_final'] },
                ...companyFilter
            };

            if (employeeScope) {
                leaveQuery.employee_id = { $in: employeeScope };
            }

            const leaveCount = await LeaveApplication.countDocuments(leaveQuery);

            const regQuery = {
                status: 'pending',
                ...companyFilter
            };

            if (employeeScope) {
                regQuery.employee_id = { $in: employeeScope };
            }

            const regCount = await RegularizationRequest.countDocuments(regQuery);

            return leaveCount + regCount;
        } catch (error) {
            console.error('Error in getPendingApprovalsCount:', error);
            return 0;
        }
    }
}

export default AggregationService;
