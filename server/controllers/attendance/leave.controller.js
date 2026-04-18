import LeaveApplication from '../../model/attendance/LeaveApplication.js';
import LeaveBalance from '../../model/attendance/LeaveBalance.js';
import LeavePolicy from '../../model/attendance/LeavePolicy.js';
import UserModel from '../../model/userModel.mjs';
import moment from 'moment';
import TeamModel from '../../model/teamModel.mjs';
import LeaveCalculationService from '../../services/attendance/LeaveCalculationService.js';
import mongoose from 'mongoose';
import AttendanceRecord from '../../model/attendance/AttendanceRecord.js';
import PolicyResolver from '../../services/attendance/PolicyResolver.js';

const STAGE_2_APPROVER_USERNAME = 'shalini_arun';
const STAGE_3_FINAL_APPROVER_USERNAMES = new Set(['manu_pillai', 'suraj_rajan', 'rajan_aranamkatte']);

const normalizeRole = (role) => String(role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
const isHodRole = (role) => {
    const normalized = normalizeRole(role);
    return normalized === 'HOD' || normalized === 'HEADOFDEPARTMENT';
};

const getRequesterStatus = (approvalStatus) => {
    return ['approved', 'rejected', 'cancelled', 'withdrawn'].includes(String(approvalStatus || ''))
        ? approvalStatus
        : 'pending';
};

const getShaliniApprover = async (companyId) => {
    const companyScoped = await UserModel.findOne({
        username: STAGE_2_APPROVER_USERNAME,
        company_id: companyId,
        isActive: true
    }).select('_id username role');

    if (companyScoped) return companyScoped;

    return UserModel.findOne({
        username: STAGE_2_APPROVER_USERNAME,
        isActive: true
    }).select('_id username role');
};

const getDefaultOpeningBalance = (policy) => {
    const leaveType = String(policy?.leave_type || '').toLowerCase();
    if (leaveType === 'lwp') {
        return Number.MAX_SAFE_INTEGER;
    }
    return Number(policy?.annual_quota || 0);
};

const resolveAvailableFromBalance = (balanceRecord) => {
    const pendingApproval = Number(balanceRecord?.pending_approval);
    const legacyPending = Number(balanceRecord?.pending);
    const opening = Number(balanceRecord?.opening_balance || 0);
    const used = Number(balanceRecord?.used || 0);
    const closing = Number(balanceRecord?.closing_balance);
    const computedRemaining = Math.max(0, opening - used);
    const fallbackAvailable = Math.max(
        0,
        Number.isFinite(closing) ? closing : 0,
        computedRemaining
    );

    if (Number.isFinite(pendingApproval) && pendingApproval > 0) {
        return pendingApproval;
    }

    if (Number.isFinite(legacyPending) && legacyPending > 0) {
        return legacyPending;
    }

    if (pendingApproval === 0 && fallbackAvailable === 0) {
        return 0;
    }

    if (!Number.isFinite(pendingApproval) || pendingApproval < 0 || (pendingApproval === 0 && fallbackAvailable > 0)) {
        return fallbackAvailable;
    }

    return 0;
};

const normalizeId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value._id) return String(value._id);
    return String(value);
};

const getAssignedPolicyIds = (user) => {
    return (user?.leave_settings?.special_leave_policies || []).map((id) => String(id));
};

const getAnyActiveLwpPolicy = async () => {
    return LeavePolicy.findOne({
        leave_type: 'lwp',
        status: 'active'
    }).sort({ updatedAt: -1, createdAt: -1 });
};

const IDEMPOTENT_LEAVE_TYPES = new Set(['lwp', 'privilege']);

const isIdempotentLeaveType = (leaveType) => IDEMPOTENT_LEAVE_TYPES.has(String(leaveType || '').toLowerCase().trim());

const dedupeBalancePolicies = (policies = []) => {
    const seen = new Set();
    const deduped = [];

    for (const policy of policies) {
        if (!policy) continue;

        const leaveType = String(policy.leave_type || '').toLowerCase().trim();
        const policyId = String(policy._id || '');
        const key = isIdempotentLeaveType(leaveType) ? leaveType : policyId;

        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(policy);
    }

    return deduped;
};

const getBalanceSortValue = (balance) => {
    const timestamps = [balance?.updatedAt, balance?.last_updated, balance?.createdAt]
        .map((value) => {
            const parsed = new Date(value).getTime();
            return Number.isFinite(parsed) ? parsed : null;
        })
        .filter((value) => value !== null);

    if (timestamps.length === 0) return 0;
    return Math.max(...timestamps);
};

const findBalanceForPolicy = async ({ employeeId, year, policy }) => {
    const leaveType = String(policy?.leave_type || '').toLowerCase().trim();
    const query = {
        employee_id: employeeId,
        year,
        $or: [{ leave_policy_id: policy._id }]
    };

    if (isIdempotentLeaveType(leaveType)) {
        query.$or.push({ leave_type: leaveType });
    }

    return LeaveBalance.findOne(query).sort({ updatedAt: -1, createdAt: -1 });
};

const pickBalanceForPolicy = (balances = [], policy) => {
    const policyId = String(policy?._id || '');
    const leaveType = String(policy?.leave_type || '').toLowerCase().trim();

    const candidates = balances.filter((balance) => {
        const balancePolicyId = normalizeId(balance?.leave_policy_id);
        const balanceLeaveType = String(balance?.leave_type || '').toLowerCase().trim();

        if (balancePolicyId && balancePolicyId === policyId) return true;
        if (isIdempotentLeaveType(leaveType) && balanceLeaveType === leaveType) return true;
        return false;
    });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => getBalanceSortValue(b) - getBalanceSortValue(a));
    return candidates[0] || null;
};

const checkOverlap = async (userId, fromDate, toDate, currentAppId = null) => {
    const start = moment(fromDate).startOf('day').toDate();
    const end = moment(toDate).endOf('day').toDate();

    const query = {
        employee_id: userId,
        approval_status: { $nin: ['rejected', 'cancelled', 'withdrawn'] },
        $or: [
            { from_date: { $lte: end, $gte: start } },
            { to_date: { $lte: end, $gte: start } },
            { $and: [{ from_date: { $lte: start } }, { to_date: { $gte: end } }] }
        ]
    };

    if (currentAppId) {
        query._id = { $ne: currentAppId };
    }

    return await LeaveApplication.exists(query);
};

const recoverActivePoliciesFromBalances = async ({ targetId, currentYear, assignedPolicyIds }) => {
    const balances = await LeaveBalance.find({
        employee_id: targetId,
        year: currentYear
    }).select('leave_policy_id leave_type');

    if (!balances.length) {
        return [];
    }

    const directBalancePolicyIds = balances
        .map((b) => normalizeId(b.leave_policy_id))
        .filter(Boolean);

    let recoveredPolicies = await LeavePolicy.find({
        _id: { $in: [...new Set([...assignedPolicyIds, ...directBalancePolicyIds])] },
        status: 'active'
    });

    // Exclude 'privilege' from auto-recovery so it remains completely hidden until assigned
    recoveredPolicies = recoveredPolicies.filter(p => p.leave_type !== 'privilege');

    if (recoveredPolicies.length > 0) {
        return recoveredPolicies;
    }

    const balanceLeaveTypes = balances
        .map((b) => String(b.leave_type || '').toLowerCase().trim())
        .filter(Boolean);

    if (!balanceLeaveTypes.length) {
        return [];
    }

    recoveredPolicies = await LeavePolicy.find({
        status: 'active',
        leave_type: { $in: [...new Set(balanceLeaveTypes)] }
    });

    return recoveredPolicies.filter(p => p.leave_type !== 'privilege');
};

const filterEligiblePolicies = (policies, employee) => {
    return policies.filter((policy) => {
        let eligible = true;

        if (policy.eligibility?.employment_types?.length > 0) {
            const userType = (employee?.employment_type || '').toLowerCase().trim();
            const allowedTypes = policy.eligibility.employment_types.map((t) => t.toLowerCase().trim());
            if (userType && !allowedTypes.includes(userType)) {
                eligible = false;
            }
        }

        if (policy.eligibility?.gender) {
            const userGender = (employee?.gender || '').toLowerCase().trim();
            const policyGender = (policy.eligibility.gender || '').toLowerCase().trim();
            if (userGender && policyGender && userGender !== policyGender) {
                eligible = false;
            }
        }

        return eligible;
    });
};

const ATTENDANCE_PRESENCE_SELECT = 'status net_work_hours total_work_hours first_in last_out attendance_date';

const buildAttendanceContext = async ({ employeeId, fromDate, toDate }) => {
    const start = moment(fromDate).startOf('day');
    const end = moment(toDate || fromDate).startOf('day');
    const dayBefore = start.clone().subtract(1, 'day').toDate();
    const dayAfter = end.clone().add(1, 'day').toDate();

    const [recBefore, recAfter, rangeAttendance] = await Promise.all([
        AttendanceRecord.findOne({ employee_id: employeeId, attendance_date: dayBefore }).select(ATTENDANCE_PRESENCE_SELECT),
        AttendanceRecord.findOne({ employee_id: employeeId, attendance_date: dayAfter }).select(ATTENDANCE_PRESENCE_SELECT),
        AttendanceRecord.find({
            employee_id: employeeId,
            attendance_date: { $gte: start.toDate(), $lte: end.clone().endOf('day').toDate() }
        }).select(ATTENDANCE_PRESENCE_SELECT)
    ]);

    return {
        boundaryContext: {
            before: recBefore
                ? {
                    exists: true,
                    status: recBefore.status,
                    net_work_hours: recBefore.net_work_hours,
                    total_work_hours: recBefore.total_work_hours,
                    first_in: recBefore.first_in,
                    last_out: recBefore.last_out
                }
                : { exists: false },
            after: recAfter
                ? {
                    exists: true,
                    status: recAfter.status,
                    net_work_hours: recAfter.net_work_hours,
                    total_work_hours: recAfter.total_work_hours,
                    first_in: recAfter.first_in,
                    last_out: recAfter.last_out
                }
                : { exists: false }
        },
        attendanceRecords: rangeAttendance || []
    };
};


// Get Leave Balance
export const getBalance = async (req, res) => {
    try {
        const actor = req.user;
        const currentYear = new Date().getFullYear();
        
        // --- 1. Identify Target Employee ---
        let targetId = actor._id;
        let targetEmployee = actor;

        const { employee_id } = req.query;
        if (employee_id && String(employee_id) !== String(actor._id)) {
            // Role check: Only admin or HOD can see others
            const roleNorm = String(actor.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
            const isAdmin = roleNorm === 'ADMIN';
            const isHOD = roleNorm === 'HOD' || roleNorm === 'HEADOFDEPARTMENT';

            if (!isAdmin && !isHOD) {
                return res.status(403).json({ message: 'Unauthorized to view others balance' });
            }

            // Fetch target info
            const employeeFound = await UserModel.findById(employee_id);
            if (!employeeFound) {
                return res.status(404).json({ message: 'Target employee not found' });
            }

            // HOD specific check: Is the target in their team?
            if (isHOD && !isAdmin) {
                const team = await TeamModel.findOne({ 
                    'members.userId': employeeFound._id,
                    'members': { $elemMatch: { userId: actor._id, role: 'HOD' } }
                });
                if (!team) {
                    return res.status(403).json({ message: 'Employee is not in your team' });
                }
            }

            targetId = employeeFound._id;
            targetEmployee = employeeFound;
        }

        const assignedPolicyIds = getAssignedPolicyIds(targetEmployee);

        // 2. Fetch assigned active policies (global policy catalog)
        let allPolicies = assignedPolicyIds.length > 0
            ? await LeavePolicy.find({
                _id: { $in: assignedPolicyIds },
                status: 'active'
            })
            : [];

        // Recover from stale/deleted policy IDs by mapping existing balances to active policies.
        if (!allPolicies.length) {
            allPolicies = await recoverActivePoliciesFromBalances({
                targetId,
                currentYear,
                assignedPolicyIds
            });

            if (allPolicies.length > 0) {
                await UserModel.updateOne(
                    { _id: targetId },
                    {
                        $addToSet: {
                            'leave_settings.special_leave_policies': {
                                $each: allPolicies.map((p) => p._id)
                            }
                        }
                    }
                );
            }
        }

        // Keep LWP available for everyone, even if no leave policy is assigned.
        const lwpPolicy = await getAnyActiveLwpPolicy();
        if (lwpPolicy && !allPolicies.some((p) => String(p.leave_type || '').toLowerCase() === 'lwp')) {
            allPolicies.push(lwpPolicy);
        }

        allPolicies = dedupeBalancePolicies(allPolicies);

        console.log('[Leave Balance] Found', allPolicies.length, 'active policies');

        if (!allPolicies || allPolicies.length === 0) {
            console.log('[Leave Balance] No active policies found');
            return res.json({ data: [] });
        }

        // --- FILTER BY ELIGIBILITY (CASE-INSENSITIVE) ---
        let policies = filterEligiblePolicies(allPolicies, targetEmployee);

        // Keep LWP or policies explicitly assigned
        policies = policies.filter((policy) => 
            assignedPolicyIds.includes(String(policy._id)) || 
            String(policy.leave_type || '').toLowerCase() === 'lwp'
        );

        // If only LWP is there (or nothing), try to recover from previous balances
        if (policies.length <= 1 && (!policies[0] || String(policies[0].leave_type || '').toLowerCase() === 'lwp')) {
            const recoveredPolicies = await recoverActivePoliciesFromBalances({
                targetId,
                currentYear,
                assignedPolicyIds
            });

            if (recoveredPolicies.length > 0) {
                policies = filterEligiblePolicies(recoveredPolicies, targetEmployee);
                if (policies.length > 0) {
                    await UserModel.updateOne(
                        { _id: targetId },
                        {
                            $addToSet: {
                                'leave_settings.special_leave_policies': {
                                    $each: policies.map((p) => p._id)
                                }
                            }
                        }
                    );
                }
            }

            // Ensure LWP is there even after recovery
            if (!policies.some(p => String(p.leave_type || '').toLowerCase() === 'lwp') && lwpPolicy) {
                policies.push(lwpPolicy);
            }
        }

        policies = dedupeBalancePolicies(policies);

        console.log('[Leave Balance] After eligibility filter:', policies.length, 'eligible policies');

        if (policies.length === 0) {
            console.log('[Leave Balance] No eligible policies after filtering. User employment_type:', targetEmployee.employment_type, 'gender:', targetEmployee.gender);
            return res.json({ data: [] });
        }

        // 2. Fetch User's Balances
        const balances = await LeaveBalance.find({
            employee_id: targetId,
            year: currentYear
        });

        const yearStart = moment.utc(`${currentYear}-01-01`).startOf('day').toDate();
        const yearEnd = moment.utc(`${currentYear}-12-31`).endOf('day').toDate();
        const usedAgg = await LeaveApplication.aggregate([
            {
                $match: {
                    employee_id: new mongoose.Types.ObjectId(targetId),
                    approval_status: 'approved',
                    from_date: { $lte: yearEnd },
                    to_date: { $gte: yearStart }
                }
            },
            {
                $group: {
                    _id: '$leave_policy_id',
                    used: { $sum: '$total_days' }
                }
            }
        ]);
        const usedByPolicy = new Map(usedAgg.map((row) => [String(row._id), Number(row.used || 0)]));

        // 3. Merge Policies with Balances
        const formattedData = policies.map(policy => {
            const userBalance = pickBalanceForPolicy(balances, policy);

            // Determine if this is an unpaid policy (LWP)
            const isUnpaidPolicy = String(policy?.leave_type || '').toLowerCase() === 'lwp';

            // Extract balance values
            const openingBalance = userBalance?.opening_balance ?? getDefaultOpeningBalance(policy);
            const used = userBalance?.used ?? userBalance?.consumed ?? usedByPolicy.get(String(policy._id)) ?? 0;
            const pending = userBalance?.pending ?? userBalance?.pending_approval ?? 0;

            // Balance Info
            const availableFromPending = isUnpaidPolicy ? 0 : resolveAvailableFromBalance(userBalance);
            
            return {
                _id: policy._id,
                leave_type: policy.leave_type,
                name: policy.policy_name,
                leave_code: policy.leave_code,

                // Policy Rules
                policy: {
                    document_required_after_days: policy.rules?.document_required_after_days || 0,
                    half_day_allowed: policy.rules?.half_day_allowed ?? true
                },

                // Balance Info
                opening_balance: openingBalance,
                used: used,
                pending: isUnpaidPolicy ? 0 : pending,
                available: availableFromPending, // Using pending_approval as the source of truth for available
                balance: availableFromPending,
                closing_balance: availableFromPending, 
                
                // Display helpers
                display: {
                    used: used,
                    total: openingBalance,
                    pending: isUnpaidPolicy ? 0 : pending,
                    remaining: availableFromPending
                }
            };
        });
        console.log('[Leave Balance] Returning', formattedData.length, 'leave types');
        res.json({ data: formattedData });
    } catch (err) {
        console.error('Error in getBalance:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get Leave Applications
export const getApplications = async (req, res) => {
    try {
        const actor = req.user;
        let targetId = actor._id;

        const { employee_id } = req.query;
        if (employee_id && String(employee_id) !== String(actor._id)) {
            const roleNorm = String(actor.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
            const isAdmin = roleNorm === 'ADMIN';
            const isHOD = roleNorm === 'HOD' || roleNorm === 'HEADOFDEPARTMENT';

            if (!isAdmin && !isHOD) {
                return res.status(403).json({ message: 'Unauthorized to view others applications' });
            }
            targetId = employee_id;
        }

        const applications = await LeaveApplication.find({
            employee_id: targetId
        })
            .populate('leave_policy_id', 'leave_type policy_name')
            .populate('final_reviewed_by', 'first_name last_name username role')
            .populate('hod_reviewed_by', 'first_name last_name username role')
            .populate('rejected_by', 'first_name last_name username role')
            .sort({ createdAt: -1 });
        const formattedApps = applications.map(app => {
            const finalReviewer = app.final_reviewed_by;
            const rejectedBy = app.rejected_by;
            const hodReviewer = app.hod_reviewed_by;
            const effectiveReviewer = app.approval_status === 'rejected'
                ? (rejectedBy || finalReviewer || hodReviewer)
                : (finalReviewer || hodReviewer);

            const reviewerName = effectiveReviewer
                ? (effectiveReviewer.first_name
                    ? `${effectiveReviewer.first_name} ${effectiveReviewer.last_name || ''}`.trim()
                    : effectiveReviewer.username)
                : null;

            const reviewerRole = effectiveReviewer
                ? String(effectiveReviewer.role || '').toUpperCase().replace(/[^A-Z]/g, '')
                : null;

            return {
            _id: app._id,
            leave_type: app.leave_policy_id ? app.leave_policy_id.leave_type : app.leave_type || 'Unknown',
            from_date: app.from_date,
            to_date: app.to_date,
            total_days: app.total_days,
            is_half_day: app.is_half_day || false,
            half_day_session: app.half_day_session || '',
            attachment_urls: app.attachment_urls || [],
            reason: app.reason || '',
            status: getRequesterStatus(app.approval_status),
            createdAt: app.createdAt,
            rejection_reason: app.rejection_reason || null,
            reviewer_remark: app.rejection_reason || app.final_review_comment || app.hod_review_comment || app.comments || '',
            reviewed_by: reviewerName,
            reviewed_by_role: reviewerRole,
            reviewed_at: app.final_reviewed_at || app.rejected_at || app.hod_reviewed_at || app.updatedAt
            };
        });
        res.json({ data: formattedApps });
    } catch (err) {
        console.error('Error in getApplications:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Preview for Leave (Smart Calculation)
export const previewLeave = async (req, res) => {
    try {
        const actor = req.user;
        const { leave_policy_id, from_date, to_date, is_half_day, is_start_half_day, is_end_half_day, start_half_session, end_half_session, employee_id } = req.query;

        let targetId = actor._id;
        if (employee_id && String(employee_id) !== String(actor._id)) {
            const roleNorm = String(actor.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
            const isAdmin = roleNorm === 'ADMIN';
            const isHOD = roleNorm === 'HOD' || roleNorm === 'HEADOFDEPARTMENT';

            if (!isAdmin && !isHOD) {
                return res.status(403).json({ message: 'Unauthorized to preview for others' });
            }
            targetId = employee_id;
        }

        if (!leave_policy_id || !from_date) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }

        const targetUser = await UserModel.findById(targetId);
        if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

        const policy = await LeavePolicy.findById(leave_policy_id);
        if (!policy) return res.status(404).json({ message: 'Policy not found' });

        const actualToDate = to_date || from_date;

        // Resolve Week-Off and Holiday policies for accuracy
        const { weekOffPolicy, holidayPolicy } = await PolicyResolver.resolveAll(targetUser, moment(from_date).year());

        // Overlap Check
        const hasOverlap = await checkOverlap(targetId, from_date, actualToDate);
        if (hasOverlap) {
            return res.status(400).json({ success: false, message: 'You already have a leave application for these dates.' });
        }

        const attendanceContext = await buildAttendanceContext({
            employeeId: targetId,
            fromDate: from_date,
            toDate: actualToDate
        });

        const result = await LeaveCalculationService.calculateLeaveDays({
            fromDate: from_date,
            toDate: actualToDate,
            isHalfDay: is_half_day === 'true',
            isStartHalfDay: is_start_half_day === 'true',
            isEndHalfDay: is_end_half_day === 'true',
            startHalfSession: start_half_session || null,
            endHalfSession: end_half_session || null,
            policy,
            company: targetUser.company_id,
            weekOffPolicy,
            holidayPolicy,
            boundaryContext: attendanceContext.boundaryContext,
            attendanceRecords: attendanceContext.attendanceRecords,
            presenceThresholdHours: 4
        });

        const currentYear = new Date().getFullYear();
        const balance = await LeaveBalance.findOne({
            employee_id: targetId,
            leave_policy_id: policy._id,
            year: currentYear
        });

        const closing = Number(balance?.closing_balance || (Number(balance?.opening_balance || 0) - Number(balance?.used || 0)));
        const isLwpPolicy = String(policy?.leave_type || '').toLowerCase() === 'lwp';
        const primaryBalance = isLwpPolicy ? 0 : closing;

        res.json({
            success: true,
            data: {
                ...result,
                available: primaryBalance,
                projected_balance: isLwpPolicy
                    ? 0
                    : Math.max(0, primaryBalance - Number(result.totalDays || 0))
            }
        });
    } catch (err) {
        console.error('Preview error:', err);
        res.status(500).json({ message: 'Error calculating leave preview' });
    }
};

// Apply for Leave
export const applyLeave = async (req, res) => {
    try {
        const actor = req.user;
        const { leave_policy_id, from_date, to_date, reason, employee_id, is_half_day, is_start_half_day, is_end_half_day, start_half_session, end_half_session } = req.body;

        let targetId = actor._id;
        let user = actor;

        if (employee_id && String(employee_id) !== String(actor._id)) {
            const roleNorm = String(actor.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
            const isAdmin = roleNorm === 'ADMIN';
            const isHOD = roleNorm === 'HOD' || roleNorm === 'HEADOFDEPARTMENT';

            if (!isAdmin && !isHOD) {
                return res.status(403).json({ message: 'Unauthorized to apply for others' });
            }

            const employeeFound = await UserModel.findById(employee_id);
            if (!employeeFound) return res.status(404).json({ message: 'Employee not found' });
            
            targetId = employeeFound._id;
            user = employeeFound;
        }

        const currentYear = new Date().getFullYear();

        // Robust ID extraction
        const companyId = user.company_id?._id || user.company_id;
        const departmentId = user.department_id?._id || user.department_id;
        
        // 1. Validate Input
        if (!leave_policy_id || !from_date || !to_date || !reason) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const assignedPolicyIds = getAssignedPolicyIds(user);

        let policy = await LeavePolicy.findOne({
            _id: leave_policy_id,
            status: 'active'
        });
        if (!policy) {
            return res.status(404).json({ message: 'Leave policy not found or inactive' });
        }

        if (!assignedPolicyIds.includes(String(policy._id))) {
            const isLwpPolicy = String(policy.leave_type || '').toLowerCase() === 'lwp';

            if (isLwpPolicy) {
                await UserModel.updateOne(
                    { _id: user._id },
                    { $addToSet: { 'leave_settings.special_leave_policies': policy._id } }
                );
            }

            const hasMatchingBalance = await LeaveBalance.exists({
                employee_id: user._id,
                year: currentYear,
                $or: [
                    { leave_policy_id: policy._id },
                    { leave_type: policy.leave_type }
                ]
            });

            if (!hasMatchingBalance && !isLwpPolicy) {
                return res.status(403).json({ message: 'Selected leave policy is not assigned to this user' });
            }

            if (hasMatchingBalance && !isLwpPolicy) {
                await UserModel.updateOne(
                    { _id: user._id },
                    { $addToSet: { 'leave_settings.special_leave_policies': policy._id } }
                );
            }
        }

        // Overlap Check
        const hasOverlap = await checkOverlap(targetId, from_date, to_date);
        if (hasOverlap) {
            return res.status(400).json({ message: 'You already have a leave application for these dates.' });
        }

        // Fetch attendance context for sandwich and day-level presence checks
        const start = moment(from_date).startOf('day');
        const end = moment(to_date).endOf('day');
        const attendanceContext = await buildAttendanceContext({
            employeeId: targetId,
            fromDate: from_date,
            toDate: to_date
        });

        // Resolve Policies
        const { weekOffPolicy, holidayPolicy } = await PolicyResolver.resolveAll(user, start.year());

        const isHalfDay = is_half_day === 'true' || is_half_day === true;
        const isStartHalfDay = is_start_half_day === 'true' || is_start_half_day === true;
        const isEndHalfDay = is_end_half_day === 'true' || is_end_half_day === true;

        const calc = await LeaveCalculationService.calculateLeaveDays({
            fromDate: from_date,
            toDate: to_date,
            isHalfDay,
            isStartHalfDay,
            isEndHalfDay,
            startHalfSession: start_half_session || null,
            endHalfSession: end_half_session || null,
            policy,
            company: companyId,
            weekOffPolicy,
            holidayPolicy,
            boundaryContext: attendanceContext.boundaryContext,
            attendanceRecords: attendanceContext.attendanceRecords,
            presenceThresholdHours: 4
        });

        const total_days = calc.totalDays;

       
        if (total_days <= 0) {
            return res.status(400).json({ message: 'Invalid date range or no working days selected' });
        }

        // const start = moment(from_date).startOf('day');
        // const end = moment(isHalfDay ? from_date : to_date).endOf('day');

        // 4. Check Balance (or Create it if missing)
        console.log(`[DEBUG] applyLeave start - PolicyID: ${leave_policy_id}, EmployeeID: ${employee_id || actor._id}`);
        let balanceRecord = await findBalanceForPolicy({
            employeeId: user._id,
            year: currentYear,
            policy
        });
        console.log(`[DEBUG] Found balanceRecord: ${balanceRecord ? 'YES' : 'NO'}`);
        if (balanceRecord) {
            console.log(`[DEBUG] balanceRecord data: pending_approval=${balanceRecord.pending_approval}, leave_type=${balanceRecord.leave_type}`);
        }

        if (!balanceRecord) {
            const quota = getDefaultOpeningBalance(policy);
            
            balanceRecord = new LeaveBalance({
                company_id: companyId,
                employee_id: user._id,
                leave_policy_id: policy._id,
                leave_type: policy.leave_type,
                year: currentYear,
                opening_balance: quota,
                closing_balance: quota,
                used: 0,
                pending_approval: quota
            });
            await balanceRecord.save();
        }

        let isUnpaidLeave = String(policy.leave_type || '').toLowerCase() === 'lwp';
        let wasAutoConvertedToLwp = false;

        if (!isUnpaidLeave) {
            const syncedAvailable = resolveAvailableFromBalance(balanceRecord);
            if (Number(balanceRecord.pending_approval || 0) !== syncedAvailable) {
                balanceRecord.pending_approval = syncedAvailable;
                balanceRecord.closing_balance = syncedAvailable;
                await balanceRecord.save();
            }
        }

        let availableBalance = isUnpaidLeave ? Number.MAX_SAFE_INTEGER : resolveAvailableFromBalance(balanceRecord);

        // Auto-convert insufficient paid leave requests to LWP.
        if (!isUnpaidLeave && availableBalance < total_days) {
            let lwpPolicy = await LeavePolicy.findOne({
                _id: { $in: assignedPolicyIds },
                status: 'active',
                leave_type: 'lwp'
            });

            if (!lwpPolicy) {
                lwpPolicy = await getAnyActiveLwpPolicy();
            }

            if (!lwpPolicy) {
                return res.status(400).json({
                    message: `Insufficient leave balance. Available: ${availableBalance}, Required: ${total_days}`
                });
            }

            await UserModel.updateOne(
                { _id: user._id },
                { $addToSet: { 'leave_settings.special_leave_policies': lwpPolicy._id } }
            );

            policy = lwpPolicy;
            isUnpaidLeave = true;
            wasAutoConvertedToLwp = true;

            balanceRecord = await findBalanceForPolicy({
                employeeId: user._id,
                year: currentYear,
                policy
            });

            if (!balanceRecord) {
                const quota = getDefaultOpeningBalance(policy);
                balanceRecord = new LeaveBalance({
                    company_id: companyId,
                    employee_id: user._id,
                    leave_policy_id: policy._id,
                    leave_type: policy.leave_type,
                    year: currentYear,
                    opening_balance: quota,
                    closing_balance: quota,
                    used: 0,
                    pending_approval: quota
                });
                await balanceRecord.save();
            }

            const lwpOpening = Number(balanceRecord.opening_balance || 0);
            const lwpUsed = Number(balanceRecord.used || 0);
            availableBalance = Math.max(0, lwpOpening - lwpUsed);
        }

        // 5. Check for Overlapping Applications
        const overlapping = await LeaveApplication.findOne({
            employee_id: user._id,
            approval_status: { $in: ['pending', 'approved'] },
            $or: [
                { from_date: { $lte: end.toDate() }, to_date: { $gte: start.toDate() } }
            ]
        });

        if (overlapping) {
            return res.status(400).json({
                message: 'You have an overlapping leave application'
            });
        }

        // 6. Get user's team_id (if member of any team)
        let teamId = null;
        let assignedStage = 'stage_1_hod';
        let currentApproverId = null;
        let approvalChain = [];
        const actorUsername = String(user.username || '').toLowerCase();
        try {
            const userTeam = await TeamModel.findOne({
                'members.userId': user._id,
                isActive: { $ne: false }
            });
            if (userTeam) {
                teamId = userTeam._id;
                currentApproverId = userTeam.hodId || null;
            }
        } catch (err) {
            console.log('[Leave] Could not fetch team_id:', err.message);
        }

        const shaliniUser = await getShaliniApprover(companyId);
        if (!shaliniUser) {
            return res.status(400).json({
                message: `Unable to route leave approval: ${STAGE_2_APPROVER_USERNAME} is not configured`
            });
        }

        const isHodApplicant = isHodRole(user.role);
        const isStage2OrFinalAdminApplicant = actorUsername === STAGE_2_APPROVER_USERNAME || STAGE_3_FINAL_APPROVER_USERNAMES.has(actorUsername);

        if (isHodApplicant || isStage2OrFinalAdminApplicant) {
            assignedStage = 'stage_2_shalini';
            currentApproverId = shaliniUser._id;
        }

        if (!currentApproverId) {
            return res.status(400).json({
                message: 'Unable to route leave approval: no active Team HOD assigned for this employee'
            });
        }

        approvalChain = [
            {
                level: 1,
                stage: 'stage_1_hod',
                approver_id: currentApproverId,
                approver_role: 'HOD',
                action: assignedStage === 'stage_1_hod' ? 'pending' : 'approved',
                action_date: assignedStage === 'stage_1_hod' ? undefined : new Date(),
                comments: assignedStage === 'stage_1_hod' ? undefined : 'Stage skipped for HOD/admin requester'
            },
            {
                level: 2,
                stage: 'stage_2_shalini',
                approver_id: shaliniUser._id,
                approver_username: STAGE_2_APPROVER_USERNAME,
                approver_role: 'ADMIN',
                action: assignedStage === 'stage_2_shalini' ? 'pending' : 'pending'
            },
            {
                level: 3,
                stage: 'stage_3_final',
                approver_role: 'ADMIN',
                action: 'pending',
                comments: 'Final approver group: manu_pillai, suraj_rajan, rajan_aranamkatte'
            }
        ]
            .map((step) => ({
                ...step,
                action: ['pending', 'approved', 'rejected'].includes(step.action) ? step.action : 'pending'
            }))
            .filter((step) => step.action);

        // --- TRANSACTION START ---
        // session.startTransaction(); removed to support standalone MongoDB
        try {
            console.log('[DEBUG] Re-verifying balance...');
            const currentBalance = await LeaveBalance.findById(balanceRecord._id);
            console.log('[DEBUG] Current balance found:', currentBalance ? 'YES' : 'NO');
            
            const currentAvailable = isUnpaidLeave ? Number.MAX_SAFE_INTEGER : resolveAvailableFromBalance(currentBalance);

            if (!isUnpaidLeave && Number(currentBalance.pending_approval) !== currentAvailable) {
                currentBalance.pending_approval = currentAvailable;
                currentBalance.closing_balance = currentAvailable;
                await currentBalance.save();
            }

            if (!isUnpaidLeave && currentAvailable < total_days) {
                throw new Error(`Insufficient balance during transaction. Available: ${currentAvailable}`);
            }

            console.log('[DEBUG] Creating application...');
            // 7. Create Application
            const application = new LeaveApplication({
                employee_id: user._id,
                company_id: companyId,
                department_id: departmentId,
                // team_id: teamId,
                leave_policy_id: policy._id,
                leave_type: policy.leave_type,
                from_date: start.toDate(),
                to_date: end.toDate(),
                total_days,
                reason,
                is_half_day: isHalfDay,
                is_start_half_day: isStartHalfDay,
                is_end_half_day: isEndHalfDay,
                start_half_session: isStartHalfDay ? start_half_session : null,
                end_half_session: isEndHalfDay ? end_half_session : null,
                contact_during_leave: req.body.contact_during_leave,
                emergency_contact: req.body.emergency_contact,
                is_lop: policy.deduction_rules?.deduct_from_salary || false,
                approval_status: 'pending',
                approval_stage: assignedStage,
                current_approver_id: currentApproverId,
                approval_chain: approvalChain,
                application_number: `LA-${Date.now()}-${user._id.toString().slice(-4)}`,
                attachment_urls: req.file ? [`uploads/leaves/${req.file.filename}`] : [],
                // Snapshot for audit
                balance_snapshot: {
                    available: currentAvailable,
                    used: currentBalance.used || 0,
                    pending: currentBalance.pending_approval
                },
                sandwich_dates: calc.sandwichDays > 0 ? calc.details.filter(d => d.sandwiched).map(d => new Date(d.date)) : [],
                sandwich_days_count: calc.sandwichDays,
                breakdown: calc.breakdown
            });
            
            if (isHalfDay && req.body.half_day_session) {
                application.half_day_session = req.body.half_day_session;
            }

            console.log('[DEBUG] Saving application...');
            await application.save();
            console.log('[DEBUG] Application saved.');

            // 8. Update Balance (Deduct from Pending/Available)
            console.log('[DEBUG] Updating currentBalance...');
            if (!isUnpaidLeave) {
                currentBalance.pending_approval -= total_days;
            }
            currentBalance.closing_balance = Math.max(0, Number(currentBalance.pending_approval || 0));
            console.log('[DEBUG] Saving balance...');
            await currentBalance.save();
            console.log('[DEBUG] Balance saved.');

            res.json({
                success: true,
                message: wasAutoConvertedToLwp
                    ? 'Leave application submitted successfully as LWP due to insufficient balance'
                    : 'Leave application submitted successfully',
                application_id: application._id
            });
        } catch (error) {
            console.error('[Transaction Error] Leave application failed:', error.message);
            res.status(400).json({ message: error.message || 'Leave application failed due to a system error' });
        }
    } catch (err) {
        console.error('Error in applyLeave:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Cancel Leave (Full or Partial)
export const cancelLeave = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const {
            cancel_type = 'full',       // 'full' | 'partial'
            cancel_from,                // ISO date string for partial start
            cancel_to,                  // ISO date string for partial end
            cancellation_reason = ''
        } = req.body;

        const roleNorm = String(user.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
        const isAdmin = roleNorm === 'ADMIN';
        const isHOD = roleNorm === 'HOD' || roleNorm === 'HEADOFDEPARTMENT';

        // Build query — admins/HODs can cancel on behalf of employees
        const query = { _id: id };
        if (!isAdmin && !isHOD) {
            query.employee_id = user._id;
        }

        const application = await LeaveApplication.findOne(query);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Only pending or approved leaves can be cancelled
        if (!['pending', 'approved'].includes(application.approval_status)) {
            return res.status(400).json({
                message: 'Only pending or approved leaves can be cancelled'
            });
        }

        const wasApprovedLeave = String(application.approval_status || '') === 'approved';

        // Payroll cutoff guard: can't cancel leaves processed in payroll
        if (application.payroll_status === 'processed') {
            return res.status(400).json({
                message: 'This leave has already been processed in payroll and cannot be cancelled'
            });
        }

        // Date-based cutoff: leaves starting more than 30 days ago cannot be cancelled
        const CUTOFF_DAYS = 30;
        const cutoffDate = moment().subtract(CUTOFF_DAYS, 'days').startOf('day');
        if (moment(application.from_date).isBefore(cutoffDate)) {
            return res.status(400).json({
                message: `Cannot cancel leaves that started more than ${CUTOFF_DAYS} days ago`
            });
        }

        const currentYear = new Date().getFullYear();
        const isLwp = String(application.leave_type || '').toLowerCase() === 'lwp';

        // Find balance record
        const balanceRecord = await LeaveBalance.findOne({
            employee_id: application.employee_id,
            year: currentYear,
            $or: [
                { leave_policy_id: application.leave_policy_id },
                { leave_type: application.leave_type }
            ]
        }).sort({ updatedAt: -1, createdAt: -1 });

        // ── PARTIAL CANCELLATION (Split Approach) ──────────────────────────────
        if (cancel_type === 'partial' && cancel_from && cancel_to) {
            const origStart = moment(application.from_date).startOf('day');
            const origEnd   = moment(application.to_date).startOf('day');
            const cancelStart = moment(cancel_from).startOf('day');
            const cancelEnd   = moment(cancel_to).startOf('day');

            if (cancelStart.isBefore(origStart) || cancelEnd.isAfter(origEnd)) {
                return res.status(400).json({ message: 'Cancel range must be within the leave date range' });
            }
            if (cancelStart.isAfter(cancelEnd)) {
                return res.status(400).json({ message: 'Cancel start date must be before or equal to end date' });
            }

            // Calculate cancelled days proportionally from original total_days
            const totalRangeDays   = origEnd.diff(origStart, 'days') + 1;
            const cancelRangeDays  = cancelEnd.diff(cancelStart, 'days') + 1;
            const cancelledDays    = Math.max(
                0.5,
                Math.round((cancelRangeDays / totalRangeDays) * application.total_days * 2) / 2
            );

            // Create the CANCELLED sub-record for the cancelled portion
            const cancelledRecord = new LeaveApplication({
                employee_id: application.employee_id,
                company_id:  application.company_id,
                department_id: application.department_id,
                leave_policy_id: application.leave_policy_id,
                leave_type: application.leave_type,
                from_date: cancelStart.toDate(),
                to_date:   cancelEnd.toDate(),
                total_days: cancelledDays,
                reason: application.reason,
                is_half_day: false,
                approval_status: 'cancelled',
                approval_stage: application.approval_stage,
                current_approver_id: application.current_approver_id,
                approval_chain: application.approval_chain,
                cancelled_by: user._id,
                cancelled_at: new Date(),
                cancellation_reason: cancellation_reason || 'Partial cancellation',
                is_partial_cancellation: true,
                parent_leave_id: application._id,
                application_number: `LA-PC-${Date.now()}-${String(application.employee_id).slice(-4)}`
            });
            await cancelledRecord.save();

            // Update the original record based on WHERE the cancelled sub-range falls
            const cancellingEntireRange = cancelStart.isSame(origStart) && cancelEnd.isSame(origEnd);
            const cancellingFromStart   = cancelStart.isSame(origStart);
            const cancellingFromEnd     = cancelEnd.isSame(origEnd);

            if (cancellingEntireRange) {
                // Effectively a full cancel through the partial path
                application.approval_status = 'cancelled';
                application.cancelled_by   = user._id;
                application.cancelled_at   = new Date();
                application.cancellation_reason = cancellation_reason || 'Full cancellation via partial';
            } else if (cancellingFromStart) {
                // Advance the from_date past the cancelled portion
                application.from_date  = cancelEnd.clone().add(1, 'day').toDate();
                application.total_days = Math.max(
                    0.5,
                    Math.round((application.total_days - cancelledDays) * 2) / 2
                );
            } else if (cancellingFromEnd) {
                // Retreat the to_date before the cancelled portion
                application.to_date    = cancelStart.clone().subtract(1, 'day').toDate();
                application.total_days = Math.max(
                    0.5,
                    Math.round((application.total_days - cancelledDays) * 2) / 2
                );
            } else {
                // Cancelling from the middle — keep original for the first portion,
                // create a new active remainder record for the trailing portion
                const trailingStartDate = cancelEnd.clone().add(1, 'day').toDate();
                const trailingRangeDays = origEnd.diff(cancelEnd, 'days');
                const trailingDays = Math.max(
                    0.5,
                    Math.round((trailingRangeDays / totalRangeDays) * application.total_days * 2) / 2
                );

                const remainderRecord = new LeaveApplication({
                    employee_id: application.employee_id,
                    company_id:  application.company_id,
                    department_id: application.department_id,
                    leave_policy_id: application.leave_policy_id,
                    leave_type: application.leave_type,
                    from_date: trailingStartDate,
                    to_date:   origEnd.toDate(),
                    total_days: trailingDays,
                    reason: application.reason,
                    is_half_day: false,
                    approval_status: application.approval_status,
                    approval_stage:  application.approval_stage,
                    current_approver_id: application.current_approver_id,
                    approval_chain: application.approval_chain,
                    is_split_remainder: true,
                    parent_leave_id: application._id,
                    application_number: `LA-SP-${Date.now()}-${String(application.employee_id).slice(-4)}`
                });
                await remainderRecord.save();

                // Shrink original to the first (leading) portion only
                const leadingRangeDays = cancelStart.diff(origStart, 'days');
                const leadingDays = Math.max(
                    0.5,
                    Math.round((leadingRangeDays / totalRangeDays) * application.total_days * 2) / 2
                );
                application.to_date    = cancelStart.clone().subtract(1, 'day').toDate();
                application.total_days = leadingDays;
            }
            await application.save();

            // Restore exactly the cancelled days to balance.
            // For approved leaves, also rollback the used counter.
            if (balanceRecord && !isLwp) {
                if (wasApprovedLeave) {
                    balanceRecord.used = Math.max(0, Number(balanceRecord.used || 0) - cancelledDays);
                }
                balanceRecord.pending_approval = (Number(balanceRecord.pending_approval) || 0) + cancelledDays;
                balanceRecord.closing_balance  = Math.max(0, Number(balanceRecord.pending_approval || 0));
                await balanceRecord.save();
            }

            return res.json({
                message: `Partial cancellation successful. ${cancelledDays} day(s) cancelled and restored to balance.`,
                cancelled_days: cancelledDays
            });
        }

        // ── FULL CANCELLATION ──────────────────────────────────────────────────
        const daysToRestore = application.total_days;

        application.approval_status     = 'cancelled';
        application.cancelled_by        = user._id;
        application.cancelled_at        = new Date();
        if (cancellation_reason) application.cancellation_reason = cancellation_reason;
        await application.save();

        if (balanceRecord && !isLwp) {
            if (wasApprovedLeave) {
                balanceRecord.used = Math.max(0, Number(balanceRecord.used || 0) - daysToRestore);
            }
            balanceRecord.pending_approval = (Number(balanceRecord.pending_approval) || 0) + daysToRestore;
            balanceRecord.closing_balance  = Math.max(0, Number(balanceRecord.pending_approval || 0));
            await balanceRecord.save();
        }

        return res.json({
            message: 'Leave application cancelled successfully',
            cancelled_days: daysToRestore
        });

    } catch (err) {
        console.error('Error in cancelLeave:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Admin - Update Leave Balance (Create or Modify)
export const updateBalance = async (req, res) => {
    try {
        console.log('[Leave Update] Request received for employee:', req.params.employee_id, 'Body:', req.body);
        const admin = req.user;
        const { employee_id } = req.params;
        const { leave_policy_id, opening_balance, pending_approval, used, pending } = req.body;
        const normalizedPending = pending_approval !== undefined ? pending_approval : pending;

        const openingNum = Number(opening_balance);
        const usedNum = used !== undefined ? Number(used) : undefined;
        const pendingNum = normalizedPending !== undefined ? Number(normalizedPending) : undefined;

        // Verify admin has permission
        if (!admin || !['ADMIN', 'Admin'].includes(admin.role)) {
            return res.status(403).json({ message: 'Only admins can update leave balances' });
        }

        // Validate inputs
        if (!employee_id || !leave_policy_id) {
            return res.status(400).json({ message: 'employee_id and leave_policy_id are required' });
        }

        if (!mongoose.Types.ObjectId.isValid(employee_id)) {
            return res.status(400).json({ message: 'Invalid employee_id format' });
        }

        if (!mongoose.Types.ObjectId.isValid(leave_policy_id)) {
            return res.status(400).json({ message: 'Invalid leave_policy_id format' });
        }

        if (opening_balance === undefined || opening_balance === null) {
            return res.status(400).json({ message: 'opening_balance is required' });
        }

        if (!Number.isFinite(openingNum)) {
            return res.status(400).json({ message: 'opening_balance must be a valid number' });
        }
        if (used !== undefined && !Number.isFinite(usedNum)) {
            return res.status(400).json({ message: 'used must be a valid number' });
        }
        if (normalizedPending !== undefined && !Number.isFinite(pendingNum)) {
            return res.status(400).json({ message: 'pending_approval must be a valid number' });
        }

        // Get the current year
        const currentYear = new Date().getFullYear();

        // Get employee to extract company_id
        const employee = await UserModel.findById(employee_id);
        if (!employee) {
            console.error('[Leave Update] Employee not found:', employee_id);
            return res.status(404).json({ message: `Employee with ID ${employee_id} not found` });
        }

        const policy = await LeavePolicy.findOne({ _id: leave_policy_id, status: 'active' });
        if (!policy) {
            console.error('[Leave Update] Policy not found/inactive:', { leave_policy_id, employee: employee.username });
            return res.status(404).json({ message: `Leave policy (ID: ${leave_policy_id}) not found or inactive` });
        }

        // Find or create the leave balance record
        let balanceRecord = await findBalanceForPolicy({
            employeeId: employee_id,
            year: currentYear,
            policy
        });

        const employeeCompanyId = employee.company_id?._id || employee.company_id;
        const resolvedCompanyId =
            employeeCompanyId ||
            balanceRecord?.company_id ||
            policy.company_id?._id ||
            policy.company_id ||
            admin.company_id?._id ||
            admin.company_id;

        const assignedPolicyIds = getAssignedPolicyIds(employee);
        if (!assignedPolicyIds.includes(String(policy._id))) {
            await UserModel.updateOne(
                { _id: employee._id },
                { $addToSet: { 'leave_settings.special_leave_policies': policy._id } }
            );
        }

        if (!balanceRecord) {
            // Create new balance record
            const nextUsed = usedNum !== undefined ? usedNum : 0;
            const nextPending = pendingNum !== undefined ? pendingNum : 0;
            const isUnpaidPolicy = String(policy.leave_type || '').toLowerCase() === 'lwp';
            const actualRemaining = Math.max(0, openingNum - nextUsed);

            if (!isUnpaidPolicy && nextPending > actualRemaining) {
                return res.status(400).json({
                    message: 'Invalid balance: pending cannot exceed remaining paid balance'
                });
            }
            
            balanceRecord = new LeaveBalance({
                employee_id: employee_id,
                ...(resolvedCompanyId ? { company_id: resolvedCompanyId } : {}),
                leave_policy_id: leave_policy_id,
                leave_type: policy.leave_type,
                year: currentYear,
                opening_balance: openingNum,
                used: nextUsed,
                pending_approval: nextPending,
                closing_balance: actualRemaining
            });
        } else {
            // Update existing balance record
            const nextUsed = usedNum !== undefined ? usedNum : (balanceRecord.used ?? 0);
            const nextPending = pendingNum !== undefined ? pendingNum : (balanceRecord.pending_approval || 0);
            const isUnpaidPolicy = String(policy.leave_type || '').toLowerCase() === 'lwp';
            const actualRemaining = Math.max(0, openingNum - nextUsed);

            if (!isUnpaidPolicy && nextPending > actualRemaining) {
                return res.status(400).json({
                    message: 'Invalid balance: pending cannot exceed remaining paid balance'
                });
            }

            balanceRecord.opening_balance = openingNum;
            balanceRecord.used = nextUsed;
            balanceRecord.pending_approval = nextPending;
            if (isIdempotentLeaveType(policy.leave_type) && String(balanceRecord.leave_policy_id || '') !== String(policy._id)) {
                balanceRecord.leave_policy_id = policy._id;
            }
            // Backfill required company_id for legacy records created before this field was mandatory.
            if (resolvedCompanyId && String(balanceRecord.company_id || '') !== String(resolvedCompanyId)) {
                balanceRecord.company_id = resolvedCompanyId;
            }
            
            // Recalculate closing balance (actual remaining only)
            balanceRecord.closing_balance = actualRemaining;
        }

        balanceRecord.last_updated = new Date();
        await balanceRecord.save();

        res.json({
            message: 'Leave balance updated successfully',
            data: {
                employee_id: balanceRecord.employee_id,
                leave_type: balanceRecord.leave_type,
                opening_balance: balanceRecord.opening_balance,
                used: balanceRecord.used,
                pending: balanceRecord.pending_approval,
                pending_approval: balanceRecord.pending_approval,
                closing_balance: balanceRecord.closing_balance,
                year: balanceRecord.year
            }
        });
    } catch (err) {
        console.error('Error in updateBalance:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

/**
 * Get leave balances for multiple employees
 * Used for bulk report exports
 */
export const getBalancesBulk = async (req, res) => {
    try {
        const { employee_ids } = req.query;
        
        if (!employee_ids) {
            return res.status(400).json({ message: 'employee_ids parameter is required' });
        }

        // Parse comma-separated IDs
        const idArray = String(employee_ids)
            .split(',')
            .map(id => id.trim())
            .filter(id => id && mongoose.Types.ObjectId.isValid(id));

        if (idArray.length === 0) {
            return res.status(400).json({ message: 'No valid employee IDs provided' });
        }

        const currentYear = new Date().getFullYear();

        // Fetch all leave balances for the employees in the current year
        const balances = await LeaveBalance.find({
            employee_id: { $in: idArray },
            year: currentYear
        }).lean();

        // Return balances in a format that can be easily consumed
        res.json({ 
            success: true,
            data: balances.map(balance => ({
                employee_id: balance.employee_id.toString(),
                leave_policy_id: balance.leave_policy_id?.toString(),
                leave_type: balance.leave_type,
                opening_balance: balance.opening_balance || 0,
                used: balance.used || 0,
                pending_approval: balance.pending_approval || 0,
                closing_balance: balance.closing_balance || 0,
                year: balance.year
            }))
        });
    } catch (err) {
        console.error('Error in getBalancesBulk:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};