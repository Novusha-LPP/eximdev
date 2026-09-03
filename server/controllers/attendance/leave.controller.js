import LeaveApplication from '../../model/attendance/LeaveApplication.js';
import LeaveBalance from '../../model/attendance/LeaveBalance.js';
import LeavePolicy from '../../model/attendance/LeavePolicy.js';
import UserModel from '../../model/userModel.mjs';
import moment from 'moment-timezone';
import TeamModel from '../../model/teamModel.mjs';
import LeaveCalculationService from '../../services/attendance/LeaveCalculationService.js';
import mongoose from 'mongoose';
import AttendanceRecord from '../../model/attendance/AttendanceRecord.js';
import PolicyResolver from '../../services/attendance/PolicyResolver.js';
import Company from '../../model/attendance/Company.js';
import { isRestrictedAllowedAdmin, getRestrictedEmployeeIds } from '../../utils/attendance/allowedAdminRestriction.mjs';

const STAGE_2_APPROVER_USERNAME = 'shalini_arun';
const STAGE_3_FINAL_APPROVER_USERNAMES = new Set(['manu_pillai', 'suraj_rajan', 'rajan_aranamkatte', 'masood_raza']);

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

const getApproverByUsername = async (username, companyId) => {
    const companyScoped = await UserModel.findOne({
        username,
        company_id: companyId,
        isActive: true
    }).select('_id username role');

    if (companyScoped) return companyScoped;

    return UserModel.findOne({
        username,
        isActive: true
    }).select('_id username role');
};

const getDefaultOpeningBalance = (policy) => {
    const leaveType = String(policy?.leave_type || '').toLowerCase();
    if (leaveType === 'lwp') {
        return 2000;
    }
    return Number(policy?.annual_quota || 0);
};

const resolveAvailableFromBalance = (balanceRecord) => {
    if (!balanceRecord) return 0;

    const pendingApproval = Number(balanceRecord?.pending_approval);
    const opening = Number(balanceRecord?.opening_balance || 0);
    const used = Number(balanceRecord?.used || 0);
    const closing = Number(balanceRecord?.closing_balance);
    const pending = Number.isFinite(pendingApproval) ? pendingApproval : 0;

    if (Number.isFinite(closing)) {
        return Math.max(0, closing);
    }

    return Math.max(0, opening - used - pending);
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

const getAnyActiveLwpPolicy = async (companyId) => {
    const query = {
        leave_type: 'lwp',
        status: 'active'
    };
    if (companyId) {
        query.company_id = companyId;
    }
    return LeavePolicy.findOne(query).sort({ updatedAt: -1, createdAt: -1 });
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

export const syncBalanceFromApplications = async ({ employeeId, year, policy, balanceRecord }) => {
    if (!balanceRecord) {
        return balanceRecord;
    }

    const yearStart = moment.utc(`${year}-01-01`).startOf('day').toDate();
    const yearEnd = moment.utc(`${year}-12-31`).endOf('day').toDate();
    const leaveType = String(policy?.leave_type || '').toLowerCase().trim();
    const match = {
        employee_id: new mongoose.Types.ObjectId(employeeId),
        approval_status: { $in: ['pending', 'approved'] },
        from_date: { $lte: yearEnd },
        to_date: { $gte: yearStart },
        $or: [{ leave_policy_id: policy._id }]
    };

    if (isIdempotentLeaveType(leaveType)) {
        match.$or.push({ leave_type: leaveType });
    }

    const usage = await LeaveApplication.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$approval_status',
                total: { $sum: '$total_days' }
            }
        }
    ]);

    const totals = usage.reduce((acc, row) => {
        acc[row._id] = Number(row.total || 0);
        return acc;
    }, {});

    const user = await UserModel.findById(employeeId).select('company_id').lean();
    const rabsCompany = await Company.findOne({ company_name: /RABS Industries India Private Limited/i });
    const isRabs = rabsCompany && user && String(user.company_id) === String(rabsCompany._id);

    const opening = Number(balanceRecord.opening_balance || 0);
    const approvedCount = Number(totals.approved || 0);
    const pendingCount = Number(totals.pending || 0);

    const used = isRabs ? (approvedCount + pendingCount) : approvedCount;
    const pending = isRabs ? 0 : pendingCount;
    const closing = Math.max(0, opening - used - pending);

    if (
        Number(balanceRecord.used || 0) !== used ||
        Number(balanceRecord.pending_approval || 0) !== pending ||
        Number(balanceRecord.closing_balance || 0) !== closing
    ) {
        balanceRecord.used = used;
        balanceRecord.pending_approval = pending;
        balanceRecord.closing_balance = closing;
        balanceRecord.last_updated = new Date();
        await balanceRecord.save();
    }

    return balanceRecord;
};

const checkOverlap = async (userId, fromDate, toDate, currentAppId = null, tz = 'Asia/Kolkata') => {
    const start = moment.tz(fromDate, 'YYYY-MM-DD', tz).startOf('day').toDate();
    const end = moment.tz(toDate, 'YYYY-MM-DD', tz).endOf('day').toDate();

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

const recoverActivePoliciesFromBalances = async ({ targetId, currentYear, assignedPolicyIds, companyId }) => {
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
        status: 'active',
        ...(companyId ? { company_id: companyId } : {})
    });

    // Check if we are missing any leave types that are in the user's balances
    const balanceLeaveTypes = [...new Set(balances
        .map((b) => String(b.leave_type || '').toLowerCase().trim())
        .filter(Boolean))];

    const recoveredLeaveTypes = new Set(recoveredPolicies.map(p => String(p.leave_type || '').toLowerCase().trim()));
    const missingLeaveTypes = balanceLeaveTypes.filter(type => !recoveredLeaveTypes.has(type));

    if (missingLeaveTypes.length > 0) {
        const additionalPolicies = await LeavePolicy.find({
            status: 'active',
            leave_type: { $in: missingLeaveTypes },
            ...(companyId ? { company_id: companyId } : {})
        });
        recoveredPolicies = [...recoveredPolicies, ...additionalPolicies];
    }

    if (recoveredPolicies.length > 0) {
        return recoveredPolicies;
    }

    if (!balanceLeaveTypes.length) {
        return [];
    }

    recoveredPolicies = await LeavePolicy.find({
        status: 'active',
        leave_type: { $in: balanceLeaveTypes },
        ...(companyId ? { company_id: companyId } : {})
    });

    return recoveredPolicies;
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
    const dayBeforeStr = start.clone().subtract(1, 'day').format('YYYY-MM-DD');
    const dayAfterStr = end.clone().add(1, 'day').format('YYYY-MM-DD');
    const startStr = start.format('YYYY-MM-DD');
    const endStr = end.format('YYYY-MM-DD');

    const [recBefore, recAfter, rangeAttendance] = await Promise.all([
        AttendanceRecord.findOne({ employee_id: employeeId, attendance_date_str: dayBeforeStr }).select(ATTENDANCE_PRESENCE_SELECT),
        AttendanceRecord.findOne({ employee_id: employeeId, attendance_date_str: dayAfterStr }).select(ATTENDANCE_PRESENCE_SELECT),
        AttendanceRecord.find({
            employee_id: employeeId,
            attendance_date_str: { $gte: startStr, $lte: endStr }
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

            if (isHOD && !isAdmin) {
                const teams = await TeamModel.find({
                    'members.userId': employeeFound._id,
                    isActive: { $ne: false }
                });
                const isHodActor = isHodRole(actor.role);
                const hasAccess = teams.some(team => {
                    const isPrimary = team.hodId && team.hodId.toString() === actor._id.toString();
                    const isSecondary = isHodActor && team.members.some(m => m.userId && m.userId.toString() === actor._id.toString());
                    return isPrimary || isSecondary;
                });
                if (!hasAccess) {
                    return res.status(403).json({ message: 'Employee is not in your team' });
                }
            }

            targetId = employeeFound._id;
            targetEmployee = employeeFound;
        }

        if (!targetEmployee.company_id && targetEmployee.company) {
            const matchedCompany = await Company.findOne({
                $or: [
                    { company_name: new RegExp(`^${targetEmployee.company.trim()}$`, 'i') },
                    { name: new RegExp(`^${targetEmployee.company.trim()}$`, 'i') }
                ]
            });
            if (matchedCompany) {
                targetEmployee.company_id = matchedCompany._id;
                await UserModel.updateOne({ _id: targetEmployee._id }, { $set: { company_id: matchedCompany._id } });
            }
        }

        const rabsCompany = await Company.findOne({ company_name: /RABS Industries India Private Limited/i });
        const rabsCompanyId = rabsCompany?._id;
        const targetEmployeeCompanyId = targetEmployee.company_id?._id || targetEmployee.company_id;
        const isRabsUser = rabsCompanyId && String(targetEmployeeCompanyId) === String(rabsCompanyId);

        const assignedPolicyIds = getAssignedPolicyIds(targetEmployee);
        let policies = [];

        if (isRabsUser) {
            // For RABS users, they automatically have access to all active policies created by RABS HR (created_by is not null)
            const rabsPolicies = await LeavePolicy.find({
                company_id: rabsCompanyId,
                status: 'active',
                created_by: { $ne: null }
            });

            policies = filterEligiblePolicies(rabsPolicies, targetEmployee);

            // Auto-assign these policies to targetEmployee's special_leave_policies if not already present
            const toAdd = rabsPolicies.map(p => p._id);
            if (toAdd.length > 0) {
                const missingIds = toAdd.filter(id => !assignedPolicyIds.includes(String(id)));
                if (missingIds.length > 0) {
                    await UserModel.updateOne(
                        { _id: targetId },
                        { $addToSet: { 'leave_settings.special_leave_policies': { $each: missingIds } } }
                    );
                }
            }
        } else {
            // Regular logic for non-RABS users
            let allPolicies = assignedPolicyIds.length > 0
                ? await LeavePolicy.find({
                    _id: { $in: assignedPolicyIds },
                    status: 'active',
                    ...(targetEmployee.company_id ? { company_id: targetEmployee.company_id } : {})
                })
                : [];

            // Recover from stale/deleted policy IDs by mapping existing balances to active policies.
            if (!allPolicies.length) {
                allPolicies = await recoverActivePoliciesFromBalances({
                    targetId,
                    currentYear,
                    assignedPolicyIds,
                    companyId: targetEmployee.company_id
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
            const lwpPolicy = await getAnyActiveLwpPolicy(targetEmployee.company_id);
            if (lwpPolicy && !allPolicies.some((p) => String(p.leave_type || '').toLowerCase() === 'lwp')) {
                allPolicies.push(lwpPolicy);
            }

            allPolicies = dedupeBalancePolicies(allPolicies);

            if (!allPolicies || allPolicies.length === 0) {
                return res.json({ data: [] });
            }

            // --- FILTER BY ELIGIBILITY (CASE-INSENSITIVE) ---
            policies = filterEligiblePolicies(allPolicies, targetEmployee);

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
                    assignedPolicyIds,
                    companyId: targetEmployee.company_id
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
        }

        policies = dedupeBalancePolicies(policies);

        if (policies.length === 0) {
            return res.json({ data: [] });
        }

        // 2. Fetch User's Balances
        const balances = await LeaveBalance.find({
            employee_id: targetId,
            year: currentYear
        });

        // 3. Merge Policies with Balances and sync them in database
        const formattedData = [];
        for (const policy of policies) {
            let userBalance = pickBalanceForPolicy(balances, policy);

            if (!userBalance) {
                const quota = getDefaultOpeningBalance(policy);
                userBalance = new LeaveBalance({
                    company_id: targetEmployee.company_id,
                    employee_id: targetId,
                    leave_policy_id: policy._id,
                    leave_type: policy.leave_type,
                    year: currentYear,
                    opening_balance: quota,
                    used: 0,
                    pending_approval: 0,
                    closing_balance: quota
                });
                await userBalance.save();

                // Sync on first creation to bring in backdated leaves
                userBalance = await syncBalanceFromApplications({
                    employeeId: targetId,
                    year: currentYear,
                    policy,
                    balanceRecord: userBalance
                });
            }

            // Determine if this is an unpaid policy (LWP)
            const isUnpaidPolicy = String(policy?.leave_type || '').toLowerCase() === 'lwp';

            // Extract balance values
            const openingBalance = userBalance?.opening_balance ?? getDefaultOpeningBalance(policy);

            let used = Number(userBalance?.used ?? 0);
            let pending = Number(userBalance?.pending_approval ?? 0);

            if (isRabsUser) {
                // For RABS, used count includes both approved and pending.
                const approvedCount = Number(userBalance?.used ?? 0);
                const pendingCount = Number(userBalance?.pending_approval ?? 0);
                used = approvedCount + pendingCount;
                // Pending represents remaining balance (opening - used)
                pending = Math.max(0, Number(openingBalance || 0) - used);
            }

            // Balance Info
            const availableFromBalance = isRabsUser
                ? pending
                : (isUnpaidPolicy
                    ? Math.max(0, (openingBalance > 1000000 ? 2000 : openingBalance) - used - pending)
                    : Math.max(0, Number(openingBalance || 0) - used - pending));

            formattedData.push({
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
                pending: pending,
                available: availableFromBalance,
                balance: availableFromBalance,
                closing_balance: availableFromBalance,

                // Display helpers
                display: {
                    used: used,
                    total: openingBalance,
                    pending: pending,
                    remaining: availableFromBalance
                }
            });
        }
        // console.log('[Leave Balance] Returning', formattedData.length, 'leave types');
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
        const { employee_id, leaveMonth, appliedMonth } = req.query;

        if (employee_id && String(employee_id) !== String(actor._id)) {
            const roleNorm = String(actor.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
            const isAdmin = roleNorm === 'ADMIN';
            const isHOD = roleNorm === 'HOD' || roleNorm === 'HEADOFDEPARTMENT';

            if (!isAdmin && !isHOD) {
                return res.status(403).json({ message: 'Unauthorized to view others applications' });
            }
            targetId = employee_id;
        }

        const query = { employee_id: targetId };

        const resolvedLeaveMonth = leaveMonth || req.query.month || '';
        const resolvedAppliedMonth = appliedMonth || '';

        if (resolvedLeaveMonth) {
            const startOfMonth = moment(resolvedLeaveMonth, 'YYYY-MM').startOf('month').toDate();
            const endOfMonth = moment(resolvedLeaveMonth, 'YYYY-MM').endOf('month').toDate();
            query.$and = query.$and || [];
            query.$and.push({
                from_date: { $lte: endOfMonth },
                to_date: { $gte: startOfMonth }
            });
        }

        if (resolvedAppliedMonth) {
            const startOfMonth = moment(resolvedAppliedMonth, 'YYYY-MM').startOf('month').toDate();
            const endOfMonth = moment(resolvedAppliedMonth, 'YYYY-MM').endOf('month').toDate();
            query.applied_on = { $gte: startOfMonth, $lte: endOfMonth };
        }

        const applications = await LeaveApplication.find(query)
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

            const approvalStatus = String(app.approval_status || 'pending');
            const approvalStage = app.approval_stage || null;
            const approvalStageLabel = approvalStatus === 'approved'
                ? 'Fully Approved'
                : approvalStatus === 'rejected'
                    ? 'Rejected'
                    : approvalStatus === 'cancelled'
                        ? 'Cancelled'
                        : approvalStatus === 'withdrawn'
                            ? 'Withdrawn'
                            : approvalStatus === 'pending_hod' || approvalStage === 'stage_1_hod'
                                ? 'Pending HOD Approval'
                                : approvalStatus === 'pending_shalini' || approvalStatus === 'hod_approved_pending_admin' || approvalStage === 'stage_2_shalini'
                                    ? 'Approved by HOD'
                                    : approvalStatus === 'pending_final' || approvalStage === 'stage_3_final'
                                        ? 'Pending Final Approval'
                                        : approvalStatus === 'in_review'
                                            ? 'In Review'
                                            : approvalStatus.replace(/_/g, ' ');

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
                final_status: approvalStatus,
                approval_stage: approvalStage,
                approval_stage_label: approvalStageLabel,
                approval_status_label: approvalStageLabel,
                applied_on: app.applied_on || app.createdAt,
                appliedOn: app.applied_on || app.createdAt,
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

        if (!targetUser.company_id && targetUser.company) {
            const matchedCompany = await Company.findOne({
                $or: [
                    { company_name: new RegExp(`^${targetUser.company.trim()}$`, 'i') },
                    { name: new RegExp(`^${targetUser.company.trim()}$`, 'i') }
                ]
            });
            if (matchedCompany) {
                targetUser.company_id = matchedCompany._id;
                await UserModel.updateOne({ _id: targetUser._id }, { $set: { company_id: matchedCompany._id } });
            }
        }

        const policy = await LeavePolicy.findOne({
            _id: leave_policy_id,
            status: 'active',
            ...(targetUser.company_id ? { company_id: targetUser.company_id } : {})
        });
        if (!policy) return res.status(404).json({ message: 'Policy not found' });

        const actualToDate = to_date || from_date;
        const previewCompany = await Company.findById(targetUser.company_id).select('timezone').lean();
        const previewTz = previewCompany?.timezone || 'Asia/Kolkata';

        // Normalize dates to correct timezone before calculation
        const { start: previewStart, end: previewEnd } = normalizeLeaveRangeToTimezone({
            fromDate: from_date,
            toDate: actualToDate,
            isHalfDay: is_half_day === 'true',
            tz: previewTz
        });

        // Resolve Week-Off and Holiday policies for accuracy
        const { weekOffPolicy, holidayPolicy } = await PolicyResolver.resolveAll(targetUser, previewStart.year());

        // Overlap Check
        const hasOverlap = await checkOverlap(targetId, from_date, actualToDate, null, previewTz);
        if (hasOverlap) {
            return res.status(400).json({ success: false, message: 'You already have a leave application for these dates.' });
        }

        const attendanceContext = await buildAttendanceContext({
            employeeId: targetId,
            fromDate: from_date,
            toDate: actualToDate
        });

        const result = await LeaveCalculationService.calculateLeaveDays({
            fromDate: previewStart.format('YYYY-MM-DD'), // Use timezone-normalized date
            toDate: previewEnd.format('YYYY-MM-DD'),     // Use timezone-normalized date
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

        const applicationYear = previewStart.year();
        const balancesForYear = await LeaveBalance.find({
            employee_id: targetId,
            year: applicationYear
        });
        let balance = pickBalanceForPolicy(balancesForYear, policy);

        const isLwpPolicy = String(policy?.leave_type || '').toLowerCase() === 'lwp';
        if (balance) {
            balance = await syncBalanceFromApplications({
                employeeId: targetId,
                year: applicationYear,
                policy,
                balanceRecord: balance
            });
        }

        //const isLwpPolicy = String(policy?.leave_type || '').toLowerCase() === 'lwp';
        // Get available balance (already accounts for pending applications)
        const primaryBalance = isLwpPolicy
            ? Math.max(0, (balance?.opening_balance || 2000) - Number(balance?.used || 0) - Number(balance?.pending_approval || 0))
            : resolveAvailableFromBalance(balance);

        // Calculate projected balance after this leave application
        const projectedBalance = Math.max(0, primaryBalance - Number(result.totalDays || 0));

        res.json({
            success: true,
            data: {
                ...result,
                available: primaryBalance,
                projected_balance: projectedBalance
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
        let companyId = user.company_id?._id || user.company_id;
        const departmentId = user.department_id?._id || user.department_id;

        if (!companyId && user.company) {
            const matchedCompany = await Company.findOne({
                $or: [
                    { company_name: new RegExp(`^${user.company.trim()}$`, 'i') },
                    { name: new RegExp(`^${user.company.trim()}$`, 'i') }
                ]
            });
            if (matchedCompany) {
                companyId = matchedCompany._id;
                user.company_id = matchedCompany._id;
                await UserModel.updateOne({ _id: user._id }, { $set: { company_id: matchedCompany._id } });
            }
        }

        // 1. Validate Input
        if (!leave_policy_id || !from_date || !to_date || !reason) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const assignedPolicyIds = getAssignedPolicyIds(user);

        let policy = await LeavePolicy.findOne({
            _id: leave_policy_id,
            status: 'active',
            company_id: companyId
        });
        if (!policy) {
            return res.status(404).json({ message: 'Leave policy not found or inactive' });
        }

        const rabsCompany = await Company.findOne({ company_name: /RABS Industries India Private Limited/i });
        const rabsCompanyId = rabsCompany?._id;
        const userCompanyId = user.company_id?._id || user.company_id;
        const isRabsUser = rabsCompanyId && String(userCompanyId) === String(rabsCompanyId);

        if (isRabsUser) {
            if (String(policy.company_id) === String(rabsCompanyId)) {
                if (!assignedPolicyIds.includes(String(policy._id))) {
                    await UserModel.updateOne(
                        { _id: user._id },
                        { $addToSet: { 'leave_settings.special_leave_policies': policy._id } }
                    );
                }
            }
        } else if (!assignedPolicyIds.includes(String(policy._id))) {
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

        const company = await Company.findById(companyId).select('timezone').lean();
        const tz = company?.timezone || 'Asia/Kolkata';

        // Overlap Check
        const hasOverlap = await checkOverlap(targetId, from_date, to_date, null, tz);
        if (hasOverlap) {
            return res.status(400).json({ message: 'You already have a leave application for these dates.' });
        }

        // Fetch attendance context for sandwich and day-level presence checks
        const { start, end } = normalizeLeaveRangeToTimezone({
            fromDate: from_date,
            toDate: to_date,
            isHalfDay: is_half_day === 'true' || is_half_day === true,
            tz
        });
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
            fromDate: start.format('YYYY-MM-DD'), // Use the normalized date (already in correct timezone)
            toDate: end.format('YYYY-MM-DD'),     // Use the normalized date (already in correct timezone)
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
        // console.log(`[DEBUG] applyLeave start - PolicyID: ${leave_policy_id}, EmployeeID: ${employee_id || actor._id}`);
        let balanceRecord = await findBalanceForPolicy({
            employeeId: user._id,
            year: currentYear,
            policy
        });
        // console.log(`[DEBUG] Found balanceRecord: ${balanceRecord ? 'YES' : 'NO'}`);
        if (balanceRecord) {
            // console.log(`[DEBUG] balanceRecord data: pending_approval=${balanceRecord.pending_approval}, leave_type=${balanceRecord.leave_type}`);
        }

        if (!balanceRecord) {
            // Before creating a brand-new record, do one final check by leave_type alone
            // (covers the case where the employee has a balance under a DIFFERENT policy_id
            // for the same idempotent leave type, e.g. after a policy was re-assigned).
            const leaveTypeNorm = String(policy.leave_type || '').toLowerCase().trim();
            if (isIdempotentLeaveType(leaveTypeNorm)) {
                balanceRecord = await LeaveBalance.findOne({
                    employee_id: user._id,
                    year: currentYear,
                    leave_type: leaveTypeNorm
                }).sort({ updatedAt: -1, createdAt: -1 });

                if (balanceRecord) {
                    // Align the policy_id on the existing record so future lookups succeed
                    if (String(balanceRecord.leave_policy_id) !== String(policy._id)) {
                        balanceRecord.leave_policy_id = policy._id;
                        await balanceRecord.save();
                    }
                }
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
                    used: 0,
                    pending_approval: 0,
                    closing_balance: quota
                });
                await balanceRecord.save();
                // console.log(`[DEBUG] Created new balance record: opening=${quota}, pending=0, leave_type=${policy.leave_type}`);
            }
        }

        balanceRecord = await syncBalanceFromApplications({
            employeeId: user._id,
            year: currentYear,
            policy,
            balanceRecord
        });

        let isUnpaidLeave = String(policy.leave_type || '').toLowerCase() === 'lwp';
        let availableBalance = isUnpaidLeave ? Number.MAX_SAFE_INTEGER : resolveAvailableFromBalance(balanceRecord);

        // Re-fetch the most recent balance to ensure we have the latest state
        const latestBalance = await LeaveBalance.findById(balanceRecord._id);
        if (latestBalance) {
            balanceRecord = await syncBalanceFromApplications({
                employeeId: user._id,
                year: currentYear,
                policy,
                balanceRecord: latestBalance
            });
            if (!isUnpaidLeave) {
                availableBalance = resolveAvailableFromBalance(balanceRecord);
            }
        }

        if (!isUnpaidLeave && availableBalance < total_days) {
            console.error(`[Leave Apply] Insufficient balance. Policy: ${policy.leave_type}, Available: ${availableBalance}, Required: ${total_days}`);
            return res.status(400).json({
                message: `Insufficient leave balance for selected policy. Available: ${availableBalance}, Required: ${total_days}`
            });
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
        const actorObjectId = user._id?._id || user._id;
        const actorId = normalizeId(actorObjectId);
        let userTeam = null;
        try {
            userTeam = await TeamModel.findOne({
                'members.userId': actorObjectId,
                isActive: { $ne: false }
            });

            if (!userTeam) {
                userTeam = await TeamModel.findOne({
                    isActive: { $ne: false },
                    $or: [
                        { hodId: actorObjectId },
                        { hodUsername: actorUsername }
                    ]
                });
            }

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

        const isActuallyHodOfSomeTeam = await TeamModel.exists({
            isActive: { $ne: false },
            $or: [
                { hodId: actorObjectId },
                { hodUsername: { $regex: new RegExp(`^${actorUsername}$`, 'i') } }
            ]
        });

        const applicantUsername = String(user.username || '').toLowerCase();
        // HOD check: any user with HOD role OR who is actually HOD of some team
        const isHodUser = isHodRole(user.role) || !!isActuallyHodOfSomeTeam;

        // --- CUSTOM ROUTING FOR HOD & ADMINS & RABS ---
        // const rabsCompany = await Company.findOne({ company_name: /RABS Industries India Private Limited/i });
        const isRabs = rabsCompany && String(companyId) === String(rabsCompany._id);

        if (isRabs) {
            const ajithUser = await UserModel.findOne({ username: 'ajith_sivadasan', isActive: true });
            if (!ajithUser) {
                return res.status(400).json({ message: 'Unable to route leave approval: Ajith Sivadasan is not active or configured' });
            }
            assignedStage = 'stage_1_hod';
            currentApproverId = ajithUser._id;
            approvalChain = [
                {
                    level: 1,
                    stage: 'stage_1_hod',
                    approver_id: ajithUser._id,
                    approver_username: 'ajith_sivadasan',
                    approver_role: 'ADMIN',
                    action: 'pending'
                }
            ];
        } else {
            if (applicantUsername === 'uday_zope') {
                // Uday Zope Exception: goes first to punit_pandey (Stage 1) then Shalini (Stage 2)
                const punitUser = await UserModel.findOne({ username: 'punit_pandey', isActive: true });
                if (!punitUser) {
                    return res.status(400).json({ message: 'Unable to route leave approval: punit_pandey is not configured or active' });
                }
                assignedStage = 'stage_1_hod';
                currentApproverId = punitUser._id;
            } else if (applicantUsername === STAGE_2_APPROVER_USERNAME) {
                // Shalini applying -> Goes to other allowed admins except uday_zope (any of manu, suraj, rajan)
                assignedStage = 'stage_3_final';
                currentApproverId = undefined; // Group approval at stage 3
            } else if (STAGE_3_FINAL_APPROVER_USERNAMES.has(applicantUsername)) {
                // Other Stage 3 Admins applying -> Self-approve at Stage 3
                assignedStage = 'stage_3_final';
                currentApproverId = user._id;
            } else if (isHodUser) {
                // Any HOD (with or without hod_id) -> Bypasses Shalini and goes directly to Stage 3 designated Admin approvers
                assignedStage = 'stage_3_final';
                currentApproverId = undefined;
            }

            if (!currentApproverId && assignedStage !== 'stage_3_final') {
                return res.status(400).json({
                    message: 'Unable to route leave approval: no active Team HOD assigned for this employee'
                });
            }

            const isBypassedHod = isHodUser && applicantUsername !== 'uday_zope';
            const isShaliniApplicant = applicantUsername === STAGE_2_APPROVER_USERNAME;
            const isDirectToStage3 = isBypassedHod || isShaliniApplicant;

            approvalChain = [
                {
                    level: 1,
                    stage: 'stage_1_hod',
                    approver_id: isDirectToStage3 ? actorObjectId : (currentApproverId === shaliniUser._id ? actorObjectId : currentApproverId),
                    approver_role: 'HOD',
                    action: isDirectToStage3 ? 'approved' : (assignedStage === 'stage_1_hod' ? 'pending' : 'approved'),
                    action_date: isDirectToStage3 ? new Date() : (assignedStage === 'stage_1_hod' ? undefined : new Date()),
                    comments: isDirectToStage3 ? 'Stage skipped for HOD/admin requester' : (assignedStage === 'stage_1_hod' ? undefined : 'Stage skipped for admin requester')
                },
                {
                    level: 2,
                    stage: 'stage_2_shalini',
                    approver_id: shaliniUser._id,
                    approver_username: STAGE_2_APPROVER_USERNAME,
                    approver_role: 'ADMIN',
                    action: assignedStage === 'stage_1_hod'
                        ? 'pending'
                        : (assignedStage === 'stage_2_shalini' ? 'pending' : 'approved'),
                    action_date: (assignedStage === 'stage_3_final' && !isBypassedHod) ? new Date() : (isBypassedHod ? new Date() : undefined),
                    comments: isBypassedHod ? 'Stage skipped for HOD requester' : (assignedStage === 'stage_3_final' ? 'Stage skipped for senior admin requester' : undefined)
                },
                {
                    level: 3,
                    stage: 'stage_3_final',
                    approver_id: (assignedStage === 'stage_3_final' ? currentApproverId : undefined),
                    approver_role: 'ADMIN',
                    action: 'pending',
                    comments: 'Final approver group'
                }
            ]
                .map((step) => ({
                    ...step,
                    action: ['pending', 'approved', 'rejected'].includes(step.action) ? step.action : 'pending'
                }))
                .filter((step) => step.action);
        }

        // --- TRANSACTION START ---
        // session.startTransaction(); removed to support standalone MongoDB
        try {
            // console.log('[DEBUG] Re-verifying balance...');
            let currentBalance = await LeaveBalance.findById(balanceRecord._id);
            // console.log('[DEBUG] Current balance found:', currentBalance ? 'YES' : 'NO');

            if (!currentBalance) {
                throw new Error('Balance record was unexpectedly deleted during transaction');
            }

            currentBalance = await syncBalanceFromApplications({
                employeeId: user._id,
                year: currentYear,
                policy,
                balanceRecord: currentBalance
            });

            const currentAvailable = isUnpaidLeave ? Number.MAX_SAFE_INTEGER : resolveAvailableFromBalance(currentBalance);
            // console.log(`[DEBUG] Current available balance: ${currentAvailable}, Required: ${total_days}, LeaveType: ${policy.leave_type}`);

            if (!isUnpaidLeave && currentAvailable < total_days) {
                throw new Error(`Insufficient balance during transaction. Available: ${currentAvailable}, Required: ${total_days}`);
            }

            const isManagerApplyingForOther = employee_id && String(employee_id) !== String(actor._id);

            // console.log('[DEBUG] Creating application...');
            // 7. Create Application
            const application = new LeaveApplication({
                employee_id: user._id,
                company_id: companyId,
                department_id: departmentId,
                // team_id: teamId,
                leave_policy_id: policy._id,
                leave_type: policy.leave_type,
                from_date: start.toDate(),
                from_date_str: start.format('YYYY-MM-DD'),
                to_date: end.toDate(),
                to_date_str: end.format('YYYY-MM-DD'),
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
                approval_status: isManagerApplyingForOther ? 'approved' : 'pending',
                approval_stage: isManagerApplyingForOther ? null : assignedStage,
                current_approver_id: isManagerApplyingForOther ? undefined : currentApproverId,
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

            if (isManagerApplyingForOther) {
                application.final_reviewed_by = actor._id;
                application.final_reviewed_at = new Date();
                application.final_review_comment = 'Auto-approved on submission by Admin/HOD';
            }

            // console.log('[DEBUG] Saving application...');
            await application.save();
            // console.log('[DEBUG] Application saved.');

            // 8. Update Balance (Deduct from Pending/Available)
            // console.log('[DEBUG] Updating currentBalance...');
            if (!isUnpaidLeave) {
                if (isManagerApplyingForOther) {
                    currentBalance.used = Number(currentBalance.used || 0) + total_days;
                } else {
                    currentBalance.pending_approval = Number(currentBalance.pending_approval || 0) + total_days;
                }
            }
            currentBalance.closing_balance = isUnpaidLeave
                ? currentBalance.closing_balance
                : Math.max(0, Number(currentBalance.opening_balance || 0) - Number(currentBalance.used || 0) - Number(currentBalance.pending_approval || 0));
            // console.log('[DEBUG] Saving balance...');
            await currentBalance.save();
            // console.log('[DEBUG] Balance saved.');

            // 8b. Update AttendanceRecord directly if leave is auto-approved
            if (isManagerApplyingForOther) {
                let curr = start.clone();
                while (curr.isSameOrBefore(end, 'day')) {
                    const dateStr = curr.format('YYYY-MM-DD');
                    const attDate = moment.utc(dateStr, 'YYYY-MM-DD').startOf('day').toDate();

                    await AttendanceRecord.findOneAndUpdate(
                        { employee_id: user._id, attendance_date: attDate },
                        {
                            employee_id: user._id,
                            company_id: companyId,
                            attendance_date: attDate,
                            attendance_date_str: dateStr,
                            status: isHalfDay ? 'half_day' : 'leave',
                            is_half_day: isHalfDay || false,
                            half_day_session: isHalfDay ? req.body.half_day_session : null,
                            year_month: curr.format('YYYY-MM'),
                            processed_by: 'admin',
                            is_on_leave: true,
                            leave_application_id: application._id
                        },
                        { upsert: true }
                    );
                    curr.add(1, 'day');
                }
            }

            res.json({
                success: true,
                message: 'Leave application submitted and approved successfully',
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

        // Date-based cutoff: leaves starting more than 30 days ago cannot be cancelled (except for Admins and HODs)
        const CUTOFF_DAYS = 30;
        const cutoffDate = moment().subtract(CUTOFF_DAYS, 'days').startOf('day');
        if (!isAdmin && !isHOD && moment(application.from_date).isBefore(cutoffDate)) {
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
            const origStart = moment(application.from_date_str || application.from_date).startOf('day');
            const origEnd = moment(application.to_date_str || application.to_date).startOf('day');
            const cancelStart = moment(cancel_from).startOf('day');
            const cancelEnd = moment(cancel_to).startOf('day');

            if (cancelStart.isBefore(origStart) || cancelEnd.isAfter(origEnd)) {
                return res.status(400).json({ message: 'Cancel range must be within the leave date range' });
            }
            if (cancelStart.isAfter(cancelEnd)) {
                return res.status(400).json({ message: 'Cancel start date must be before or equal to end date' });
            }

            // Calculate cancelled days proportionally from original total_days
            const totalRangeDays = origEnd.diff(origStart, 'days') + 1;
            const cancelRangeDays = cancelEnd.diff(cancelStart, 'days') + 1;
            const cancelledDays = Math.max(
                0.5,
                Math.round((cancelRangeDays / totalRangeDays) * application.total_days * 2) / 2
            );

            // Create the CANCELLED sub-record for the cancelled portion
            const cancelledRecord = new LeaveApplication({
                employee_id: application.employee_id,
                company_id: application.company_id,
                department_id: application.department_id,
                leave_policy_id: application.leave_policy_id,
                leave_type: application.leave_type,
                from_date: cancelStart.toDate(),
                from_date_str: cancelStart.format('YYYY-MM-DD'),
                to_date: cancelEnd.toDate(),
                to_date_str: cancelEnd.format('YYYY-MM-DD'),
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
            const cancellingFromStart = cancelStart.isSame(origStart);
            const cancellingFromEnd = cancelEnd.isSame(origEnd);

            if (cancellingEntireRange) {
                // Effectively a full cancel through the partial path
                application.approval_status = 'cancelled';
                application.cancelled_by = user._id;
                application.cancelled_at = new Date();
                application.cancellation_reason = cancellation_reason || 'Full cancellation via partial';
            } else if (cancellingFromStart) {
                // Advance the from_date past the cancelled portion
                application.from_date = cancelEnd.clone().add(1, 'day').toDate();
                application.total_days = Math.max(
                    0.5,
                    Math.round((application.total_days - cancelledDays) * 2) / 2
                );
            } else if (cancellingFromEnd) {
                // Retreat the to_date before the cancelled portion
                application.to_date = cancelStart.clone().subtract(1, 'day').toDate();
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
                    company_id: application.company_id,
                    department_id: application.department_id,
                    leave_policy_id: application.leave_policy_id,
                    leave_type: application.leave_type,
                    from_date: trailingStartDate,
                    from_date_str: moment(trailingStartDate).format('YYYY-MM-DD'),
                    to_date: origEnd.toDate(),
                    to_date_str: origEnd.format('YYYY-MM-DD'),
                    total_days: trailingDays,
                    reason: application.reason,
                    is_half_day: false,
                    approval_status: application.approval_status,
                    approval_stage: application.approval_stage,
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
                application.to_date = cancelStart.clone().subtract(1, 'day').toDate();
                application.total_days = leadingDays;
            }
            await application.save();

            if (balanceRecord) {
                await syncBalanceFromApplications({
                    employeeId: application.employee_id,
                    year: currentYear,
                    policy: { _id: application.leave_policy_id, leave_type: application.leave_type },
                    balanceRecord
                });
            }

            // Clean up attendance records for the cancelled date range
            try {
                let curr = cancelStart.clone();
                while (curr.isSameOrBefore(cancelEnd, 'day')) {
                    const attDate = moment.utc(curr.format('YYYY-MM-DD'), 'YYYY-MM-DD').startOf('day').toDate();
                    await AttendanceRecord.deleteOne({
                        employee_id: application.employee_id,
                        attendance_date: attDate,
                        status: { $in: ['leave', 'half_day'] },
                        first_in: null,
                        last_out: null
                    });
                    await AttendanceRecord.updateMany(
                        {
                            employee_id: application.employee_id,
                            attendance_date: attDate,
                            first_in: { $ne: null }
                        },
                        {
                            $unset: { half_day_session: 1 }
                        }
                    );
                    curr.add(1, 'day');
                }
            } catch (cleanupErr) {
                console.error('Error cleaning up attendance records on leave cancel:', cleanupErr);
            }

            return res.json({
                message: `Partial cancellation successful. ${cancelledDays} day(s) cancelled and restored to balance.`,
                cancelled_days: cancelledDays
            });
        }

        // ── FULL CANCELLATION ──────────────────────────────────────────────────
        const daysToRestore = application.total_days;

        application.approval_status = 'cancelled';
        application.cancelled_by = user._id;
        application.cancelled_at = new Date();
        if (cancellation_reason) application.cancellation_reason = cancellation_reason;
        await application.save();

        // Clean up attendance records for the full cancelled leave
        try {
            const origStart = moment(application.from_date_str || application.from_date).startOf('day');
            const origEnd = moment(application.to_date_str || application.to_date).startOf('day');
            let curr = origStart.clone();
            while (curr.isSameOrBefore(origEnd, 'day')) {
                const attDate = moment.utc(curr.format('YYYY-MM-DD'), 'YYYY-MM-DD').startOf('day').toDate();
                await AttendanceRecord.deleteOne({
                    employee_id: application.employee_id,
                    attendance_date: attDate,
                    status: { $in: ['leave', 'half_day'] },
                    first_in: null,
                    last_out: null
                });
                await AttendanceRecord.updateMany(
                    {
                        employee_id: application.employee_id,
                        attendance_date: attDate,
                        first_in: { $ne: null }
                    },
                    {
                        $unset: { half_day_session: 1 }
                    }
                );
                curr.add(1, 'day');
            }
        } catch (cleanupErr) {
            console.error('Error cleaning up attendance records on full leave cancel:', cleanupErr);
        }

        if (balanceRecord) {
            await syncBalanceFromApplications({
                employeeId: application.employee_id,
                year: currentYear,
                policy: { _id: application.leave_policy_id, leave_type: application.leave_type },
                balanceRecord
            });
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
        const isAllowedAdmin = admin && (['ADMIN', 'Admin'].includes(admin.role) || admin.isAttendanceAllowedAdmin === true);
        if (!isAllowedAdmin) {
            return res.status(403).json({ message: 'Only admins can update leave balances' });
        }

        // Team restriction for restricted admins
        if (isRestrictedAllowedAdmin(admin)) {
            const allowedIds = await getRestrictedEmployeeIds(admin);
            if (!allowedIds || !allowedIds.includes(String(employee_id))) {
                return res.status(403).json({ message: 'Forbidden: Member not in your team' });
            }
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

        const employeeCompanyId = employee.company_id?._id || employee.company_id;
        const policy = await LeavePolicy.findOne({
            _id: leave_policy_id,
            status: 'active',
            ...(employeeCompanyId ? { company_id: employeeCompanyId } : {})
        });
        if (!policy) {
            console.error('[Leave Update] Policy not found/inactive:', { leave_policy_id, employee: employee.username });
            return res.status(404).json({ message: `Leave policy (ID: ${leave_policy_id}) not found or inactive` });
        }

        const resolvedCompanyId =
            employeeCompanyId ||
            policy.company_id?._id ||
            policy.company_id ||
            admin.company_id?._id ||
            admin.company_id;

        const rabsCompany = await Company.findOne({ company_name: /RABS Industries India Private Limited/i });
        const isRabsUser = rabsCompany && employeeCompanyId && String(employeeCompanyId) === String(rabsCompany._id);

        // Calculate next values
        const nextUsed = usedNum !== undefined ? usedNum : 0;
        const nextPending = isRabsUser ? 0 : (pendingNum !== undefined ? pendingNum : 0);
        const isUnpaidPolicy = String(policy.leave_type || '').toLowerCase() === 'lwp';
        const remainingBeforePending = Math.max(0, openingNum - nextUsed);
        const actualRemaining = isRabsUser ? Math.max(0, openingNum - nextUsed) : Math.max(0, openingNum - nextUsed - nextPending);

        if (!isRabsUser && !isUnpaidPolicy && nextPending > remainingBeforePending) {
            return res.status(400).json({
                message: 'Invalid balance: pending cannot exceed remaining paid balance'
            });
        }

        const assignedPolicyIds = getAssignedPolicyIds(employee);
        if (!assignedPolicyIds.includes(String(policy._id))) {
            await UserModel.updateOne(
                { _id: employee._id },
                { $addToSet: { 'leave_settings.special_leave_policies': policy._id } }
            );
        }

        // For idempotent leave types (privilege, lwp), find by leave_type first to prevent
        // creating a second record when the admin re-assigns a different policy_id.
        const policyLeaveType = String(policy.leave_type || '').toLowerCase().trim();
        const isIdempotentType = IDEMPOTENT_LEAVE_TYPES.has(policyLeaveType);

        let balanceRecord;
        if (isIdempotentType) {
            // Try to find any existing record for this employee+year+leave_type
            const existingByType = await LeaveBalance.findOne({
                employee_id: employee_id,
                year: currentYear,
                leave_type: policyLeaveType
            }).sort({ updatedAt: -1, createdAt: -1 });

            if (existingByType) {
                // Update it in-place (even if leave_policy_id differs)
                balanceRecord = await LeaveBalance.findOneAndUpdate(
                    { _id: existingByType._id },
                    {
                        $set: {
                            leave_policy_id: leave_policy_id,
                            leave_type: policy.leave_type,
                            opening_balance: openingNum,
                            used: nextUsed,
                            pending_approval: nextPending,
                            closing_balance: actualRemaining,
                            last_updated: new Date(),
                            ...(resolvedCompanyId ? { company_id: resolvedCompanyId } : {})
                        }
                    },
                    { new: true, runValidators: true }
                );
            }
        }

        if (!balanceRecord) {
            // Fallback: standard upsert by (employee_id + leave_policy_id + year)
            balanceRecord = await LeaveBalance.findOneAndUpdate(
                {
                    employee_id: employee_id,
                    leave_policy_id: leave_policy_id,
                    year: currentYear
                },
                {
                    $set: {
                        employee_id: employee_id,
                        leave_policy_id: leave_policy_id,
                        leave_type: policy.leave_type,
                        year: currentYear,
                        opening_balance: openingNum,
                        used: nextUsed,
                        pending_approval: nextPending,
                        closing_balance: actualRemaining,
                        last_updated: new Date(),
                        ...(resolvedCompanyId ? { company_id: resolvedCompanyId } : {})
                    }
                },
                {
                    new: true,
                    upsert: true,
                    runValidators: true
                }
            );
        }

        res.json({
            message: 'Leave balance updated successfully',
            data: {
                employee_id: balanceRecord.employee_id,
                leave_type: balanceRecord.leave_type,
                opening_balance: balanceRecord.opening_balance,
                used: balanceRecord.used,
                pending: isRabsUser ? Math.max(0, balanceRecord.opening_balance - balanceRecord.used) : balanceRecord.pending_approval,
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
        const { employee_ids, year, startDate, endDate } = req.query;

        if (!employee_ids) {
            return res.status(400).json({ message: 'employee_ids parameter is required' });
        }

        // Parse comma-separated IDs into strings and ObjectIds
        const idArray = String(employee_ids)
            .split(',')
            .map(id => id.trim())
            .filter(id => id && mongoose.Types.ObjectId.isValid(id));

        if (idArray.length === 0) {
            return res.status(400).json({ message: 'No valid employee IDs provided' });
        }

        const objIdArray = idArray.map(id => new mongoose.Types.ObjectId(id));

        const refDate = startDate ? moment(startDate).tz('Asia/Kolkata') : moment().tz('Asia/Kolkata');
        const currentYear = Number(year) || refDate.year();
        const yearStart = moment(refDate).startOf('year').toDate();
        const periodStart = moment(refDate).startOf('day').toDate();
        const yearStartStr = moment(refDate).startOf('year').format('YYYY-MM-DD');
        const periodStartStr = moment(refDate).startOf('day').format('YYYY-MM-DD');

        // 1. Fetch all existing leave balances for the employees
        const existingBalances = await LeaveBalance.find({
            employee_id: { $in: objIdArray }
        }).lean();

        const balanceMap = new Map();
        const foundEmpIds = new Set();

        existingBalances.forEach(b => {
            const empIdStr = b.employee_id.toString();
            const ltStr = String(b.leave_type || '').toLowerCase();
            if (b.year === currentYear || !balanceMap.has(`${empIdStr}_${ltStr}`)) {
                balanceMap.set(`${empIdStr}_${ltStr}`, b);
                foundEmpIds.add(empIdStr);
            }
        });

        // 2. Resolve missing employees from User / Company policies
        const missingEmpIds = objIdArray.filter(id => !foundEmpIds.has(id.toString()));
        if (missingEmpIds.length > 0) {
            const missingUsers = await UserModel.find({ _id: { $in: missingEmpIds } })
                .select('_id company_id leave_policy_id username')
                .lean();

            const companyIds = missingUsers.map(u => u.company_id).filter(Boolean);
            const companies = await Company.find({ _id: { $in: companyIds } }).lean();
            const companyMap = new Map(companies.map(c => [c._id.toString(), c]));

            const allPolicyIds = [];
            companies.forEach(c => {
                if (Array.isArray(c.leave_policies)) allPolicyIds.push(...c.leave_policies);
            });
            missingUsers.forEach(u => {
                if (u.leave_policy_id) allPolicyIds.push(u.leave_policy_id);
            });

            const policies = await LeavePolicy.find({
                $or: [
                    { _id: { $in: allPolicyIds } },
                    { company_id: { $in: companyIds } }
                ]
            }).lean();

            for (const user of missingUsers) {
                const userCompany = user.company_id ? companyMap.get(user.company_id.toString()) : null;
                let userPolicies = [];
                if (userCompany && Array.isArray(userCompany.leave_policies) && userCompany.leave_policies.length > 0) {
                    const compPolIds = new Set(userCompany.leave_policies.map(p => p.toString()));
                    userPolicies = policies.filter(p => compPolIds.has(p._id.toString()));
                }
                if (userPolicies.length === 0 && user.company_id) {
                    userPolicies = policies.filter(p => p.company_id && p.company_id.toString() === user.company_id.toString());
                }
                if (userPolicies.length === 0 && policies.length > 0) {
                    userPolicies = policies;
                }

                userPolicies.forEach(p => {
                    const ltStr = String(p.leave_type || '').toLowerCase();
                    const quota = Number(p.annual_quota || 0);
                    const mockBalance = {
                        employee_id: user._id,
                        leave_policy_id: p._id,
                        leave_type: p.leave_type,
                        opening_balance: quota,
                        used: 0,
                        pending_approval: 0,
                        closing_balance: quota,
                        year: currentYear
                    };
                    balanceMap.set(`${user._id.toString()}_${ltStr}`, mockBalance);
                });
            }
        }

        // 3. Compute leaves taken prior to startDate in current year to derive exact current period opening (Last Month Closing)
        const isPrivilegeType = (type = '') => {
            const t = String(type || '').toLowerCase();
            return t.includes('privilege') || t.includes('earned') || t === 'pl' || t === 'el' || t.includes('casual') || t.includes('paid') || t === 'cl';
        };

        const periodEnd = endDate ? moment(endDate).tz('Asia/Kolkata').endOf('day').toDate() : moment(refDate).endOf('month').toDate();
        const periodEndStr = endDate ? moment(endDate).tz('Asia/Kolkata').format('YYYY-MM-DD') : moment(refDate).endOf('month').format('YYYY-MM-DD');

        const priorLeavesMap = new Map();
        const periodLeavesMap = new Map();

        if (moment(periodStart).isAfter(yearStart)) {
            // A. Query LeaveApplication for prior period
            const priorLeaves = await LeaveApplication.find({
                employee_id: { $in: objIdArray },
                approval_status: { $in: ['approved', 'pending', 'pending_hod', 'pending_shalini', 'pending_final', 'hod_approved_pending_admin', 'in_review'] },
                $or: [
                    { from_date: { $gte: yearStart, $lt: periodStart } },
                    { from_date_str: { $gte: yearStartStr, $lt: periodStartStr } },
                    { to_date: { $gte: yearStart, $lt: periodStart } },
                    { to_date_str: { $gte: yearStartStr, $lt: periodStartStr } }
                ]
            }).lean();

            for (const app of priorLeaves) {
                const empIdStr = app.employee_id.toString();
                const ltStr = String(app.leave_type || '').toLowerCase();

                if (ltStr.includes('lwp') || ltStr.includes('without pay') || ltStr === 'lop' || ltStr.includes('unpaid')) {
                    continue;
                }

                const days = Number(app.total_days || (app.is_half_day ? 0.5 : 1));
                if (isPrivilegeType(ltStr)) {
                    const prev = priorLeavesMap.get(`${empIdStr}_privilege`) || 0;
                    const updated = prev + days;
                    priorLeavesMap.set(`${empIdStr}_privilege`, updated);
                    priorLeavesMap.set(`${empIdStr}_pl`, updated);
                } else {
                    const key = `${empIdStr}_${ltStr}`;
                    priorLeavesMap.set(key, (priorLeavesMap.get(key) || 0) + days);
                }
            }

            // B. Also query AttendanceRecord for any daily leave records in prior period (excluding days worked as present)
            const priorAttendanceLeaves = await AttendanceRecord.find({
                employee_id: { $in: objIdArray },
                $and: [
                    {
                        $or: [
                            { attendance_date: { $gte: yearStart, $lt: periodStart } },
                            { attendance_date_str: { $gte: yearStartStr, $lt: periodStartStr } }
                        ]
                    },
                    {
                        $or: [
                            { status: 'leave' },
                            { status: 'half_day', is_half_day: true },
                            { is_on_leave: true, status: { $nin: ['present', 'late', 'weekly_off', 'holiday'] } }
                        ]
                    }
                ]
            }).lean();

            // Track leave days per employee and avoid double counting with LeaveApplication
            const attDaysByEmp = new Map();
            for (const rec of priorAttendanceLeaves) {
                // If the employee actually worked >= 8 hours, it is not an unworked leave
                const wh = Number(rec.total_work_hours || 0);
                if (wh >= 8 && ['present', 'late'].includes(String(rec.status || '').toLowerCase())) {
                    continue;
                }

                const empIdStr = rec.employee_id.toString();
                const dayVal = rec.is_half_day ? 0.5 : 1.0;
                attDaysByEmp.set(empIdStr, (attDaysByEmp.get(empIdStr) || 0) + dayVal);
            }

            for (const [empIdStr, attDays] of attDaysByEmp.entries()) {
                const existingPl = priorLeavesMap.get(`${empIdStr}_privilege`) || priorLeavesMap.get(`${empIdStr}_pl`) || 0;
                if (attDays > existingPl) {
                    priorLeavesMap.set(`${empIdStr}_privilege`, attDays);
                    priorLeavesMap.set(`${empIdStr}_pl`, attDays);
                }
            }
        }

        // 4. Compute leaves taken within the requested period [periodStart, periodEnd]
        if (startDate) {
            const currentPeriodLeaves = await LeaveApplication.find({
                employee_id: { $in: objIdArray },
                approval_status: { $in: ['approved', 'pending', 'pending_hod', 'pending_shalini', 'pending_final', 'hod_approved_pending_admin', 'in_review'] },
                $or: [
                    { from_date: { $gte: periodStart, $lte: periodEnd } },
                    { from_date_str: { $gte: periodStartStr, $lte: periodEndStr } },
                    { to_date: { $gte: periodStart, $lte: periodEnd } },
                    { to_date_str: { $gte: periodStartStr, $lte: periodEndStr } }
                ]
            }).lean();

            for (const app of currentPeriodLeaves) {
                const empIdStr = app.employee_id.toString();
                const ltStr = String(app.leave_type || '').toLowerCase();

                if (ltStr.includes('lwp') || ltStr.includes('without pay') || ltStr === 'lop' || ltStr.includes('unpaid')) {
                    continue;
                }

                const days = Number(app.total_days || (app.is_half_day ? 0.5 : 1));
                if (isPrivilegeType(ltStr)) {
                    const prev = periodLeavesMap.get(`${empIdStr}_privilege`) || 0;
                    const updated = prev + days;
                    periodLeavesMap.set(`${empIdStr}_privilege`, updated);
                    periodLeavesMap.set(`${empIdStr}_pl`, updated);
                } else {
                    const key = `${empIdStr}_${ltStr}`;
                    periodLeavesMap.set(key, (periodLeavesMap.get(key) || 0) + days);
                }
            }

            const currentAttendanceLeaves = await AttendanceRecord.find({
                employee_id: { $in: objIdArray },
                $and: [
                    {
                        $or: [
                            { attendance_date: { $gte: periodStart, $lte: periodEnd } },
                            { attendance_date_str: { $gte: periodStartStr, $lte: periodEndStr } }
                        ]
                    },
                    {
                        $or: [
                            { status: 'leave' },
                            { status: 'half_day', is_half_day: true },
                            { is_on_leave: true, status: { $nin: ['present', 'late', 'weekly_off', 'holiday'] } }
                        ]
                    }
                ]
            }).lean();

            const curAttDaysByEmp = new Map();
            for (const rec of currentAttendanceLeaves) {
                const wh = Number(rec.total_work_hours || 0);
                if (wh >= 8 && ['present', 'late'].includes(String(rec.status || '').toLowerCase())) {
                    continue;
                }

                const empIdStr = rec.employee_id.toString();
                const dayVal = rec.is_half_day ? 0.5 : 1.0;
                curAttDaysByEmp.set(empIdStr, (curAttDaysByEmp.get(empIdStr) || 0) + dayVal);
            }

            for (const [empIdStr, attDays] of curAttDaysByEmp.entries()) {
                const existingPl = periodLeavesMap.get(`${empIdStr}_privilege`) || periodLeavesMap.get(`${empIdStr}_pl`) || 0;
                if (attDays > existingPl) {
                    periodLeavesMap.set(`${empIdStr}_privilege`, attDays);
                    periodLeavesMap.set(`${empIdStr}_pl`, attDays);
                }
            }
        }

        const formattedData = Array.from(balanceMap.values()).map(balance => {
            const empIdStr = balance.employee_id.toString();
            const ltStr = String(balance.leave_type || '').toLowerCase();
            const annualOpening = Number(balance.opening_balance || 0);
            
            let priorLeaves = 0;
            let periodUsed = 0;
            if (isPrivilegeType(ltStr)) {
                priorLeaves = priorLeavesMap.get(`${empIdStr}_privilege`) || priorLeavesMap.get(`${empIdStr}_pl`) || 0;
                periodUsed = startDate
                    ? (periodLeavesMap.get(`${empIdStr}_privilege`) || periodLeavesMap.get(`${empIdStr}_pl`) || 0)
                    : Number(balance.used || 0);
            } else {
                priorLeaves = priorLeavesMap.get(`${empIdStr}_${ltStr}`) || 0;
                periodUsed = startDate
                    ? (periodLeavesMap.get(`${empIdStr}_${ltStr}`) || 0)
                    : Number(balance.used || 0);
            }

            // Period Opening = Annual Quota minus leaves taken till the start of this month
            const periodOpening = Math.max(0, annualOpening - priorLeaves);
            const periodClosing = Math.max(0, periodOpening - periodUsed);

            return {
                employee_id: empIdStr,
                leave_policy_id: balance.leave_policy_id?.toString(),
                leave_type: balance.leave_type,
                annual_opening_balance: annualOpening,
                prior_leaves_taken: priorLeaves,
                opening_balance: periodOpening,
                used: periodUsed,
                pending_approval: balance.pending_approval || 0,
                closing_balance: periodClosing,
                year: balance.year
            };
        });

        res.json({
            success: true,
            data: formattedData
        });
    } catch (err) {
        console.error('Error in getBalancesBulk:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const normalizeLeaveRangeToTimezone = ({ fromDate, toDate, isHalfDay, tz = 'Asia/Kolkata' }) => {
    const start = moment.tz(fromDate, 'YYYY-MM-DD', tz).startOf('day');
    const endSource = isHalfDay ? fromDate : toDate;
    const end = moment.tz(endSource, 'YYYY-MM-DD', tz).endOf('day');
    return { start, end };
};
